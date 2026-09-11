import { describe, it, expect } from 'vitest'
import {
  MAX_CHUNK_CHARS,
  applyIssue,
  categoryOf,
  chunkText,
  splitByCategory,
  toIssues,
} from '../grammar'

describe('chunkText', () => {
  it('leaves text the API already accepts in one piece', () => {
    expect(chunkText('a short CV')).toEqual([{ text: 'a short CV', offset: 0 }])
  })

  it('returns nothing for nothing, rather than one empty request', () => {
    expect(chunkText('')).toEqual([])
  })

  it('never exceeds the vendor ceiling', () => {
    const text = 'word '.repeat(4000) // 20,000 chars
    for (const chunk of chunkText(text)) {
      expect(chunk.text.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS)
    }
  })

  it('reassembles into exactly the original text', () => {
    // THE INVARIANT THAT MATTERS. If chunking drops or duplicates a character,
    // every offset after that point is wrong and corrections land on the wrong
    // words -- which looks like a bad checker rather than a bad splitter.
    const text = 'Sentence one. Sentence two.\n\n' + 'filler words here. '.repeat(600)
    const chunks = chunkText(text)
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
  it('routes the vendor spelling codes to the spelling tab', () => {
    for (const code of ['SPELL', 'spelling', 'Typo', 'MISSPELLING']) {
      expect(categoryOf(code), code).toBe('spelling')
    }
  })

  it('treats the documented grammar code, and anything unknown, as grammar', () => {
    // Deliberately one-sided: an unrecognised code must still reach a tab.
    // Losing an issue entirely is worse than filing it under the wrong heading.
    for (const code of ['GRMR', 'SOMETHING_NEW', '', undefined]) {
      expect(categoryOf(code), String(code)).toBe('grammar')
    }
  })
})

describe('toIssues', () => {
  const response = {
    correction: 'This is the best',
    status: 200,
    edits: [
      { start: 5, end: 7, replace: 'is', edit_type: 'MODIFY', err_cat: 'GRMR' },
    ],
  }

  it('maps the vendor shape onto our own', () => {
    expect(toIssues(response)).toEqual([
      {
        start: 5,
        end: 7,
        replace: 'is',
        category: 'grammar',
        rawCategory: 'GRMR',
        description: '',
      },
    ])
  })

  it('shifts offsets by the chunk they came from', () => {
    // The chunk's edits are chunk-relative; the document is what gets
    // highlighted. Forgetting this is the whole bug class chunking introduces.
    const [issue] = toIssues(response, 1000)
    expect(issue.start).toBe(1005)
    expect(issue.end).toBe(1007)
  })

  it('survives a response with no edits at all', () => {
    expect(toIssues({ status: 200 })).toEqual([])
    expect(toIssues({ status: 200, edits: [] })).toEqual([])
  })

  it('drops an edit whose range is impossible', () => {
    // A backwards range would highlight from the error to the end of the
    // document, which reads as the checker having flagged everything.
    const bad = {
      edits: [
        { start: 9, end: 4, replace: 'x', err_cat: 'GRMR' },
        { start: -1, end: 2, replace: 'y', err_cat: 'GRMR' },
        { start: 0, end: 1, replace: 'z', err_cat: 'GRMR' },
      ],
    }
    expect(toIssues(bad).map((i) => i.replace)).toEqual(['z'])
  })

  it('keeps a zero-width edit, which is an insertion', () => {
    const insert = { edits: [{ start: 3, end: 3, replace: ',', err_cat: 'GRMR' }] }
    expect(toIssues(insert)).toHaveLength(1)
  })
})

describe('splitByCategory', () => {
  it('separates the two tabs and orders each by position', () => {
    const issues = toIssues({
      edits: [
        { start: 30, end: 32, replace: 'a', err_cat: 'SPELL' },
        { start: 10, end: 12, replace: 'b', err_cat: 'GRMR' },
        { start: 5, end: 7, replace: 'c', err_cat: 'SPELL' },
      ],
    })
    const { spelling, grammar } = splitByCategory(issues)
    expect(spelling.map((i) => i.start)).toEqual([5, 30])
    expect(grammar.map((i) => i.start)).toEqual([10])
  })

  it('does not mutate the list it was given', () => {
    const issues = toIssues({
      edits: [
        { start: 9, end: 9, replace: 'a', err_cat: 'GRMR' },
        { start: 1, end: 1, replace: 'b', err_cat: 'GRMR' },
      ],
    })
    splitByCategory(issues)
    expect(issues.map((i) => i.start)).toEqual([9, 1])
  })
})

describe('applyIssue', () => {
  const text = 'This be the best'

  it('replaces exactly the flagged range', () => {
    const [issue] = toIssues({
      edits: [{ start: 5, end: 7, replace: 'is', err_cat: 'GRMR' }],
    })
    expect(applyIssue(text, issue)).toBe('This is the best')
  })

  it('inserts when the range is zero-width', () => {
    const [issue] = toIssues({
      edits: [{ start: 4, end: 4, replace: ' really', err_cat: 'GRMR' }],
    })
    expect(applyIssue(text, issue)).toBe('This really be the best')
  })

  it('deletes when the replacement is empty', () => {
    const [issue] = toIssues({
      edits: [{ start: 4, end: 7, replace: '', err_cat: 'GRMR' }],
    })
    expect(applyIssue(text, issue)).toBe('This the best')
  })

  it('leaves the text alone when the issue does not fit it', () => {
    // A stale issue -- one produced before an earlier accept moved everything
    // after it -- must not be allowed to slice at a bad index.
    const [issue] = toIssues({
      edits: [{ start: 500, end: 900, replace: 'x', err_cat: 'GRMR' }],
    })
    expect(applyIssue(text, issue)).toBe(text)
  })
})
