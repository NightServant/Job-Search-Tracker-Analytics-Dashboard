import { describe, it, expect, vi } from 'vitest'
import {
  synonymsFromResponse,
  fetchEscoSynonyms,
  buildSynonymIndex,
  type EscoSearchResponse,
} from '../esco'
import FIXTURES from './fixtures/esco.json'

/**
 * The fixtures are REAL responses, captured from
 * `ec.europa.eu/esco/api/search` on 2026-09-04 and trimmed to the two fields
 * this client reads. They are checked in deliberately: the whole design of
 * esco.ts is a reaction to what ESCO actually returns for three specific
 * queries, and a hand-written fixture would let me test the taxonomy I
 * imagined instead of the one that exists.
 */
const RESPONSES = FIXTURES as unknown as Record<string, EscoSearchResponse>

describe('the ESCO exact-title guard', () => {
  it('takes synonyms when the title IS the term', () => {
    // "javascript" -> title "JavaScript". This is the case the integration
    // exists for: six alternative labels a CV might plausibly use.
    // The labels asserted here are the ones ESCO actually returns, not the
    // ones I assumed it would. The first draft of this test expected
    // "ecmascript" -- a plausible synonym that is simply not in the taxonomy --
    // and the fixture caught it, which is the argument for checking a real
    // capture in rather than writing one by hand.
    const synonyms = synonymsFromResponse('javascript', RESPONSES.javascript)
    expect(synonyms.length).toBeGreaterThan(0)
    expect(synonyms).toContain('escript')
    expect(synonyms).toContain('server-side javascript')
  })

  it('REFUSES the wrong sense of an ambiguous word', () => {
    // THE TRAP THIS FILE EXISTS FOR. ESCO's top three hits for "react" are
    // "react to emergency situations in a live performance environment",
    // "react acordingly to unexpected events outdoors" and "react calmly in
    // stressful situations" -- 93 results, none of them the library.
    //
    // Without the guard, a CV saying "react calmly in stressful situations"
    // would score as satisfying a React requirement. That is worse than
    // having no synonyms, because it inflates a number the user is trusting.
    expect(RESPONSES.react.total).toBeGreaterThan(90)
    expect(synonymsFromResponse('react', RESPONSES.react)).toEqual([])
  })

  it('returns nothing for a term the taxonomy does not contain', () => {
    // ESCO is an occupational taxonomy, not a technology index: Kubernetes
    // and Docker are both simply absent. Silence is the correct answer.
    expect(RESPONSES.kubernetes.total).toBe(0)
    expect(synonymsFromResponse('kubernetes', RESPONSES.kubernetes)).toEqual([])
  })

  it('matches the title case-insensitively, since postings are not title-cased', () => {
    expect(synonymsFromResponse('JAVASCRIPT', RESPONSES.javascript).length).toBeGreaterThan(0)
    expect(synonymsFromResponse('  javascript  ', RESPONSES.javascript).length).toBeGreaterThan(0)
  })

  it('never returns the term itself, or a duplicate', () => {
    // A synonym identical to the term teaches the matcher nothing, and a
    // repeat would weight one term twice in the score.
    const synonyms = synonymsFromResponse('javascript', RESPONSES.javascript)
    expect(synonyms).not.toContain('javascript')
    expect(new Set(synonyms).size).toBe(synonyms.length)
  })

  it('survives a response with no results block at all', () => {
    expect(synonymsFromResponse('anything', {})).toEqual([])
    expect(synonymsFromResponse('', RESPONSES.javascript)).toEqual([])
  })
})

describe('the ESCO client, as a thing on the request path', () => {
  const baseUrl = 'https://esco.test/api'

  it('asks for exactly one skill search, with the term and English', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => RESPONSES.javascript,
    }) as unknown as typeof fetch

    await fetchEscoSynonyms('javascript', { baseUrl, fetchImpl })

    const url = new URL((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(url.pathname).toBe('/api/search')
    expect(url.searchParams.get('text')).toBe('javascript')
    expect(url.searchParams.get('language')).toBe('en')
    expect(url.searchParams.get('type')).toBe('skill')
  })

  it('degrades to no synonyms when the taxonomy fails, rather than throwing', async () => {
    // This runs on a scoring path that already works without it. A free
    // public service being slow, rate-limited or down must cost a point of
    // recall, never the user's request.
    for (const failure of [
      { ok: false, status: 503, json: async () => ({}) },
      Promise.reject(new Error('network')),
    ]) {
      const fetchImpl = vi
        .fn()
        .mockImplementation(() =>
          failure instanceof Promise ? failure : Promise.resolve(failure)
        ) as unknown as typeof fetch
      await expect(fetchEscoSynonyms('javascript', { baseUrl, fetchImpl })).resolves.toEqual([])
    }
  })

  it('gives up rather than hanging', async () => {
    // Asserted by observing the abort signal, not by waiting out a timeout --
    // a test that sleeps for the real duration is a test nobody runs twice.
    const fetchImpl = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })
    }) as unknown as typeof fetch

    await expect(
      fetchEscoSynonyms('javascript', { baseUrl, fetchImpl, timeoutMs: 5 })
    ).resolves.toEqual([])
  })

  it('caps concurrency, so a long posting cannot flood a public service', async () => {
    // Firing thirty parallel requests at a free API run by the European
    // Commission is how an integration gets an IP blocked.
    let inFlight = 0
    let peak = 0
    const fetchImpl = vi.fn().mockImplementation(async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 1))
      inFlight -= 1
      return { ok: true, json: async () => RESPONSES.kubernetes }
    }) as unknown as typeof fetch

    const terms = Array.from({ length: 30 }, (_, i) => `term-${i}`)
    await buildSynonymIndex(terms, { baseUrl, fetchImpl, concurrency: 6 })
    expect(peak).toBeLessThanOrEqual(6)
    expect(fetchImpl).toHaveBeenCalledTimes(30)
  })

  it('indexes only the terms that produced synonyms', async () => {
    const fetchImpl = vi.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () =>
        new URL(url).searchParams.get('text') === 'javascript'
          ? RESPONSES.javascript
          : RESPONSES.kubernetes,
    })) as unknown as typeof fetch

    const index = await buildSynonymIndex(['javascript', 'kubernetes'], { baseUrl, fetchImpl })
    expect(index.has('javascript')).toBe(true)
    // An empty entry would make the matcher iterate a list that says nothing.
    expect(index.has('kubernetes')).toBe(false)
  })

  it('deduplicates the term list before it hits the network', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => RESPONSES.kubernetes,
    }) as unknown as typeof fetch

    await buildSynonymIndex(['React', 'react', 'REACT', ''], { baseUrl, fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
