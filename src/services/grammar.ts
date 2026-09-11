/**
 * The GrammarBot boundary: chunking text into it, and typed issues out of it.
 *
 * WHY A SERVICE AND NOT A `fetch` IN A COMPONENT. Two reasons, both from the
 * vendor's own quickstart rather than taste. The API refuses browser requests
 * outright -- "Browser-based AJAX requests will not work due to CORS
 * restrictions. To use in a browser, create a server-side script that acts as a
 * proxy" -- and the key travels in the request BODY, so a browser call would
 * publish it to anyone with devtools. `/api/grammar` is that proxy, and this
 * file is the part of it worth testing: everything here is pure.
 *
 * THE CONTRACT, copied from the quickstart so a reader does not have to fetch
 * it:
 *
 *   POST https://neural.grammarbot.io/v1/check
 *   { "text": "This be the best", "api_key": "..." }
 *
 *   { "correction": "This is the best",
 *     "status": 200,
 *     "edits": [ { "start": 5, "end": 7, "replace": "is",
 *                  "edit_type": "MODIFY", "err_cat": "GRMR",
 *                  "err_type": "", "err_desc": "" } ],
 *     "latency": 0.901 }
 *
 * ONE API, TWO TABS. Grammar Check and Spell Check are the same endpoint split
 * by `err_cat`, which is what makes two panes out of one request rather than
 * two round trips over the same document.
 */

/** The 5,000-character ceiling is the vendor's, not ours. */
export const MAX_CHUNK_CHARS = 5000

export type IssueCategory = 'spelling' | 'grammar'

export interface GrammarIssue {
  /** Offsets into the WHOLE document, not the chunk that produced them. */
  start: number
  end: number
  /** The text the API suggests instead. Empty string means "delete this". */
  replace: string
  category: IssueCategory
  /** The vendor's own code, kept verbatim so an unknown one stays diagnosable. */
  rawCategory: string
  /** Human-readable when the vendor supplies one; often empty. */
  description: string
}

export interface GrammarBotEdit {
  start: number
  end: number
  replace: string
  edit_type?: string
  err_cat?: string
  err_type?: string
  err_desc?: string
}

export interface GrammarBotResponse {
  correction?: string
  status?: number
  edits?: GrammarBotEdit[]
  latency?: number
}

/**
 * Spelling categories, and everything else is grammar.
 *
 * THE VENDOR DOCUMENTS `GRMR` AND NOTHING ELSE that we have seen, so this is a
 * deliberately one-sided rule: codes known to mean spelling are listed, and an
 * unrecognised code falls to grammar rather than being dropped. A missing tab
 * is a smaller failure than a missing issue, and `rawCategory` carries the
 * original through so an unknown code can be identified from the UI instead of
 * guessed at from here.
 */
const SPELLING_CODES = new Set(['SPELL', 'SPELLING', 'TYPO', 'MISSPELLING'])

export function categoryOf(rawCategory: string | undefined): IssueCategory {
  return SPELLING_CODES.has((rawCategory ?? '').toUpperCase()) ? 'spelling' : 'grammar'
}

/**
 * Split text into pieces the API will accept, preferring a natural boundary.
 *
 * OFFSETS ARE THE WHOLE POINT. Each chunk carries the index it started at, so
 * `toIssues` can add it back and every issue ends up addressing the document
 * the user is actually looking at. Chunking without that bookkeeping is how an
 * underline lands three paragraphs from the word it belongs to.
 *
 * It breaks at a paragraph if there is one in the last fifth of the window, a
 * sentence if not, a space if neither, and mid-word only when a single
 * "word" genuinely exceeds the window -- a base64 blob pasted into a CV, say.
 * Splitting mid-sentence is not a correctness problem but it costs accuracy:
 * the checker cannot see an agreement error whose two halves land in different
 * requests.
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
 * `offset` is the chunk's start. Edits whose range is malformed are dropped
 * rather than rendered, because an issue with a backwards range would either
 * throw or silently highlight the rest of the document.
 */
export function toIssues(
  response: GrammarBotResponse,
  offset = 0
): GrammarIssue[] {
  const edits = Array.isArray(response.edits) ? response.edits : []

  return edits
    .filter(
      (edit) =>
        Number.isFinite(edit.start) &&
        Number.isFinite(edit.end) &&
        edit.end >= edit.start &&
        edit.start >= 0
    )
    .map((edit) => ({
      start: edit.start + offset,
      end: edit.end + offset,
      replace: typeof edit.replace === 'string' ? edit.replace : '',
      category: categoryOf(edit.err_cat),
      rawCategory: edit.err_cat ?? '',
      description: edit.err_desc ?? '',
    }))
}

/** Issues split into the two tabs, in document order within each. */
export function splitByCategory(issues: GrammarIssue[]): {
  spelling: GrammarIssue[]
  grammar: GrammarIssue[]
} {
  const byPosition = [...issues].sort((a, b) => a.start - b.start)
  return {
    spelling: byPosition.filter((i) => i.category === 'spelling'),
    grammar: byPosition.filter((i) => i.category === 'grammar'),
  }
}

/**
 * Apply one issue to the text it came from.
 *
 * Callers must re-check after applying rather than applying a second issue to
 * the same string: every offset after the edit has moved by the length
 * difference, so a stale issue list would corrupt the document. The panes
 * enforce this by clearing the list after an accept.
 */
export function applyIssue(text: string, issue: GrammarIssue): string {
  if (issue.start < 0 || issue.end > text.length || issue.end < issue.start) {
    return text
  }
  return text.slice(0, issue.start) + issue.replace + text.slice(issue.end)
}
