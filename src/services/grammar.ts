/**
 * The LanguageTool boundary: chunking text into it, typed issues out of it.
 *
 * WHY LANGUAGETOOL AND NOT GRAMMARBOT. GrammarBot is shutting down (Gabe,
 * 2026-09-11). LanguageTool replaces it and is a better fit on every axis that
 * mattered here, which is worth recording because it removed three compromises
 * rather than one:
 *
 *   NO API KEY. The public endpoint is keyless, so there is nothing to protect
 *   and nothing to configure before the feature works.
 *   CORS IS OPEN -- `access-control-allow-origin: *`, verified 2026-09-11 --
 *   so the browser calls it directly. GrammarBot refused browser requests and
 *   forced a server proxy; that proxy has been deleted, because with a
 *   per-IP rate limit a shared server address is strictly worse than each
 *   user's own.
 *   SEVERAL REPLACEMENTS PER ERROR, not one. Word's spelling card lists
 *   alternatives, and with GrammarBot that list could only ever hold a single
 *   entry. `replacements` is an array.
 *   A STYLE CATEGORY EXISTS. `REDUNDANCY`, `STYLE` and `TYPOGRAPHY` carry
 *   `issueType: style`, which is what makes Word's Refinements block real data
 *   instead of a section that had to be left out to avoid inventing numbers.
 *
 * THE CONTRACT, verified against the live endpoint rather than the docs:
 *
 *   POST https://api.languagetool.org/v2/check     (form-encoded)
 *   language=en-US&text=...
 *
 *   { "matches": [ { "offset": 40, "length": 3,
 *                    "message": "...", "shortMessage": "Spelling mistake",
 *                    "replacements": [ {"value": "the"}, {"value": "ten"} ],
 *                    "rule": { "issueType": "misspelling",
 *                              "category": { "id": "TYPOS" } } } ] }
 *
 * NOTE THE SHAPE CHANGE from the previous vendor: `offset`/`length`, not
 * `start`/`end`. The conversion happens here, once, so nothing downstream has
 * to remember which convention it is holding.
 */

/**
 * The public endpoint's per-request ceiling. Most CVs fit in one request; the
 * chunker exists for the ones that do not, and for the day this points at a
 * self-hosted instance with a different limit.
 */
export const MAX_CHUNK_CHARS = 20_000

export const LANGUAGETOOL_ENDPOINT = 'https://api.languagetool.org/v2/check'

export type IssueCategory = 'spelling' | 'grammar' | 'style'

export interface GrammarIssue {
  /** Offsets into the WHOLE document, not the chunk that produced them. */
  start: number
  end: number
  /**
   * Every suggested replacement, best first, as the service ordered them.
   * Empty means the service flagged something without proposing a fix.
   */
  replacements: string[]
  category: IssueCategory
  /** The vendor's own category id, kept so an unknown one stays diagnosable. */
  rawCategory: string
  /** Short where the service gives one, falling back to the long message. */
  message: string
}

export interface LanguageToolMatch {
  offset: number
  length: number
  message?: string
  shortMessage?: string
  replacements?: { value?: string }[]
  rule?: {
    issueType?: string
    category?: { id?: string; name?: string }
  }
}

export interface LanguageToolResponse {
  matches?: LanguageToolMatch[]
}

/**
 * Which tab a match belongs to.
 *
 * `issueType` FIRST, because it is the service's own normalisation and is
 * stable across the hundreds of individual rules. The category id is the
 * fallback for the handful of rules that omit it.
 *
 * ANYTHING UNRECOGNISED BECOMES GRAMMAR rather than being dropped. Losing an
 * issue entirely is a worse failure than filing it under the wrong heading,
 * and `rawCategory` carries the original through for diagnosis.
 */
const STYLE_TYPES = new Set(['style', 'redundancy', 'locale-violation', 'register'])
const STYLE_CATEGORIES = new Set([
  'STYLE',
  'REDUNDANCY',
  'PLAIN_ENGLISH',
  'WORDINESS',
  // Punctuation and spacing. NOT the same thing as `issueType:
  // 'typographical'`, which is a mis-typed WORD and belongs with spelling.
  // The two read alike and mean opposite things, which is the trap this
  // comment exists for.
  'TYPOGRAPHY',
  'CASING',
])

