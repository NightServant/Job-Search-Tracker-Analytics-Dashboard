import type { Editor } from '@tiptap/core'

/**
 * The document's headings and its statistics: Word's Navigation Pane and the
 * counts in its status bar, which is what the left rail was missing.
 *
 * THE RAIL HELD TWO BUTTONS AND A LOT OF NOTHING. It is a 280px column whose
 * entire content was a pair of tabs, and Gabe has now called the surrounding
 * emptiness out twice. Word puts two real things in that space: an outline you
 * can click to move around a long document, and a live word count. Neither
 * needs a service -- both are read off the editor -- so this is the cheapest
 * genuine feature available here.
 *
 * A CV IS EXACTLY THE DOCUMENT AN OUTLINE SUITS. It is all headings --
 * PROFESSIONAL SUMMARY, TECHNICAL SKILLS, EXPERIENCE, EDUCATION -- and the
 * thing you do most while editing one is jump between them. Scrolling a
 * three-page CV to reach the education section is the motion this removes.
 *
 * PURE, AND DELIBERATELY SEPARATE FROM THE COMPONENT. `outlineOf` takes a
 * ProseMirror doc and returns data; the panel renders it. That is what makes
 * the numbering rules below testable without mounting an editor.
 */

export interface OutlineEntry {
  /** ProseMirror position, so clicking can put the caret there. */
  pos: number
  level: number
  text: string
  /** Depth relative to the shallowest heading present, for indentation. */
  depth: number
}

/**
 * Every heading in the document, in order.
 *
 * DEPTH IS RELATIVE, NOT ABSOLUTE. A CV whose sections are all `h2` -- which
 * is the common shape, because `h1` is the person's name -- would otherwise
 * render every entry indented one step with nothing at the root, which reads
 * as a broken tree. Normalising against the shallowest level present means the
 * outline looks right whichever heading level the author happened to use.
 *
 * AN EMPTY HEADING IS SKIPPED. Pressing Enter on a heading leaves a blank one
 * behind while you type the next section name, and a nameless row appearing
 * and vanishing in the outline is a distraction with nothing to click.
 */
export function outlineOf(editor: Editor | null): OutlineEntry[] {
  if (!editor) return []

  const found: { pos: number; level: number; text: string }[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return true
    const text = node.textContent.trim()
    if (text) found.push({ pos, level: node.attrs.level ?? 1, text })
    return false
  })

  if (found.length === 0) return []
  const shallowest = Math.min(...found.map((h) => h.level))
  return found.map((h) => ({ ...h, depth: h.level - shallowest }))
}

export interface DocumentStats {
  words: number
  characters: number
  /** Excluding spaces, as Word counts it separately. */
  charactersNoSpaces: number
  paragraphs: number
  /** Letter pages at roughly 500 words each. An estimate, labelled as one. */
  pages: number
  /** Minutes at 200 words per minute, floored at 1 for any content at all. */
  readingMinutes: number
}

/** Word's own counts, over the plain text of the document. */
export function statsOf(text: string, paragraphs: number): DocumentStats {
  const trimmed = text.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  return {
    words,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    paragraphs,
    // 500 words is a dense letter page at 11pt; a CV runs denser than prose.
    // Rounded UP because a page that is one line over is still two pages to
    // anybody printing it, which is the only reason this number matters.
    pages: words === 0 ? 0 : Math.ceil(words / 500),
    readingMinutes: words === 0 ? 0 : Math.max(1, Math.round(words / 200)),
  }
}

/** Counts the blocks that actually carry text. */
export function paragraphCount(editor: Editor | null): number {
  if (!editor) return 0
  let count = 0
  editor.state.doc.descendants((node) => {
    if (node.isTextblock && node.textContent.trim()) count += 1
    return true
  })
  return count
}
