/**
 * The page a .docx was written for: its size and its margins.
 *
 * THE BUG THIS FIXES, measured on Gabe's own CV (2026-09-11). The editor's
 * sheet was hard-coded to 8.5in wide with 0.8in margins on every side. His
 * ATS CV declares:
 *
 *   <w:pgSz  w:w="12240" w:h="15840"/>     8.5in x 11in
 *   <w:pgMar w:top="504" w:bottom="504"
 *            w:left="936" w:right="936"/>  0.35in and 0.65in
 *
 * A tight margin is not decoration on an ATS CV -- it is how three pages of
 * experience fit on two. Rendering it at 0.8in narrows the text column from
 * 7.2in to 6.9in, so every paragraph wraps earlier, the document grows several
 * lines, and what is on screen stops matching what Word showed. That is the
 * "format breaks" report: nothing failed, the page was simply the wrong page.
 *
 * TWIPS ARE THE UNIT WORD STORES, twentieths of a point, 1440 to the inch.
 * Every number that comes out of `document.xml` is in them and every number
 * that goes into CSS is not, so the conversion happens here, once.
 *
 * THE FALLBACK IS THIS APP'S OWN SHEET, NOT WORD'S DEFAULT. A .docx with no
 * `sectPr`, a pasted document, or a CV typed in this editor has no geometry to
 * read, and the honest answer there is the page the editor has always drawn:
 * US Letter at 0.8in. Using Word's 1in instead would have been more "correct"
 * in the abstract and would have silently re-margined every CV already in the
 * database the next time it was opened or exported -- a bigger change than the
 * bug this file fixes, applied to documents that never had the bug.
 */

export const TWIPS_PER_INCH = 1440

export interface PageGeometry {
  /** Inches. */
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
}

/** The sheet this editor has always drawn. See the docblock for why not 1in. */
export const DEFAULT_GEOMETRY: PageGeometry = {
  width: 8.5,
  height: 11,
  margin: { top: 0.8, right: 0.8, bottom: 0.8, left: 0.8 },
}

function inches(twips: string | undefined, fallback: number): number {
  const value = Number.parseFloat(twips ?? '')
  if (!Number.isFinite(value)) return fallback
  const asInches = value / TWIPS_PER_INCH
  // A negative margin is legal OOXML (Word uses them for headers that bleed
  // into the body) and is nonsense as page padding, so it clamps at zero.
  // The upper bound stops a malformed file producing a page of pure margin.
  return Math.min(Math.max(asInches, 0), 20)
}

/**
 * Read the page setup out of a `word/document.xml`.
 *
 * PARSED WITH A REGEX, DELIBERATELY, and it is worth saying why rather than
 * leaving it to look lazy. The two elements wanted are empty, attribute-only
 * and appear once in a `sectPr` at the end of the body; there is no nesting to
 * track and no text content to decode. Running a whole XML parse over a 40KB
 * document to read six numbers off two self-closing tags would cost more than
 * it explains. A malformed match falls back rather than throwing.
 *
 * THE LAST `sectPr` WINS. A document with section breaks has one per section,
 * and the final one carries the body's own setup -- which is what the editor
 * renders, since it has no notion of sections.
 */
export function readPageGeometry(documentXml: string): PageGeometry {
  const sizeMatch = [...documentXml.matchAll(/<w:pgSz\b([^>]*)\/?>/g)].pop()
  const marginMatch = [...documentXml.matchAll(/<w:pgMar\b([^>]*)\/?>/g)].pop()

  const attr = (source: string | undefined, name: string): string | undefined =>
    source?.match(new RegExp(`w:${name}="([^"]+)"`))?.[1]

  const size = sizeMatch?.[1]
  const margin = marginMatch?.[1]

  return {
    width: inches(attr(size, 'w'), DEFAULT_GEOMETRY.width),
    height: inches(attr(size, 'h'), DEFAULT_GEOMETRY.height),
    margin: {
      top: inches(attr(margin, 'top'), DEFAULT_GEOMETRY.margin.top),
      right: inches(attr(margin, 'right'), DEFAULT_GEOMETRY.margin.right),
      bottom: inches(attr(margin, 'bottom'), DEFAULT_GEOMETRY.margin.bottom),
      left: inches(attr(margin, 'left'), DEFAULT_GEOMETRY.margin.left),
    },
  }
}

/** Anything that is not a usable geometry becomes the default. */
export function normalizeGeometry(raw: unknown): PageGeometry {
  if (!raw || typeof raw !== 'object') return DEFAULT_GEOMETRY
  const candidate = raw as Partial<PageGeometry>
  const margin = candidate.margin
  if (
    typeof candidate.width !== 'number' ||
    typeof candidate.height !== 'number' ||
    candidate.width <= 0 ||
    candidate.height <= 0 ||
    !margin ||
    typeof margin !== 'object'
  ) {
    return DEFAULT_GEOMETRY
  }
  const side = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback

  return {
    width: candidate.width,
    height: candidate.height,
    margin: {
      top: side(margin.top, DEFAULT_GEOMETRY.margin.top),
      right: side(margin.right, DEFAULT_GEOMETRY.margin.right),
      bottom: side(margin.bottom, DEFAULT_GEOMETRY.margin.bottom),
      left: side(margin.left, DEFAULT_GEOMETRY.margin.left),
    },
  }
}

/** The printable column, which is what actually decides where text wraps. */
export function textColumnInches(geometry: PageGeometry): number {
  return Math.max(0, geometry.width - geometry.margin.left - geometry.margin.right)
}
