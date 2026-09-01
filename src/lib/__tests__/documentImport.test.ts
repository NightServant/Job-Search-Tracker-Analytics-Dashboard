import { describe, it, expect } from 'vitest'
import {
  importDocument,
  textToWordContent,
  titleFromFilename,
  UnsupportedDocumentError,
} from '../documentImport'

const file = (name: string, body: string) =>
  new File([body], name, { type: 'text/plain' })

describe('titleFromFilename', () => {
  it('uses the filename, which beats "Untitled" every time', () => {
    expect(titleFromFilename('Gabe Cervantes - CV (ATS) v5.tex')).toBe('Gabe Cervantes - CV (ATS) v5')
    expect(titleFromFilename('/Users/gabe/Documents/resume.md')).toBe('resume')
  })

  it('falls back rather than producing an empty title', () => {
    expect(titleFromFilename('.txt')).toBe('Imported CV')
  })
})

describe('textToWordContent', () => {
  it('splits on blank lines and keeps single newlines as breaks', () => {
    // A single newline inside a block is a line break: address lines and
    // "Title | Company" pairs depend on it, and turning them into separate
    // paragraphs would double the spacing through the whole CV.
    const doc = textToWordContent('Gabe Cervantes\n(000) 000-0000\n\nSummary text.') as {
      content: Array<{ type: string; content?: Array<{ type: string }> }>
    }
    expect(doc.content).toHaveLength(2)
    expect(doc.content[0].content!.map((n) => n.type)).toEqual([
      'text',
      'hardBreak',
      'text',
    ])
  })

  it('maps markdown headings, and only headings', () => {
    // A half-applied markdown parser renders some syntax and leaves the rest
    // as literal asterisks, which is worse than leaving all of it as text.
    const doc = textToWordContent('# Experience\n\n**bold** stays literal') as {
      content: Array<{ type: string; attrs?: { level: number }; content?: Array<{ text?: string }> }>
    }
    expect(doc.content[0].type).toBe('heading')
    expect(doc.content[0].attrs!.level).toBe(1)
    expect(doc.content[1].content![0].text).toBe('**bold** stays literal')
  })

  it('never produces a doc with no content', () => {
    // tiptap throws on an empty doc, and an empty file is a real thing a
    // person can pick.
    const doc = textToWordContent('   \n\n  ') as { content: unknown[] }
    expect(doc.content).toHaveLength(1)
  })
})

describe('importDocument', () => {
  it('opens a .tex in the LaTeX editor with its source intact', async () => {
    const source = '\\documentclass{article}\n\\begin{document}Hi\\end{document}'
    const draft = await importDocument(file('cv.tex', source))
    expect(draft.mode).toBe('latex')
    expect(draft.content).toEqual({ type: 'latex', source })
    expect(draft.title).toBe('cv')
  })

  it('opens text and markdown in the Word editor', async () => {
    expect((await importDocument(file('cv.txt', 'hello'))).mode).toBe('word')
    expect((await importDocument(file('cv.md', '# hi'))).mode).toBe('word')
  })

  it('decides mode by extension, not by sniffing the body', async () => {
    // A plain CV that happens to contain a backslash is not LaTeX.
    const draft = await importDocument(file('cv.txt', '\\documentclass{article}'))
    expect(draft.mode).toBe('word')
  })

  it('rejects .docx with a reason instead of importing an empty document', async () => {
    // A .docx is a ZIP of XML. Accepting it and producing nothing would be a
    // button that appears to work and does not.
    await expect(importDocument(file('cv.docx', 'PK\u0003\u0004binary'))).rejects.toBeInstanceOf(
      UnsupportedDocumentError
    )
    await expect(importDocument(file('cv.docx', ''))).rejects.toThrow(/\.txt or \.md/)
  })

  it('rejects an extension it was never offered', async () => {
    await expect(importDocument(file('cv.pdf', 'x'))).rejects.toBeInstanceOf(
      UnsupportedDocumentError
    )
  })
})
