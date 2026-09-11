import { describe, it, expect } from 'vitest'
import {
  MAX_CHUNK_CHARS,
  applyIssue,
  categoryOf,
  chunkText,
  splitByCategory,
  toIssues,
} from '../grammar'

/** The live shape, abbreviated: offset/length, an array of replacements. */
const match = (
  offset: number,
  length: number,
  replacements: string[],
  issueType = 'grammar',
  categoryId = 'GRAMMAR'
) => ({
  offset,
  length,
  shortMessage: 'Problem',
  replacements: replacements.map((value) => ({ value })),
  rule: { issueType, category: { id: categoryId } },
})

describe('chunkText', () => {
  it('leaves text the API already accepts in one piece', () => {
    expect(chunkText('a short CV')).toEqual([{ text: 'a short CV', offset: 0 }])
  })

  it('returns nothing for nothing, rather than one empty request', () => {
    expect(chunkText('')).toEqual([])
  })

  it('never exceeds the vendor ceiling', () => {
    // Deliberately past MAX_CHUNK_CHARS rather than a fixed number, so raising
    // the cap (5,000 under GrammarBot, 20,000 here) does not quietly stop this
    // test exercising the split at all.
    const text = 'word '.repeat(MAX_CHUNK_CHARS)
    const chunks = chunkText(text)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS)
    }
  })

  it('reassembles into exactly the original text', () => {
    // THE INVARIANT THAT MATTERS. If chunking drops or duplicates a character,
    // every offset after that point is wrong and corrections land on the wrong
    // words -- which looks like a bad checker rather than a bad splitter.
    const text = 'Sentence one. Sentence two.\n\n' + 'filler words here. '.repeat(600)
    // An explicit window, so this asserts the reassembly invariant rather than
    // the vendor's current limit.
    const chunks = chunkText(text, 1000)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.map((c) => c.text).join('')).toBe(text)
  })

  it('reports an offset that indexes the original text', () => {
    const text = 'x'.repeat(120) + ' ' + 'y'.repeat(120)
    const chunks = chunkText(text, 100)
    for (const chunk of chunks) {
      expect(text.slice(chunk.offset, chunk.offset + chunk.text.length)).toBe(chunk.text)
    }
  })

  it('prefers a paragraph break to a mid-sentence cut', () => {
    const head = 'a'.repeat(85)
    const text = `${head}\n\ntail text here`
    const [first] = chunkText(text, 100)
    expect(first.text).toBe(`${head}\n\n`)
  })

  it('splits mid-word only when one word fills the whole window', () => {
    // A pasted base64 blob has no boundary to find; refusing to split would
    // mean never sending it at all.
    const blob = 'Z'.repeat(250)
    const chunks = chunkText(blob, 100)
    expect(chunks.map((c) => c.text).join('')).toBe(blob)
    expect(chunks[0].text.length).toBe(100)
  })

  it('refuses a nonsense window instead of looping forever', () => {
    expect(() => chunkText('abc', 0)).toThrow(RangeError)
  })
})

describe('categoryOf', () => {
  it('routes misspellings to the spelling tab', () => {
    expect(categoryOf('misspelling', 'TYPOS')).toBe('spelling')
    expect(categoryOf('typographical', 'TYPOS')).toBe('spelling')
    expect(categoryOf(undefined, 'TYPOS')).toBe('spelling')
  })

  it('routes style and redundancy to the refinements tab', () => {
    expect(categoryOf('style', 'STYLE')).toBe('style')
    expect(categoryOf('style', 'REDUNDANCY')).toBe('style')
    expect(categoryOf(undefined, 'REDUNDANCY')).toBe('style')
  })

  it('does not confuse a typographical WORD with the TYPOGRAPHY category', () => {
    // `issueType: typographical` is a mis-typed word and belongs with
    // spelling; the TYPOGRAPHY category is punctuation and spacing, which is
    // style. They read alike and mean opposite things.
    expect(categoryOf('typographical', 'TYPOS')).toBe('spelling')
    expect(categoryOf(undefined, 'TYPOGRAPHY')).toBe('style')
  })

  it('treats grammar, and anything unknown, as grammar', () => {
    // Deliberately one-sided: an unrecognised rule must still reach a tab.
    // Losing an issue is worse than filing it under the wrong heading.
    for (const [type, id] of [
      ['grammar', 'GRAMMAR'],
      ['whatever-is-new', 'SOMETHING_NEW'],
      [undefined, undefined],
    ] as const) {
      expect(categoryOf(type, id), `${type}/${id}`).toBe('grammar')
    }
  })
})

