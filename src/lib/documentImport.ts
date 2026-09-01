import type { ResumeContent, ResumeMode } from '@/services/resumeService'

export interface ImportedDocument {
  mode: ResumeMode
  title: string
  content: ResumeContent
}

/**
 * Turns an uploaded file into a CV the editors can open.
 *
 * The extension decides the mode, not the content: a `.tex` file opens in the
 * LaTeX editor with its source intact, everything else opens in the Word
 * editor as paragraphs. Sniffing the body instead would guess wrong on a plain
 * CV that happens to contain a backslash.
 *
 * `.docx` goes through mammoth (BSD-2-Clause), which Gabe chose. A .docx is a
 * ZIP of WordprocessingML and reading one by hand means ZIP central-directory
 * parsing plus a document.xml walk; mammoth is the library that exists for
 * exactly this and it maps Word's STYLES rather than its formatting, which is
 * the distinction that matters here. Word marks a heading by naming a style,
 * not by making text big -- so a converter that reads formatting produces a CV
 * of bold paragraphs, and one that reads styles produces headings.
 *
 * `.doc` is still refused. It is the pre-2007 binary format, a different thing
 * entirely from `.docx`, and mammoth does not read it.
 */
export const IMPORTABLE_EXTENSIONS = ['.docx', '.tex', '.txt', '.md', '.markdown'] as const

/** What the file picker offers. `.doc` is listed so the rejection can explain itself. */
export const IMPORT_ACCEPT = '.docx,.tex,.txt,.md,.markdown,.doc'

export class UnsupportedDocumentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedDocumentError'
  }
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot === -1 ? '' : filename.slice(dot).toLowerCase()
}

/** The filename without its extension, which is a far better title than "Untitled". */
export function titleFromFilename(filename: string): string {
  const base = filename.replace(/^.*[\\/]/, '')
  const dot = base.lastIndexOf('.')
  const stem = (dot === -1 ? base : base.slice(0, dot)).trim()
  return stem.length > 0 ? stem : 'Imported CV'
}

/**
 * Plain text into tiptap's document shape.
 *
 * A blank line separates paragraphs, which is the one convention every plain
 * CV and every Markdown file already agrees on. Markdown `#` headings become
 * real headings because that mapping is unambiguous; nothing else in Markdown
 * is translated, since a half-applied Markdown parser produces a document with
 * some syntax rendered and the rest left as literal asterisks, which is worse
 * than leaving all of it as text.
 */
export function textToWordContent(text: string): ResumeContent {
  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)

  const content = blocks.map((block) => {
    const heading = /^(#{1,3})\s+(.*)$/.exec(block)
    if (heading) {
      return {
        type: 'heading',
        attrs: { level: heading[1].length },
        content: [{ type: 'text', text: heading[2].trim() }],
      }
    }
    // A single newline inside a block is a line break, not a new paragraph --
    // address lines and "Title | Company" pairs depend on it.
    const lines = block.split('\n')
    const inline: Array<Record<string, unknown>> = []
    lines.forEach((line, i) => {
      if (i > 0) inline.push({ type: 'hardBreak' })
      if (line.length > 0) inline.push({ type: 'text', text: line })
    })
    return { type: 'paragraph', content: inline }
  })

  // tiptap rejects a doc with no content, and an imported empty file is a real
  // thing a person can pick, so it becomes one empty paragraph rather than a
  // document that throws when the editor mounts.
  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  } as ResumeContent
}

/**
 * `Blob.text()` where it exists, `FileReader` where it does not.
 *
 * Not only a test convenience: `Blob.text()` landed in Safari 14, so a reader
 * on an older iPad would hit the same `file.text is not a function` this
 * fallback was written for. FileReader has been universal since forever.
 */
function readText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'))
    reader.readAsText(file)
  })
}

/** The `arrayBuffer` half of the same story, for mammoth. */
function readArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Reads a picked file into a draft. Throws `UnsupportedDocumentError` with
 * copy meant to be shown to the reader.
 */
