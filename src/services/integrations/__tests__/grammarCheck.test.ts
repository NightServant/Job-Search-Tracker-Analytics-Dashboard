import { describe, it, expect, vi } from 'vitest'
import { checkGrammar } from '../grammarCheck'
import { capabilitiesOf, type IntegrationConfig } from '../config'

function configWith(apiKey?: string): IntegrationConfig {
  return {
    formatex: { baseUrl: 'https://formatex.test/api/v1' },
    tailoring: { model: '' },
    esco: { baseUrl: 'https://esco.test/api', enabled: true },
    grammar: { baseUrl: 'https://grammar.test/v1/check', apiKey },
  }
}

function respondWith(body: unknown, status = 200) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  ) as unknown as typeof fetch
}

const EDIT = { start: 5, end: 7, replace: 'is', err_cat: 'GRMR' }

describe('the grammar capability', () => {
  it('is off with no key and on with one', () => {
    expect(capabilitiesOf(configWith()).checkGrammar).toBe(false)
    expect(capabilitiesOf(configWith('k')).checkGrammar).toBe(true)
  })
})

describe('checkGrammar', () => {
  it('says so when no key is configured, without calling out', async () => {
    const fetchImpl = respondWith({})
    const result = await checkGrammar('This be the best', {
      config: configWith(),
      fetchImpl,
    })
    expect(result).toMatchObject({ ok: false, reason: 'unconfigured' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('sends the key in the body, which is what the vendor requires', async () => {
    const fetchImpl = respondWith({ edits: [EDIT] })
    await checkGrammar('This be the best', { config: configWith('secret-key'), fetchImpl })

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://grammar.test/v1/check')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      text: 'This be the best',
      api_key: 'secret-key',
    })
  })

  it('splits one response into the two editor tabs', async () => {
    const fetchImpl = respondWith({
      edits: [
        { start: 5, end: 7, replace: 'is', err_cat: 'GRMR' },
        { start: 1, end: 3, replace: 'calendar', err_cat: 'SPELL' },
      ],
    })
    const result = await checkGrammar('some text', { config: configWith('k'), fetchImpl })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.grammar).toHaveLength(1)
    expect(result.spelling).toHaveLength(1)
    expect(result.spelling[0].replace).toBe('calendar')
  })

  it('treats an empty document as no problems, not as an error', async () => {
    const fetchImpl = respondWith({})
    const result = await checkGrammar('', { config: configWith('k'), fetchImpl })
    expect(result).toEqual({ ok: true, issues: [], spelling: [], grammar: [] })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('splits a long document and keeps offsets document-absolute', async () => {
    // The second chunk's edits come back chunk-relative. If the offset is not
    // added, corrections land near the top of the CV instead of where the
    // error is -- the failure this whole chunking path has to avoid.
    const text = 'word '.repeat(2000) // 10,000 chars -> 2+ chunks
    const fetchImpl = respondWith({ edits: [{ start: 0, end: 4, replace: 'x', err_cat: 'GRMR' }] })
    const result = await checkGrammar(text, { config: configWith('k'), fetchImpl })

    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(1)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // One issue per chunk, and they cannot all be at position 0.
    expect(new Set(result.issues.map((i) => i.start)).size).toBe(result.issues.length)
    expect(result.issues.some((i) => i.start > 0)).toBe(true)
  })

  it.each([
    [401, 'auth'],
    [403, 'auth'],
    [429, 'rate-limit'],
    [500, 'network'],
  ])('maps HTTP %i to reason %s', async (status, reason) => {
    const fetchImpl = respondWith({}, status)
    const result = await checkGrammar('text', { config: configWith('k'), fetchImpl })
    expect(result).toMatchObject({ ok: false, reason })
  })

  it('reports a thrown fetch as a network failure rather than throwing', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    const result = await checkGrammar('text', { config: configWith('k'), fetchImpl })
    expect(result).toMatchObject({ ok: false, reason: 'network' })
  })

  it('reports malformed JSON distinctly from a network failure', async () => {
    const fetchImpl = vi.fn(async () => new Response('not json', { status: 200 })) as unknown as typeof fetch
    const result = await checkGrammar('text', { config: configWith('k'), fetchImpl })
    expect(result).toMatchObject({ ok: false, reason: 'bad-response' })
  })

  it('fails the whole check when one chunk fails', async () => {
    // Partial results are worse than none here: "3 problems" over a document
    // with more would read as a clean bill of health for the rest.
    let call = 0
    const fetchImpl = vi.fn(async () => {
      call += 1
      return call === 1
        ? new Response(JSON.stringify({ edits: [EDIT] }), { status: 200 })
        : new Response('{}', { status: 500 })
    }) as unknown as typeof fetch

    const result = await checkGrammar('word '.repeat(2000), {
      config: configWith('k'),
      fetchImpl,
    })
    expect(result.ok).toBe(false)
  })
})