describe('toIssues', () => {
  it('converts offset/length into start/end', () => {
    // The vendor changed shape when GrammarBot was replaced. This conversion
    // happens once, here, so nothing downstream holds two conventions.
    expect(toIssues({ matches: [match(5, 2, ['is'])] })[0]).toMatchObject({
      start: 5,
      end: 7,
      replacements: ['is'],
      category: 'grammar',
    })
  })

  it('keeps every replacement, which is what the suggestion list needs', () => {
    const [issue] = toIssues({ matches: [match(40, 3, ['the', 'ten', 'tea', 'tech'], 'misspelling', 'TYPOS')] })
    expect(issue.replacements).toEqual(['the', 'ten', 'tea', 'tech'])
    expect(issue.category).toBe('spelling')
  })

  it('caps the replacement list so a rail is not flooded', () => {
    const many = Array.from({ length: 20 }, (_, i) => `option${i}`)
    expect(toIssues({ matches: [match(0, 1, many)] })[0].replacements).toHaveLength(5)
  })

  it('shifts offsets by the chunk they came from', () => {
    // Chunk matches are chunk-relative; the document is what gets
    // highlighted. Forgetting this is the bug class chunking introduces.
    const [issue] = toIssues({ matches: [match(5, 2, ['is'])] }, 1000)
    expect(issue.start).toBe(1005)
    expect(issue.end).toBe(1007)
  })

  it('prefers shortMessage, falling back to the long one', () => {
    const long = { offset: 0, length: 1, message: 'A long explanation.', replacements: [] }
    expect(toIssues({ matches: [long] })[0].message).toBe('A long explanation.')
  })

  it('survives a response with no matches at all', () => {
    expect(toIssues({})).toEqual([])
    expect(toIssues({ matches: [] })).toEqual([])
  })

  it('drops a match whose range is impossible', () => {
    const bad = {
      matches: [
        { offset: -1, length: 2, replacements: [] },
        { offset: 0, length: -5, replacements: [] },
        match(0, 1, ['z']),
      ],
    }
    expect(toIssues(bad)).toHaveLength(1)
  })

  it('keeps a match that proposes nothing, which is still worth showing', () => {
    const [issue] = toIssues({ matches: [match(3, 4, [])] })
    expect(issue.replacements).toEqual([])
  })
})

describe('splitByCategory', () => {
  it('separates the three tabs and orders each by position', () => {
    const issues = toIssues({
      matches: [
        match(30, 2, ['a'], 'misspelling', 'TYPOS'),
        match(10, 2, ['b']),
        match(5, 2, ['c'], 'misspelling', 'TYPOS'),
        match(20, 2, ['d'], 'style', 'REDUNDANCY'),
      ],
    })
    const { spelling, grammar, style } = splitByCategory(issues)
    expect(spelling.map((i) => i.start)).toEqual([5, 30])
    expect(grammar.map((i) => i.start)).toEqual([10])
    expect(style.map((i) => i.start)).toEqual([20])
  })

  it('does not mutate the list it was given', () => {
    const issues = toIssues({ matches: [match(9, 1, []), match(1, 1, [])] })
    splitByCategory(issues)
    expect(issues.map((i) => i.start)).toEqual([9, 1])
  })
})

describe('applyIssue', () => {
  const text = 'This be the best'

  it('replaces exactly the flagged range with the chosen option', () => {
    const [issue] = toIssues({ matches: [match(5, 2, ['is', 'was'])] })
    expect(applyIssue(text, issue, 'is')).toBe('This is the best')
    // The SECOND suggestion, because the card lets you pick one.
    expect(applyIssue(text, issue, 'was')).toBe('This was the best')
  })

  it('deletes when the replacement is empty', () => {
    const [issue] = toIssues({ matches: [match(4, 3, [''])] })
    expect(applyIssue(text, issue, '')).toBe('This the best')
  })

  it('leaves the text alone when the issue does not fit it', () => {
    // A stale issue -- one produced before an earlier accept moved everything
    // after it -- must not be allowed to slice at a bad index.
    const [issue] = toIssues({ matches: [match(500, 400, ['x'])] })
    expect(applyIssue(text, issue, 'x')).toBe(text)
  })
})
