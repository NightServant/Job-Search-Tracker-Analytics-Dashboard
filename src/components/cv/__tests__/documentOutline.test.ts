import { describe, it, expect, afterEach } from 'vitest'
import { Editor } from '@tiptap/core'
import { outlineOf, paragraphCount, statsOf } from '../documentOutline'
import { WORD_EDITOR_EXTENSIONS } from '../editorExtensions'

let editor: Editor | null = null
afterEach(() => {
  editor?.destroy()
  editor = null
})
const make = (html: string) => (editor = new Editor({ content: html, extensions: WORD_EDITOR_EXTENSIONS }))

describe('outlineOf', () => {
  it('lists every heading in document order', () => {
    const e = make('<h1>Name</h1><p>x</p><h2>Summary</h2><p>y</p><h2>Skills</h2>')
    expect(outlineOf(e).map((o) => o.text)).toEqual(['Name', 'Summary', 'Skills'])
  })

  it('NORMALISES DEPTH against the shallowest heading present', () => {
    // A CV whose sections are all h2 -- the common shape, because h1 is the
    // person's name -- would otherwise indent every row with nothing at the
    // root, which reads as a broken tree.
    const e = make('<h2>Summary</h2><h2>Skills</h2><h3>Front-end</h3>')
    expect(outlineOf(e).map((o) => o.depth)).toEqual([0, 0, 1])
  })

  it('keeps absolute levels too, since depth is only for indentation', () => {
    const e = make('<h2>Summary</h2><h3>Front-end</h3>')
    expect(outlineOf(e).map((o) => o.level)).toEqual([2, 3])
  })

  it('skips an empty heading, which is what half-typed sections leave behind', () => {
    const e = make('<h2>Summary</h2><h2></h2><h2>Skills</h2>')
    expect(outlineOf(e).map((o) => o.text)).toEqual(['Summary', 'Skills'])
  })

  it('gives a position that addresses the heading in the document', () => {
    const e = make('<p>intro</p><h2>Skills</h2>')
    const [entry] = outlineOf(e)
    expect(e.state.doc.nodeAt(entry.pos)?.textContent).toBe('Skills')
  })

  it('returns nothing for a document with no headings, and for no editor', () => {
    expect(outlineOf(make('<p>just prose</p>'))).toEqual([])
    expect(outlineOf(null)).toEqual([])
  })
})

describe('statsOf', () => {
  it('counts words, characters and characters without spaces', () => {
    const s = statsOf('one two three', 1)
    expect(s.words).toBe(3)
    expect(s.characters).toBe(13)
    expect(s.charactersNoSpaces).toBe(11)
  })

  it('reports zero for an empty document rather than one page of nothing', () => {
    const s = statsOf('   ', 0)
    expect(s.words).toBe(0)
    expect(s.pages).toBe(0)
    expect(s.readingMinutes).toBe(0)
  })

  it('ROUNDS PAGES UP, because one line over is still two pages to a printer', () => {
    expect(statsOf('w '.repeat(500).trim(), 1).pages).toBe(1)
    expect(statsOf('w '.repeat(501).trim(), 1).pages).toBe(2)
  })

  it('never reports less than a minute for a document that has words', () => {
    // `Math.round(10 / 200)` is 0, and "0 min read" over real content is
    // wrong in a way that looks broken.
    expect(statsOf('w '.repeat(10).trim(), 1).readingMinutes).toBe(1)
  })
})

describe('paragraphCount', () => {
  it('counts blocks that carry text, not empty ones', () => {
    const e = make('<p>one</p><p></p><h2>two</h2><p>   </p>')
    expect(paragraphCount(e)).toBe(2)
  })

  it('is zero without an editor', () => {
    expect(paragraphCount(null)).toBe(0)
  })
})