export async function importDocument(file: File): Promise<ImportedDocument> {
  const extension = extensionOf(file.name)

  if (extension === '.doc') {
    throw new UnsupportedDocumentError(
      'That is the old .doc format, which cannot be read. Open it in Word and save it as .docx, then import that.'
    )
  }

  if (!(IMPORTABLE_EXTENSIONS as readonly string[]).includes(extension)) {
    throw new UnsupportedDocumentError(
      `${extension || 'That file type'} cannot be imported. Pick a .tex, .txt or .md file.`
    )
  }

  const title = titleFromFilename(file.name)

  if (extension === '.docx') {
    return { mode: 'word', title, content: await docxToWordContent(file) }
  }

  const text = await readText(file)

  if (extension === '.tex') {
    return { mode: 'latex', title, content: { type: 'latex', source: text } as ResumeContent }
  }

  return { mode: 'word', title, content: textToWordContent(text) }
}


/**
 * A .docx into the Word editor's content, via mammoth.
 *
 * mammoth produces HTML; this walks that HTML into tiptap's JSON. It does NOT
 * hand the HTML to the editor to parse, because the import happens on
 * /documents where no editor is mounted -- creating one, parsing, and throwing
 * it away to convert a file would be a strange amount of machinery.
 *
 * Only the nodes StarterKit actually renders are emitted. Anything else --
 * tables above all, which Word CVs are full of -- is FLATTENED to paragraphs
 * rather than dropped: a two-column Word CV laid out in an invisible table
 * would otherwise import as an empty document, which looks exactly like a
 * broken importer. Flattened text is imperfect and present, which beats
 * perfect and absent.
 *
 * Images are discarded. mammoth would inline them as base64 data URIs, and
 * StarterKit has no image node to put them in, so they would land in the JSON
 * as content nothing can render and the row would carry the weight of the
 * pictures forever.
 */
async function docxToWordContent(file: File): Promise<ResumeContent> {
  // Imported here rather than at module scope: mammoth is the largest thing in
  // this file's dependency graph and only one of five extensions needs it, so
  // a reader importing a .txt should not pay to download it.
  const mammoth = await import('mammoth')
  const arrayBuffer = await readArrayBuffer(file)
  const { value: html } = await mammoth.convertToHtml(
    { arrayBuffer },
    // Word's own style names, mapped to what the editor can show. Without
    // this, "Title" and "Heading 1" both arrive as plain paragraphs.
    {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
      ],
      convertImage: undefined,
    }
  )

  return htmlToWordContent(html)
}

type TipTapNode = { type: string; attrs?: Record<string, unknown>; content?: TipTapNode[]; marks?: Array<{ type: string }>; text?: string }

/** Exported for tests: the HTML walk, without the file reading around it. */
export function htmlToWordContent(html: string): ResumeContent {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const blocks: TipTapNode[] = []
  collectBlocks(doc.body, blocks)

  return {
    type: 'doc',
    content: blocks.length > 0 ? blocks : [{ type: 'paragraph' }],
  } as unknown as ResumeContent
}

const HEADINGS: Record<string, number> = { H1: 1, H2: 2, H3: 3, H4: 3, H5: 3, H6: 3 }

