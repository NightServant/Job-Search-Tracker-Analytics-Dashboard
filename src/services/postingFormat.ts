/**
 * Turning a scraped job posting into something readable, with no model
 * involved.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE MODEL. Text pulled off a page arrives as
 * one run-on block: bullet glyphs mid-sentence, headings welded to the line
 * after them, the same line repeated where a site rendered it twice. That is a
 * mechanical problem with a mechanical answer, and a language model is the
 * wrong tool for it -- it costs a network round trip, it is unavailable on a
 * deployment with no provider configured, and it can quietly reword something
 * while it tidies.
 *
 * So this runs ALWAYS, and the model only ever sees text that is already
 * clean. If no provider is configured the user still gets this, which is most
 * of the value.
 *
 * NOTHING HERE INVENTS OR REMOVES MEANING. Every transformation is whitespace,
 * punctuation or de-duplication; no word is rewritten. `formatPostingText` is
 * safe to run on text a user typed themselves.
 */

/** Bullet glyphs boards use, normalised to one. */
const BULLETS = /^[\s]*[•·▪▫◦‣⁃∙*–—]\s+/

/** A heading like "Qualifications:" that a scrape welded to the next sentence. */
const INLINE_HEADING =
  /(^|[.!?]\s|\n)((?:[A-Z][A-Za-z/&' ]{2,40}))(:)\s*(?=[A-Z0-9])/g

function collapseWhitespace(text: string): string {
  return (
    text
      .replace(/\r\n?/g, '\n')
      // Non-breaking and zero-width space, both common in scraped markup.
      .replace(/[ ​]/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
  )
}

/**
 * Drops a line that repeats the one before it.
 *
 * Sites render the same heading twice (once for mobile, once for desktop) and
 * a text extraction picks up both. Only CONSECUTIVE duplicates go: a posting
 * that legitimately repeats a word later keeps it.
 */
function dropAdjacentDuplicates(lines: string[]): string[] {
  const out: string[] = []
  for (const line of lines) {
    const previous = out[out.length - 1]
    if (previous !== undefined && previous.trim() && previous.trim() === line.trim()) continue
    out.push(line)
  }
  return out
}

export function formatPostingText(raw: string): string {
  if (!raw || !raw.trim()) return ''

  let text = collapseWhitespace(raw)

  // A heading welded to the sentence after it becomes its own line.
  text = text.replace(INLINE_HEADING, (_all, lead: string, heading: string, colon: string) => {
    return `${lead === '\n' || lead === '' ? lead : `${lead.trim()}\n`}\n${heading.trim()}${colon}\n`
  })

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    // One bullet character, so a list looks like a list whatever the source used.
    .map((line) => (BULLETS.test(line) ? line.replace(BULLETS, '- ') : line))

  const deduped = dropAdjacentDuplicates(lines)

  return (
    deduped
      .join('\n')
      // At most one blank line between blocks.
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}

/**
 * The first few sentences, as a fallback summary.
 *
 * EXTRACTIVE ON PURPOSE: it can only return text that was already in the
 * posting, so it cannot invent. It is what the digest falls back to when no
 * model is configured, and when a model's summary fails the grounding check.
 */
export function extractiveSummary(text: string, sentences = 2): string {
  const flat = formatPostingText(text).replace(/\n+/g, ' ')
  if (!flat) return ''
  const parts = flat.match(/[^.!?]+[.!?]+(\s|$)/g)
  if (!parts?.length) return flat.slice(0, 240).trim()
  return parts.slice(0, sentences).join('').trim()
}
