import { createElement as h, type ReactElement } from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'

/**
 * PDF export for the CV editor.
 *
 * TWO HOMES BEFORE THIS ONE, AND THE SECOND FAILURE IS WHY THIS IS THE THIRD.
 *
 * It began as a Supabase edge function driving headless Chromium, against a
 * runtime published at 256MB of memory and a 20MB bundle. Chromium clears
 * neither, so it was never deployable and never deployed -- the editor showed
 * "Failed to fetch" because the function did not exist. Moving it to a Vercel
 * route fixed the deployability and inherited the harder half: Chromium there
 * is `@sparticuz/chromium`, which extracts its shared libraries only when it
 * recognises the runtime, and on Node 24 it did not -- `libnss3.so: cannot
 * open shared object file`, in production, after the local render was fine.
 *
 * THE REASON THAT KEPT HAPPENING IS THE REASON THIS IS DIFFERENT. Every
 * Chromium failure lived on a code path that only exists inside Lambda, so no
 * amount of local verification could reach it and each fix had to be tested by
 * deploying and waiting. `@react-pdf/renderer` has no binary, no extraction
 * and no runtime detection: it lays the document out in JavaScript and writes
 * the PDF. What renders here renders in production, which is the property that
 * was missing.
 *
 * THE COST IS HONEST AND WORTH NAMING. There is no browser, so this is not
 * "the editor's HTML, printed" -- the layout is re-expressed below in
 * `@react-pdf/renderer`'s primitives, and anything the editor can do that is
 * not mapped here does not appear. That is a real ceiling, and the mapping is
 * deliberately small: the CV shapes the editor actually produces.
 */

// ponytail: hyphenation off, because a hyphenated surname or job title in a CV
// reads as a typo. react-pdf hyphenates by default.
Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  // 0.8in of padding on Letter, carried over from the CSS this replaces.
  page: { paddingHorizontal: 57.6, paddingVertical: 57.6, fontFamily: 'Times-Roman', color: '#111827' },
  h1: { fontSize: 24, fontFamily: 'Times-Bold', marginBottom: 14.4, lineHeight: 1.2 },
  h2: { fontSize: 14, fontFamily: 'Times-Bold', marginTop: 18, marginBottom: 7.2, lineHeight: 1.25 },
  h3: { fontSize: 12, fontFamily: 'Times-Bold', marginTop: 12, marginBottom: 5.8, lineHeight: 1.3 },
  paragraph: { fontSize: 11.5, lineHeight: 1.55, marginVertical: 5.8 },
  // Same type, no vertical margin -- see `block`'s `inList`.
  listParagraph: { fontSize: 11.5, lineHeight: 1.5, marginVertical: 0 },
  listRow: { flexDirection: 'row', marginVertical: 3.6 },
  bullet: { fontSize: 11.5, lineHeight: 1.5, width: 14 },
  listBody: { flex: 1, fontSize: 11.5, lineHeight: 1.5 },
})

type Node = { type?: string; text?: string; attrs?: Record<string, unknown>; content?: Node[]; marks?: Mark[] }
type Mark = { type?: string; attrs?: Record<string, unknown> }

/**
 * `11pt`, `14px` and `14` all mean a number of points here.
 *
 * The editor's font-size control writes whichever unit its menu used, and a
 * size that silently fails to parse is a line of the CV at the wrong size --
 * quiet, and only visible next to the rest.
 */
export function toPoints(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return undefined
  const match = /^\s*(\d+(?:\.\d+)?)\s*(pt|px|rem|em)?\s*$/i.exec(value)
  if (!match) return undefined
  const size = Number(match[1])
  const unit = (match[2] ?? 'pt').toLowerCase()
  if (unit === 'px') return size * 0.75
  if (unit === 'rem' || unit === 'em') return size * 12
  return size
}

/**
 * The four Times faces are one font family to a reader and four names here.
 *
 * `@react-pdf/renderer` ships the PDF standard fonts and selects a face by
 * NAME, not by `fontWeight`/`fontStyle` -- so bold-inside-italic has to be
 * resolved to `Times-BoldItalic` before it is handed over, or it renders
 * upright and nobody can see why.
 */
export function faceFor(bold: boolean, italic: boolean): string {
  if (bold && italic) return 'Times-BoldItalic'
  if (bold) return 'Times-Bold'
  if (italic) return 'Times-Italic'
  return 'Times-Roman'
}

