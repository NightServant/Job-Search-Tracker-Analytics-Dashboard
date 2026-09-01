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
 * WHAT THIS DELIBERATELY DOES NOT DO: parse `.docx`. A .docx is a ZIP of XML,
 * and reading one properly means either a dependency (`mammoth` is the usual
 * one) or hand-rolling ZIP central-directory parsing plus a WordprocessingML
 * walk. Neither belongs in a helper added alongside a button. So the extension
 * is REJECTED with a message that names the real reason, rather than accepted
 * and silently producing an empty document or a page of binary. A button that
 * appears to work and does not is worse than one that says what it cannot do.
 */
export const IMPORTABLE_EXTENSIONS = ['.tex', '.txt', '.md', '.markdown'] as const

/** What the file picker offers. `.docx` is listed so the rejection can explain itself. */
export const IMPORT_ACCEPT = '.tex,.txt,.md,.markdown,.docx'

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

/**
 * Reads a picked file into a draft. Throws `UnsupportedDocumentError` with
 * copy meant to be shown to the reader.
 */
export async function importDocument(file: File): Promise<ImportedDocument> {
  const extension = extensionOf(file.name)

  if (extension === '.docx' || extension === '.doc') {
    throw new UnsupportedDocumentError(
      'Word binary files are not readable yet. Save the CV as .txt or .md and import that, or paste it into a blank CV.'
    )
  }

  if (!(IMPORTABLE_EXTENSIONS as readonly string[]).includes(extension)) {
    throw new UnsupportedDocumentError(
      `${extension || 'That file type'} cannot be imported. Pick a .tex, .txt or .md file.`
    )
  }

  const text = await readText(file)
  const title = titleFromFilename(file.name)

  if (extension === '.tex') {
    return { mode: 'latex', title, content: { type: 'latex', source: text } as ResumeContent }
  }

  return { mode: 'word', title, content: textToWordContent(text) }
}
