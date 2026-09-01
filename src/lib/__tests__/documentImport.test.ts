import { describe, it, expect } from 'vitest'
import {
  importDocument,
  htmlToWordContent,
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

  it('rejects .doc, which is a different format mammoth does not read', async () => {
    // .doc is the pre-2007 binary format, not a .docx. Accepting it would
    // produce a button that appears to work and does not.
    await expect(importDocument(file('cv.doc', 'binary'))).rejects.toBeInstanceOf(
      UnsupportedDocumentError
    )
    await expect(importDocument(file('cv.doc', ''))).rejects.toThrow(/save it as \.docx/i)
  })

  it('rejects an extension it was never offered', async () => {
    await expect(importDocument(file('cv.pdf', 'x'))).rejects.toBeInstanceOf(
      UnsupportedDocumentError
    )
  })
})

describe('htmlToWordContent (the .docx walk)', () => {
  it('keeps Word headings as headings, which is why the style map exists', () => {
    // Word marks a heading by naming a STYLE, not by making text big. mammoth
    // reads styles; the map turns them into h1/h2 and this turns those into
    // tiptap headings.
    const doc = htmlToWordContent('<h1>Gabe Cervantes</h1><h2>Experience</h2>') as {
      content: Array<{ type: string; attrs?: { level: number } }>
    }
    expect(doc.content.map((n) => [n.type, n.attrs?.level])).toEqual([
      ['heading', 1],
      ['heading', 2],
    ])
  })

  it('flattens a table rather than dropping it', () => {
    // Word CVs are full of invisible layout tables. StarterKit has no table
    // node, so dropping them would import a two-column CV as an empty
    // document -- which looks exactly like a broken importer.
    const doc = htmlToWordContent(
      '<table><tr><td><p>Left column</p></td><td><p>Right column</p></td></tr></table>'
    ) as { content: Array<{ content?: Array<{ text?: string }> }> }
    const text = doc.content.map((n) => n.content?.[0]?.text)
    expect(text).toContain('Left column')
    expect(text).toContain('Right column')
  })

  it('carries bold and italic, and nothing StarterKit cannot render', () => {
    const doc = htmlToWordContent(
      '<p>plain <strong>bold</strong> <em>italic</em> <u>underlined</u></p>'
    ) as { content: Array<{ content: Array<{ text: string; marks?: Array<{ type: string }> }> }> }
    const runs = doc.content[0].content
    expect(runs.find((r) => r.text === 'bold')!.marks).toEqual([{ type: 'bold' }])
    expect(runs.find((r) => r.text === 'italic')!.marks).toEqual([{ type: 'italic' }])
    // Underline survives as text with no mark rather than as a mark the
    // editor would silently discard.
    expect(runs.find((r) => r.text === 'underlined')!.marks).toBeUndefined()
  })

  it('turns lists into list nodes, not run-together paragraphs', () => {
    const doc = htmlToWordContent('<ul><li><p>first</p></li><li><p>second</p></li></ul>') as {
      content: Array<{ type: string; content: unknown[] }>
    }
    expect(doc.content[0].type).toBe('bulletList')
    expect(doc.content[0].content).toHaveLength(2)
  })

  it('drops Word spacing paragraphs but never produces an empty doc', () => {
    // An empty <p> is Word's spacing, not a paragraph anyone wrote -- but
    // tiptap throws on a doc with no content.
    const doc = htmlToWordContent('<p></p><p>   </p>') as { content: unknown[] }
    expect(doc.content).toHaveLength(1)
  })
})

describe('section titles in CVs that use bold instead of Word heading styles', () => {
  // Gabe's own ATS CV is this shape: mammoth returns forty <p> for it, with
  // <strong> marking the section titles and no <h*> anywhere.
  const heads = (html: string) =>
    (htmlToWordContent(html) as { content: Array<{ type: string; content?: Array<{ text?: string }> }> }).content

  it('promotes a bold, all-caps, short line', () => {
    const [node] = heads('<p><strong>PROFESSIONAL SUMMARY</strong></p>')
    expect(node.type).toBe('heading')
    expect(node.content![0].text).toBe('PROFESSIONAL SUMMARY')
  })

  it('drops the bold mark once it is a heading, which carries its own weight', () => {
    const [node] = heads('<p><strong>TECHNICAL SKILLS</strong></p>') as Array<{
      content: Array<{ marks?: unknown }>
    }>
    expect(node.content[0].marks).toBeUndefined()
  })

  it('leaves a bold LEAD-IN on a body paragraph alone', () => {
    // "**Programming Languages:** Solid day-to-day command of JavaScript..."
    // is a paragraph, and promoting it would eat the sentence after it.
    const [node] = heads(
      '<p><strong>Programming Languages: </strong>Solid command of JavaScript and TypeScript.</p>'
    )
    expect(node.type).toBe('paragraph')
  })

  it('leaves a bold title-case line alone', () => {
    // The tagline under the name is fully bold but is not a section.
    const [node] = heads(
      '<p><strong>Aspiring Front-End Developer | Transitioning to Full-Stack</strong></p>'
    )
    expect(node.type).toBe('paragraph')
  })

  it('leaves a long bold all-caps line alone, since that is emphasis', () => {
    const [node] = heads(
      '<p><strong>THIS WHOLE SENTENCE IS SHOUTED FOR EMPHASIS AND RUNS WELL PAST ANY SECTION TITLE</strong></p>'
    )
    expect(node.type).toBe('paragraph')
  })
})
