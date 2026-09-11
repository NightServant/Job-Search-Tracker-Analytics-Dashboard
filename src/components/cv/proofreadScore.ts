import type { GrammarIssue } from '@/services/grammar'

/**
 * The editor score, derived from what the checker actually found.
 *
 * WORD SHOWS AN "EDITOR SCORE" AND SO DOES THIS PANE, but the number has to
 * mean something. Microsoft's is computed from correction and refinement
 * counts against document length; GrammarBot returns corrections only, so this
 * is the same idea over the half of the inputs that exist, and it is described
 * to the reader as what it is.
 *
 * WHAT IS DELIBERATELY NOT HERE: Word's Refinements block -- clarity,
 * conciseness, formality, vocabulary. GrammarBot has no notion of any of them.
 * Rendering those rows with numbers would mean inventing the numbers, and a
 * proofreading tool that makes up its own findings is worse than one that
 * shows four rows instead of eleven. The pane omits the section and says why.
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
  words: number
}

/** Issues per word at which the score reaches zero. */
const FLOOR_DENSITY = 1 / 50

export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function proofreadScore(text: string, issues: GrammarIssue[]): ProofreadScore {
  const words = countWords(text)
  const spelling = issues.filter((i) => i.category === 'spelling').length
  const grammar = issues.filter((i) => i.category === 'grammar').length

  // An empty document is not a perfect one, but it is not a flawed one
  // either, and dividing by zero words would make the score NaN.
  if (words === 0) return { value: 100, spelling, grammar, words }

  const density = issues.length / words
  const value = Math.round(Math.max(0, 1 - density / FLOOR_DENSITY) * 100)
  return { value, spelling, grammar, words }
}
