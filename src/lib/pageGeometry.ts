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

/**
 * The type a .docx was set in: face, size, line height, paragraph spacing.
 *
 * THE SECOND HALF OF THE SAME BUG. Fixing the margins made the page right and
 * left the CONTENT wrong, because mammoth converts a document to semantic HTML
 * -- p, strong, em, ul -- and discards every run property on the way. So an
 * imported CV rendered in whatever the editor's stylesheet said rather than
 * what its author chose. Measured on the reported file:
 *
 *   the document   Garamond, 11pt, paragraph spacing 2-8pt
 *   the editor     its own sans-serif, 15px, 8px after every paragraph
 *
 * Nothing about that is subtle on screen, and it is the whole of "no borders,
 * font, spacing are not rendered properly".
 *
 * THE DOMINANT RUN WINS, not the document default, and the difference matters
 * on this very file: `docDefaults` says Times New Roman and not one run uses
 * it -- all 109 are Garamond. Word writes the default and then overrides it
 * everywhere, so reading `docDefaults` alone gets the answer exactly wrong.
 * Counting what the runs actually say gets it right.
 *
 * ONE FACE FOR THE WHOLE SHEET, which is a real simplification and is stated
 * rather than hidden. Per-run fidelity would mean walking `document.xml`
 * instead of using mammoth at all. A CV is set in one family -- this one has
 * a single face across every run -- so the dominant face applied to the sheet
 * is right for the documents this editor is for, and wrong only for a document
 * that mixes families deliberately.
 */
export interface DocumentTypography {
  /** CSS font-family stack, already quoted where it needs to be. */
  fontFamily: string | null
  /** Points. */
  fontSize: number | null
  /** Unitless line-height multiplier. */
  lineHeight: number | null
  /** Points of space after a paragraph. */
  paragraphSpacing: number | null
}

export const NO_TYPOGRAPHY: DocumentTypography = {
  fontFamily: null,
  fontSize: null,
  lineHeight: null,
  paragraphSpacing: null,
}

/** The value that appears most often, or null when there are none. */
function dominant(values: string[]): string | null {
  if (values.length === 0) return null
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

/** Median, so one 16pt heading does not drag the body size up. */
function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

export function readTypography(documentXml: string, stylesXml = ''): DocumentTypography {
  const faces = [...documentXml.matchAll(/<w:rFonts\b[^>]*w:ascii="([^"]+)"/g)].map((m) => m[1])
  const face =
    dominant(faces) ??
    // Only if no run says anything: the document default, which on the
    // reported file is a face nothing actually uses.
    stylesXml.match(/<w:rPrDefault>[\s\S]*?<w:rFonts\b[^>]*w:ascii="([^"]+)"/)?.[1] ??
    null

  // `w:sz` is HALF-points, so 22 is 11pt.
  const sizes = [...documentXml.matchAll(/<w:sz w:val="(\d+)"\/>/g)]
    .map((m) => Number.parseInt(m[1], 10) / 2)
    .filter((n) => Number.isFinite(n) && n > 0 && n < 100)

  // `w:line` with `lineRule="auto"` is 240ths of a line, so 235 is 0.98.
  const line = documentXml.match(/<w:spacing[^>]*w:line="(\d+)"[^>]*w:lineRule="auto"/)?.[1]
    ?? stylesXml.match(/<w:pPrDefault>[\s\S]*?<w:spacing[^>]*w:line="(\d+)"/)?.[1]
  const lineHeight = line ? Number.parseInt(line, 10) / 240 : null

  // `w:after` is twips; 20 to the point.
  const afters = [...documentXml.matchAll(/<w:spacing[^>]*w:after="(\d+)"/g)]
    .map((m) => Number.parseInt(m[1], 10) / 20)
    .filter((n) => Number.isFinite(n) && n >= 0 && n < 100)

  return {
    fontFamily: face ? `"${face}", Georgia, serif` : null,
    fontSize: median(sizes),
    lineHeight: lineHeight && lineHeight > 0.5 && lineHeight < 4 ? lineHeight : null,
    paragraphSpacing: median(afters),
  }
}

/** Anything unusable becomes "use the editor's own styles". */
export function normalizeTypography(raw: unknown): DocumentTypography {
  if (!raw || typeof raw !== 'object') return NO_TYPOGRAPHY
  const t = raw as Partial<DocumentTypography>
  const num = (v: unknown, lo: number, hi: number) =>
    typeof v === 'number' && Number.isFinite(v) && v > lo && v < hi ? v : null
  return {
    fontFamily: typeof t.fontFamily === 'string' && t.fontFamily.trim() ? t.fontFamily : null,
    fontSize: num(t.fontSize, 3, 100),
    lineHeight: num(t.lineHeight, 0.5, 4),
    paragraphSpacing: num(t.paragraphSpacing, -1, 100),
  }
}

/**
 * The section headings a document underlines with a paragraph border.
 *
 * WORD DRAWS THESE WITH `w:pBdr`, a border on the PARAGRAPH rather than a
 * horizontal rule between paragraphs, and it is the single most visible thing
 * on a CV laid out this way: eight rules under PROFESSIONAL SUMMARY, TECHNICAL
 * SKILLS, EDUCATION and the rest are most of what makes the page look like a
 * CV rather than a memo. Gabe reported them as "no borders" and they were the
 * one part of that report still unfixed after the font and spacing.
 *
 * MAMMOTH CANNOT CARRY THEM. Its paragraph object exposes exactly `type`,
 * `children`, `styleId`, `styleName`, `numbering`, `alignment` and `indent` --
 * probed directly rather than assumed -- so there is no transform or style map
 * that would preserve a border. The only way to know is to read the package.
 *
 * MATCHED BY TEXT, WHICH IS RELIABLE FOR EXACTLY THIS. Matching by index would
 * break the moment mammoth merges or drops a paragraph, and matching by style
 * name fails because these carry none. Section headings are short, upper-case
 * and unique within a CV, so their text is a good key -- and a false positive
 * costs a rule under a line that should not have one, not a corrupted
 * document.
 */
export function readRuledHeadings(documentXml: string): string[] {
  const paragraphs = documentXml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? []
  const ruled: string[] = []

  for (const paragraph of paragraphs) {
    // A bottom border specifically: Word also uses `w:pBdr` for boxes and for
    // the line above a footnote separator, and neither is a heading rule.
    if (!/<w:pBdr>[\s\S]*?<w:bottom\b[^>]*w:val="(?!nil|none)/.test(paragraph)) continue
    const text = [...paragraph.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
      .map((m) => m[1])
      .join('')
      .trim()
    if (text) ruled.push(text)
  }

  return ruled
}

/** Compared case- and space-insensitively, since mammoth normalises runs. */
export function ruleKey(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
}
