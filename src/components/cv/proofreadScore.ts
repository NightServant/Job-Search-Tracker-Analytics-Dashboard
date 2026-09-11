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

/**
 * Issues per word at which the score reaches zero.
 *
 * RECALIBRATED FROM 1-IN-50 ON 2026-09-11, because the old floor reported 0%
 * on a real CV and 0% is not a score, it is a shrug. Measured on Gabe's own
 * document: 949 words, 26 spelling and 24 style findings, which weighs 34 and
 * works out at one issue per 28 words. Under a 1-in-50 floor anything past 2%
 * density is zero, so a document a person would call "needs a proofread" and
 * a document that is genuinely unreadable both scored the same.
 *
 * 1-in-12 is the floor now. It puts that CV at 57%, which is the shape of
 * answer the number is for: bad enough to act on, far from hopeless. A
 * document where one word in twelve is flagged really has nothing left to
 * distinguish.
 *
 * WORTH KNOWING WHEN READING THE NUMBER: a technical CV inflates the spelling
 * count. LanguageTool has no dictionary entry for React, Next.js, shadcn/UI,
 * Laravel or Tarlac, so it flags them, and roughly two thirds of that 26 were
 * proper nouns rather than mistakes. That is what `ignore everywhere` is for,
 * and it is why spelling is not weighted above style any further.
 */
const FLOOR_DENSITY = 1 / 12

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
