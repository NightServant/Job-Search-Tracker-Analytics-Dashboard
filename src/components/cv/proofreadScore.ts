import type { GrammarIssue } from '@/services/grammar'

/**
 * The editor score, derived from what the checker actually found.
 *
 * WORD SHOWS AN "EDITOR SCORE" AND SO DOES THIS PANE, but the number has to
 * mean something. Microsoft's is computed from correction and refinement
 * counts against document length, and this is the same idea over the same two
 * inputs -- which is only true since LanguageTool replaced GrammarBot. It is
 * still described to the reader as derived rather than handed down.
 *
 * REFINEMENTS ARE REAL NOW. Under GrammarBot they could not be: it returned
 * corrections only, so Word's clarity/conciseness/formality rows had no data
 * and the pane had to omit them rather than invent numbers. LanguageTool
 * carries `issueType: style` on its REDUNDANCY, STYLE and TYPOGRAPHY rules, so
 * `style` below is counted from findings that actually exist.
 *
 * CORRECTIONS AND REFINEMENTS WEIGH DIFFERENTLY, which is the one judgement in
 * this file. A misspelling is a mistake; a redundant phrase is a preference,
 * and plenty of good CVs are full of them deliberately. Style findings count a
 * third, so a wordy but correct document does not score like a careless one.
 *
 * ONE ISSUE PER FIFTY WORDS IS THE FLOOR, which is a judgement and is written
 * down rather than buried: at that density the document reads as unproofed, so
 * the score bottoms out instead of going negative on a long CV with many
 * problems. A clean document is 100 regardless of length.
 */

export interface ProofreadScore {
  /** 0..100, rounded. */
  value: number
  spelling: number
  grammar: number
  style: number
  words: number
}

/** Issues per word at which the score reaches zero. */
const FLOOR_DENSITY = 1 / 50

/** A style finding is a preference, not a mistake. See the docblock. */
const STYLE_WEIGHT = 1 / 3

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function proofreadScore(text: string, issues: GrammarIssue[]): ProofreadScore {
  const words = countWords(text)
  const spelling = issues.filter((i) => i.category === 'spelling').length
  const grammar = issues.filter((i) => i.category === 'grammar').length
  const style = issues.filter((i) => i.category === 'style').length

  // An empty document is not a perfect one, but it is not a flawed one
  // either, and dividing by zero words would make the score NaN.
  if (words === 0) return { value: 100, spelling, grammar, style, words }

  const weighted = spelling + grammar + style * STYLE_WEIGHT
  const density = weighted / words
  const value = Math.round(Math.max(0, 1 - density / FLOOR_DENSITY) * 100)
  return { value, spelling, grammar, style, words }
}
