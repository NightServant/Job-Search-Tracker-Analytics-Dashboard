import { describe, it, expect } from 'vitest'
import { matchCase, posOf, singleWord, thesaurusUrl, toSynonyms } from '../thesaurus'

/** The real shape, from a live `ml=managed` call on 2026-09-11. */
const MANAGED = [
  { word: 'management', tags: ['syn', 'n'] },
  { word: 'direction', tags: ['syn', 'n'] },
  { word: 'accomplished', tags: ['adj'] },
  { word: 'administer', tags: ['v'] },
  { word: 'administered', tags: ['v'] },
  { word: 'directed', tags: ['v'] },
  { word: 'oversaw', tags: ['v'] },
  { word: 'supervised', tags: ['v'] },
]

describe('singleWord', () => {
  it('accepts one word and refuses a phrase', () => {
    // Datamuse answers a sentence with associations to the whole phrase, which
    // reads as nonsense beside a selection the user thinks of as "this word".
    expect(singleWord('managed')).toBe('managed')
    expect(singleWord('  Managed ')).toBe('managed')
    expect(singleWord('managed the team')).toBeNull()
  })

  it('strips surrounding punctuation, which a double-click selects', () => {
    expect(singleWord('"managed"')).toBe('managed')
    expect(singleWord('managed,')).toBe('managed')
  })

  it('refuses things that are not words', () => {
    for (const raw of ['', '   ', '42', 'a', 'to', '---', 'C++']) {
      expect(singleWord(raw), raw).toBeNull()
    }
  })

  it('keeps a hyphen and an apostrophe, which are inside real words', () => {
    expect(singleWord('well-known')).toBe('well-known')
    expect(singleWord("team's")).toBe("team's")
  })
})

describe('posOf', () => {
  it('reads the part of speech off the tags', () => {
    expect(posOf(['syn', 'v'])).toBe('verb')
    expect(posOf(['n'])).toBe('noun')
    expect(posOf(['adj'])).toBe('adjective')
    expect(posOf(undefined)).toBe('unknown')
  })
})

describe('toSynonyms', () => {
  it('KEEPS THE MATCHING PART OF SPEECH, which is the whole feature', () => {
    // `ml=managed` mixes "management" (noun) with "administered" (verb).
    // Swapping in the noun produces "I management the team".
    const out = toSynonyms(MANAGED, 'managed')
    expect(out.every((s) => s.pos === 'verb')).toBe(true)
    expect(out.map((s) => s.word)).toContain('oversaw')
    expect(out.map((s) => s.word)).not.toContain('management')
  })

  it('drops the word you already have', () => {
    const out = toSynonyms([{ word: 'managed', tags: ['v'] }, ...MANAGED], 'managed')
    expect(out.map((s) => s.word)).not.toContain('managed')
  })

  it('falls back to everything rather than showing an empty panel', () => {
    // A sparsely tagged word should still offer something.
    const sparse = [{ word: 'alpha' }, { word: 'beta' }, { word: 'gamma' }]
    expect(toSynonyms(sparse, 'x')).toHaveLength(3)
  })

  it('survives a response that is not a list', () => {
    expect(toSynonyms(undefined as never, 'x')).toEqual([])
  })

  it('caps the list, because a rail is not a dictionary', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ word: `w${i}`, tags: ['v'] }))
    expect(toSynonyms(many, 'x')).toHaveLength(8)
  })
})

describe('matchCase', () => {
  it('keeps a capitalised original capitalised', () => {
    // Datamuse always answers lower case, so without this every accepted
    // suggestion quietly lower-cases the first word of a bullet.
    expect(matchCase('Managed', 'directed')).toBe('Directed')
  })

  it('keeps an all-caps original all-caps', () => {
    expect(matchCase('MANAGED', 'directed')).toBe('DIRECTED')
  })

  it('leaves a lower-case original alone', () => {
    expect(matchCase('managed', 'directed')).toBe('directed')
  })

  it('does not shout over a single capital letter', () => {
    // "I" is upper case and one character; treating it as all-caps would be
    // indistinguishable from sentence case and is the wrong branch.
    expect(matchCase('A', 'one')).toBe('One')
  })
})

describe('thesaurusUrl', () => {
  it('asks for means-like, which is the endpoint that actually returns synonyms', () => {
    // `rel_syn=managed` returned an empty list live; `ml=` is what works.
    const url = thesaurusUrl('managed')
    expect(url).toContain('ml=managed')
    expect(url).toContain('api.datamuse.com')
  })

  it('encodes a word that needs it', () => {
    expect(thesaurusUrl("team's")).toContain('ml=team%27s')
  })
})