/** The style one run of text carries, from its marks. */
export function styleForMarks(marks: Mark[] | undefined, baseBold = false): Style {
  const names = new Set((marks ?? []).map((mark) => mark?.type))
  // `baseBold` IS NOT A FLOURISH. Each run is its own <Text> nested inside the
  // block's <Text>, and a nested `fontFamily` WINS -- so a heading styled
  // Times-Bold rendered upright the moment its text run named Times-Roman,
  // which is every heading. The block passes its own weight down instead.
  const style: Style = {
    fontFamily: faceFor(names.has('bold') || baseBold, names.has('italic')),
  }

  // Both at once is a real combination and the type is a fixed union, so the
  // pair is spelled out rather than joined from an array of strings.
  const underline = names.has('underline')
  const strike = names.has('strike')
  if (underline && strike) style.textDecoration = 'line-through underline'
  else if (underline) style.textDecoration = 'underline'
  else if (strike) style.textDecoration = 'line-through'

  for (const mark of marks ?? []) {
    if (mark?.type === 'textStyle') {
      const size = toPoints(mark.attrs?.fontSize)
      if (size) style.fontSize = size
      if (typeof mark.attrs?.color === 'string') style.color = mark.attrs.color
    }
    if (mark?.type === 'highlight') {
      // The editor stores `null` for the default highlight.
      style.backgroundColor = typeof mark.attrs?.color === 'string' ? mark.attrs.color : '#fef08a'
    }
  }

  return style
}

/** The text runs of a block, each as its own styled <Text>. */
function inlines(node: Node, keyPrefix: string, baseBold = false): ReactElement[] {
  return (node.content ?? []).flatMap((child, index) => {
    if (child?.type !== 'text' || typeof child.text !== 'string') return []
    return [
      h(Text, { key: `${keyPrefix}-t${index}`, style: styleForMarks(child.marks, baseBold) }, child.text),
    ]
  })
}

function headingStyle(level: unknown) {
  if (level === 1) return styles.h1
  if (level === 2) return styles.h2
  return styles.h3
}

/**
 * One block of the document. Returns null for anything unmapped.
 *
 * `inList` drops the paragraph's vertical margin: inside a list item that
 * margin pushes the text down while the bullet beside it stays put, so every
 * bullet floated above its own line.
 */
function block(node: Node, key: string, inList = false): ReactElement | null {
  const align = node.attrs?.textAlign
  const alignment: Style =
    align === 'center' || align === 'right' || align === 'justify' ? { textAlign: align } : {}

  if (node.type === 'heading') {
    return h(Text, { key, style: [headingStyle(node.attrs?.level), alignment] }, inlines(node, key, true))
  }

  if (node.type === 'paragraph') {
    // An empty paragraph is the editor's blank line and has to keep its height.
    const runs = inlines(node, key)
    const paragraph = inList ? styles.listParagraph : styles.paragraph
    return h(Text, { key, style: [paragraph, alignment] }, runs.length ? runs : ' ')
  }

  if (node.type === 'bulletList' || node.type === 'orderedList') {
    const ordered = node.type === 'orderedList'
    return h(
      View,
      { key },
      (node.content ?? []).map((item, index) =>
        h(
          View,
          { key: `${key}-i${index}`, style: styles.listRow },
          h(Text, { style: styles.bullet }, ordered ? `${index + 1}.` : '•'),
          h(
            View,
            { style: styles.listBody },
            (item.content ?? []).map((child, childIndex) =>
              block(child, `${key}-i${index}-${childIndex}`, true)
            )
          )
        )
      )
    )
  }

  return null
}

/**
 * The document tree, ready to render.
 *
 * Exported so the mapping can be asserted without producing a PDF: a test that
 * has to read binary output to find out whether bold survived is a test nobody
 * writes twice.
 */
export function buildDocument(content: unknown, title: string): ReactElement<DocumentProps> {
  const root = (content ?? {}) as Node
  const blocks = (root.content ?? [])
    .map((node, index) => block(node, `b${index}`))
    .filter((element): element is ReactElement => element !== null)

  return h(
    Document,
    { title },
    h(Page, { size: 'LETTER', style: styles.page }, blocks)
  )
}

export async function buildPdf(content: unknown, title: string): Promise<Uint8Array> {
  const buffer = await renderToBuffer(buildDocument(content, title))
  return new Uint8Array(buffer)
}
