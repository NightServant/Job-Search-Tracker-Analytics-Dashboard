/**
 * The Datamuse boundary: a thesaurus for the word under the caret.
 *
 * WHY THIS ONE AND NOT THE OTHERS. Gabe asked for more free, open APIs to
 * enhance the editor, so four were probed live from the browser before
 * anything was built (2026-09-11):
 *
 *   DATAMUSE -- 200, keyless, CORS open, and it tags results with part of
 *   speech, which is the whole reason it is usable. Adopted.
 *   FREE DICTIONARY (dictionaryapi.dev) -- fails CORS from the browser, so it
 *   would need a proxy for definitions nobody asked for. Rejected.
 *   `rel_trg=developer` -- "philanthropist, preview, publisher, api, ios,
 *   xbox". Association, not relevance. Rejected.
 *   `sp=recieve` -- returns "recieve" itself first. It is a spelled-like
 *   index, not a speller. Rejected.
 *
 * ONE FEATURE, DONE PROPERLY, rather than four endpoints wired up because
 * they exist.
 *
 * PART OF SPEECH IS THE POINT. `ml=managed` returns "management" (noun),
 * "accomplished" (adjective) and "administered" (verb) in one list. A CV
 * writer replacing "managed" wants a verb; swapping in the noun produces "I
 * management the team". Filtering on the tag is what turns a word-association
 * endpoint into a thesaurus, and it is why the raw response is not simply
 * handed to the UI.
 *
 * DATAMUSE TAGS PAST PARTICIPLES AS ADJECTIVES, which is worth knowing before
 * this looks like a bug. Run live against "managed", the dominant tag is
 * `adj` and the list comes back as accomplished / achieved / addressed /
 * applied / arranged -- every one of which is what a CV bullet actually wants.
 * The heuristic picking `adj` over `v` there is not a miss; the words are
 * right, and what matters is that "management" and "direction" are gone.
 *
 * NO KEY, NO PROXY, CALLED FROM THE BROWSER. Same reasoning as LanguageTool:
 * there is no secret to protect, and Datamuse rate limits per IP, so routing
 * every user through one server address would be a lower ceiling than each
 * using their own.
 */

export const DATAMUSE_ENDPOINT = 'https://api.datamuse.com/words'

/** The parts of speech Datamuse tags, reduced to what a CV cares about. */
export type PartOfSpeech = 'verb' | 'noun' | 'adjective' | 'adverb' | 'unknown'

export interface DatamuseWord {
  word: string
  score?: number
  tags?: string[]
}

const TAG_TO_POS: Record<string, PartOfSpeech> = {
  v: 'verb',
  n: 'noun',
  adj: 'adjective',
  adv: 'adverb',
}

export function posOf(tags: string[] | undefined): PartOfSpeech {
  for (const tag of tags ?? []) {
    const pos = TAG_TO_POS[tag]
    if (pos) return pos
  }
  return 'unknown'
}

/**
 * A single word, or null when the selection is not one.
 *
 * A THESAURUS ONLY MAKES SENSE FOR ONE WORD. Handing Datamuse a sentence
 * returns associations with the whole phrase, which reads as nonsense next to
 * a selection the user thinks of as "this word". Anything with whitespace in
 * it, or with no letters, is refused rather than sent.
 */
export function singleWord(raw: string): string | null {
  const word = raw.trim()
  if (!word || /\s/.test(word)) return null
  const cleaned = word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
  if (cleaned.length < 3) return null
  return /^[\p{L}'-]+$/u.test(cleaned) ? cleaned.toLowerCase() : null
}

export interface Synonym {
  word: string
  pos: PartOfSpeech
}

/**
 * Rank and filter the raw response.
 *
 * SAME PART OF SPEECH FIRST, and only that if there are enough of them. The
 * original word's own part of speech is not in the response -- Datamuse
 * describes the RESULTS, not the query -- so it is inferred from the most
 * common tag among them, which is right far more often than a hard-coded
 * guess and costs nothing.
 *
 * THE WORD ITSELF IS DROPPED. `ml=` happily returns the query, and a
 * suggestion that changes nothing is noise in a list of six.
 */
export function toSynonyms(
  results: DatamuseWord[],
  original: string,
  limit = 8
): Synonym[] {
  const words = (Array.isArray(results) ? results : [])
    .filter((r) => typeof r.word === 'string' && r.word.toLowerCase() !== original.toLowerCase())
    .map((r) => ({ word: r.word, pos: posOf(r.tags) }))

  // The dominant part of speech among the results, ignoring untagged ones.
  const counts = new Map<PartOfSpeech, number>()
  for (const w of words) {
    if (w.pos !== 'unknown') counts.set(w.pos, (counts.get(w.pos) ?? 0) + 1)
  }
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  const matching = dominant ? words.filter((w) => w.pos === dominant) : []
  // Fall back to everything rather than showing an empty panel over a word
  // Datamuse simply tagged sparsely.
  return (matching.length >= 3 ? matching : words).slice(0, limit)
}

/**
 * Preserve the original's capitalisation on a replacement.
 *
 * Selecting "Managed" at the start of a bullet and taking "directed" should
 * give "Directed". Datamuse always answers in lower case, so without this every
 * accepted suggestion quietly lower-cases the first word of a line.
 */
export function matchCase(original: string, replacement: string): string {
  if (!original || !replacement) return replacement
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase()
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1)
  }
  return replacement
}

export function thesaurusUrl(word: string, max = 20): string {
  const params = new URLSearchParams({ ml: word, max: String(max) })
  return `${DATAMUSE_ENDPOINT}?${params}`
}