export function categoryOf(issueType?: string, categoryId?: string): IssueCategory {
  const type = (issueType ?? '').toLowerCase()
  if (type === 'misspelling' || type === 'typographical') return 'spelling'
  if (STYLE_TYPES.has(type)) return 'style'

  const id = (categoryId ?? '').toUpperCase()
  if (id === 'TYPOS') return 'spelling'
  if (STYLE_CATEGORIES.has(id)) return 'style'
  return 'grammar'
}

/**
 * Split text into pieces the service will accept, preferring a natural break.
 *
 * OFFSETS ARE THE WHOLE POINT. Each chunk carries the index it started at so
 * `toIssues` can add it back, and every issue ends up addressing the document
 * the user is looking at. Chunking without that bookkeeping is how an
 * underline lands three paragraphs from the word it belongs to.
 */
export function chunkText(
  text: string,
  maxChars: number = MAX_CHUNK_CHARS
): { text: string; offset: number }[] {
  if (maxChars <= 0) throw new RangeError('maxChars must be positive')
  if (text.length === 0) return []

  const chunks: { text: string; offset: number }[] = []
  let cursor = 0

  while (cursor < text.length) {
    if (text.length - cursor <= maxChars) {
      chunks.push({ text: text.slice(cursor), offset: cursor })
      break
    }

    const window = text.slice(cursor, cursor + maxChars)
    // Only accept a boundary in the last fifth, or a paragraph break near the
    // start would produce a tiny chunk and many more requests than necessary.
    const earliest = Math.floor(maxChars * 0.8)

    let cut = -1
    for (const pattern of ['\n\n', '. ', ' ']) {
      const at = window.lastIndexOf(pattern)
      if (at >= earliest) {
        cut = at + pattern.length
        break
      }
    }
    if (cut <= 0) cut = maxChars

    chunks.push({ text: text.slice(cursor, cursor + cut), offset: cursor })
    cursor += cut
  }

  return chunks
}

/**
 * Map one response onto document-absolute issues.
 *
 * `offset` is the chunk's start. Malformed matches are dropped rather than
 * rendered: a negative offset or length would either throw on slice or
 * highlight the wrong span.
 */
export function toIssues(
  response: LanguageToolResponse,
  offset = 0
): GrammarIssue[] {
  const matches = Array.isArray(response.matches) ? response.matches : []

  return matches
    .filter(
      (match) =>
        Number.isFinite(match.offset) &&
        Number.isFinite(match.length) &&
        match.offset >= 0 &&
        match.length >= 0
    )
    .map((match) => ({
      start: match.offset + offset,
      end: match.offset + match.length + offset,
      replacements: (match.replacements ?? [])
        .map((replacement) => replacement.value)
        .filter((value): value is string => typeof value === 'string')
        // Word shows a handful, not forty; the rest are noise in a 320px rail.
        .slice(0, 5),
      category: categoryOf(match.rule?.issueType, match.rule?.category?.id),
      rawCategory: match.rule?.category?.id ?? '',
      message: match.shortMessage?.trim() || match.message?.trim() || '',
    }))
}

/** Issues split into the tabs that show them, in document order within each. */
export function splitByCategory(issues: GrammarIssue[]): {
  spelling: GrammarIssue[]
  grammar: GrammarIssue[]
  style: GrammarIssue[]
} {
  const byPosition = [...issues].sort((a, b) => a.start - b.start)
  return {
    spelling: byPosition.filter((i) => i.category === 'spelling'),
    grammar: byPosition.filter((i) => i.category === 'grammar'),
    style: byPosition.filter((i) => i.category === 'style'),
  }
}

/**
 * Apply one replacement to the text it came from.
 *
 * Callers must re-check rather than applying a second issue to the result:
 * every offset after the edit has moved by the length difference, so a stale
 * list would cut at the wrong index. `useProofread` enforces that by clearing
 * the list on accept.
 */
export function applyIssue(text: string, issue: GrammarIssue, replacement: string): string {
  if (issue.start < 0 || issue.end > text.length || issue.end < issue.start) {
    return text
  }
  return text.slice(0, issue.start) + replacement + text.slice(issue.end)
}
