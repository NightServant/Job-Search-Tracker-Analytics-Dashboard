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
 * punctuation, casing or de-duplication; no word is rewritten and no sentence
 * is reordered. `formatPostingText` is safe to run on text a user typed
 * themselves.
 *
 * MAKING IT READ LIKE A PERSON WROTE IT. Job adverts shout -- `URGENT HIRING!!!`,
 * `QUALIFICATIONS:`, rows of `=====` between sections, an emoji before every
 * bullet. None of that is information; it is a page trying to be noticed, and
 * it arrives in the box where the reader now has to live with it. Softening it
 * is the same class of change as normalising a bullet glyph: the words survive
 * exactly, and what goes is the decoration around them.
 */

/** Bullet glyphs boards use, normalised to one. */
const BULLETS = /^[\s]*[•·▪▫◦‣⁃∙*–—]\s+/

/**
 * A heading like "Qualifications:" that a scrape welded onto the end of the
 * previous sentence.
 *
 * ONLY AFTER A SENTENCE ENDS, never at the start of a line. A line that already
 * begins `Salary: PHP 50,000` is a label and its value, and breaking it in two
 * makes it harder to read, not easier -- which is what the first version did.
 */
const INLINE_HEADING = /([.!?]\s)((?:[A-Z][A-Za-z/&' ]{2,40}))(:)\s*(?=[A-Z0-9])/g

/** A line of `====`, `----`, `****` or `~~~~` used as a divider. */
const DECORATIVE_RULE = /^[\s]*[=~*_·—–-]{3,}[\s]*$/

/** Emoji and symbol decoration, at either end of a line. */
const EMOJI = '[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{FE0F}\\u{2B00}-\\u{2BFF}]'
const LEADING_DECORATION = new RegExp(`^[\\s]*(?:${EMOJI}+[\\s]*)+`, 'u')
const TRAILING_DECORATION = new RegExp(`(?:[\\s]*${EMOJI}+)+[\\s]*$`, 'u')

/**
 * A line that is shouting: all caps, more than one word, and not an acronym.
 *
 * `QUALIFICATIONS:` becomes `Qualifications:`. `PHP`, `AWS` and `CSS` are left
 * exactly alone -- a word of four characters or fewer is far more likely to be
 * a technology than a raised voice, and getting that wrong would rename a
 * skill.
 *
 * EXCEPT WHEN THE SHORT WORD IS AN ORDINARY ONE. `AND`, `FOR` and `THE` are
 * three letters too, and leaving them shouting produced
 * `Qualifications AND Requirements:` -- half-corrected, which reads worse than
 * either extreme.
 */
const SHORT_WORDS = new Set([
  'and', 'or', 'the', 'for', 'to', 'of', 'in', 'on', 'at', 'by', 'with', 'a',
  'an', 'is', 'are', 'we', 'you', 'our', 'your', 'as', 'be', 'all', 'any',
  'new', 'now', 'not', 'but', 'per', 'via', 'if', 'it', 'its', 'this', 'that',
])

function softenShouting(line: string): string {
  const words = line.split(/\s+/).filter(Boolean)
  if (words.length < 2) return line
  const letters = line.replace(/[^A-Za-z]/g, '')
  if (letters.length < 4) return line
  if (letters !== letters.toUpperCase()) return line

  return words
    .map((word) => {
      // Keep short all-caps tokens: they are acronyms, not emphasis.
      const bare = word.replace(/[^A-Za-z]/g, '')
      if (bare.length > 0 && bare.length <= 4 && !SHORT_WORDS.has(bare.toLowerCase())) {
        return word
      }
      return word.charAt(0) + word.slice(1).toLowerCase()
    })
    .join(' ')
}

function collapseWhitespace(text: string): string {
  return (
    text
      .replace(/\r\n?/g, '\n')
      // Non-breaking and zero-width space, both common in scraped markup.
      .replace(/[ ​]/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      // `word ,word` and `word :` -- an artefact of pulling text out of
      // markup, and something no person types.
      .replace(/\s+([,.;:!?])/g, '$1')
      // `!!!` and `???` are the advert raising its voice, not punctuation.
      .replace(/([!?])\1{1,}/g, '$1')
      // Runs of dots that are not an ellipsis.
      .replace(/\.{4,}/g, '...')
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
    return `${lead.trim()}\n\n${heading.trim()}${colon}\n`
  })

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    // Decoration first, so a bullet hidden behind an emoji is still found.
    .map((line) => line.replace(LEADING_DECORATION, '').replace(TRAILING_DECORATION, ''))
    .filter((line) => !DECORATIVE_RULE.test(line))
    // One bullet character, so a list looks like a list whatever the source used.
    .map((line) => (BULLETS.test(line) ? line.replace(BULLETS, '- ') : line))
    .map(softenShouting)

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
export function extractiveSummary(
  text: string,
  sentences = 2,
  /**
   * Sentences to step over.
   *
   * THE FALLBACK INHERITS THE ADVERT WITHOUT THIS. A posting that opens "An
   * exciting opportunity for a rockstar engineer!" hands its first sentence
   * straight to the summary, so rejecting the model's brochure copy only to
   * print the posting's own was no improvement. The caller decides what
   * counts as selling; this just skips it.
   */
  skip?: (sentence: string) => boolean
): string {
  const flat = formatPostingText(text).replace(/\n+/g, ' ')
  if (!flat) return ''
  const parts = flat.match(/[^.!?]+[.!?]+(\s|$)/g)
  if (!parts?.length) return flat.slice(0, 240).trim()

  const usable = skip ? parts.filter((part) => !skip(part)) : parts
  // Every sentence sells: the posting's own words still beat nothing.
  const chosen = usable.length ? usable : parts
  return chosen.slice(0, sentences).join('').trim()
}