function collectBlocks(parent: Element, out: TipTapNode[]): void {
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === 3) {
      // A bare text node between blocks -- Word's HTML has these around
      // tables. Kept as its own paragraph rather than dropped.
      const text = (node.textContent ?? '').trim()
      if (text) out.push({ type: 'paragraph', content: [{ type: 'text', text }] })
      continue
    }
    if (node.nodeType !== 1) continue
    const el = node as Element
    const tag = el.tagName.toUpperCase()

    if (tag in HEADINGS) {
      const content = inlineContent(el)
      if (content.length > 0) {
        out.push({ type: 'heading', attrs: { level: HEADINGS[tag] }, content })
      }
      continue
    }
    if (tag === 'P') {
      const content = inlineContent(el)
      // An empty <p> is Word's spacing, not a paragraph anyone wrote.
      if (content.length === 0) continue
      out.push(
        looksLikeSectionTitle(content)
          ? { type: 'heading', attrs: { level: 2 }, content: stripMarks(content) }
          : { type: 'paragraph', content }
      )
      continue
    }
    if (tag === 'UL' || tag === 'OL') {
      const items = Array.from(el.children)
        .filter((li) => li.tagName.toUpperCase() === 'LI')
        .map((li) => {
          const nested: TipTapNode[] = []
          collectBlocks(li, nested)
          return {
            type: 'listItem',
            content: nested.length > 0 ? nested : [{ type: 'paragraph' }],
          }
        })
      if (items.length > 0) {
        out.push({ type: tag === 'UL' ? 'bulletList' : 'orderedList', content: items })
      }
      continue
    }
    // Everything else -- tables, divs, sections -- is walked through rather
    // than emitted. A Word CV laid out in an invisible table would otherwise
    // import as nothing at all.
    collectBlocks(el, out)
  }
}

/**
 * Whether a paragraph is really a section title wearing bold.
 *
 * The style map above only fires when the author used Word's Heading styles.
 * Gabe's own ATS CV does not: mammoth returns forty `<p>` for it, with
 * `<strong>` marking "PROFESSIONAL SUMMARY" and "TECHNICAL SKILLS". That is
 * the normal shape of an ATS-oriented CV, so importing one without this
 * produces a wall of undifferentiated paragraphs.
 *
 * Three conditions, all required, and each one is there to keep something out:
 *
 * - ENTIRELY bold. "**Programming Languages:** Solid day-to-day command of..."
 *   is a bold lead-in on a body paragraph, not a heading.
 * - No lowercase letters. Section titles in these CVs are set in caps;
 *   requiring it excludes a bold job title like "Front-End Developer".
 * - Short. A bold all-caps sentence is emphasis, not a section.
 *
 * It will still promote a company name typed in bold caps on its own line.
 * That is the known cost, it is one heading too many rather than lost text,
 * and the alternative -- no headings at all on the CVs most likely to be
 * imported -- is worse.
 */
const SECTION_TITLE_MAX = 48

function looksLikeSectionTitle(content: TipTapNode[]): boolean {
  if (content.length === 0) return false
  if (!content.every((node) => node.type === 'text' && node.marks?.some((m) => m.type === 'bold')))
    return false
  const text = content.map((node) => node.text ?? '').join('')
  if (text.trim().length === 0 || text.length > SECTION_TITLE_MAX) return false
  // Uppercase-only: no lowercase letter anywhere.
  return !/\p{Ll}/u.test(text)
}

/** A heading carries its own weight; keeping the bold mark would double it. */
function stripMarks(content: TipTapNode[]): TipTapNode[] {
  return content.map(({ marks: _marks, ...node }) => node)
}

/** Text and the two marks StarterKit renders. Anything else keeps its text. */
function inlineContent(el: Element, marks: Array<{ type: string }> = []): TipTapNode[] {
  const out: TipTapNode[] = []
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3) {
      const text = node.textContent ?? ''
      if (text.trim().length > 0) {
        out.push(marks.length > 0 ? { type: 'text', text, marks } : { type: 'text', text })
      }
      continue
    }
    if (node.nodeType !== 1) continue
    const child = node as Element
    const tag = child.tagName.toUpperCase()
    if (tag === 'BR') {
      out.push({ type: 'hardBreak' })
      continue
    }
    const next =
      tag === 'STRONG' || tag === 'B'
        ? [...marks, { type: 'bold' }]
        : tag === 'EM' || tag === 'I'
          ? [...marks, { type: 'italic' }]
          : marks
    out.push(...inlineContent(child, next))
  }
  return out
}
