import type { GrammarIssue } from '@/services/grammar'
import { countWords } from './proofreadScore'

/**
 * The four writing signals under the editor score: formality, clarity,
 * readability, conciseness -- each a percentage with a line about it.
 *
 * WORD PUTS THESE UNDER ITS SCORE AND SO DOES THIS PANE (Gabe, 2026-09-13).
 * Two counters tell you how many things are wrong; they do not tell you how
 * the document reads. These do, and like `proofreadScore` they are described
 * to the reader as derived rather than handed down.
 *
 * COMPUTED HERE, NOT FETCHED, and that is the load-bearing decision in this
 * file. LanguageTool has no endpoint for "how formal is this" and a model
 * would answer 62 now and 58 in a minute for the same paragraph. A number
 * somebody edits their CV against has to be the same number when they ask
 * again, so all four are pure functions of the text and the findings that
 * already came back. `proofreadScore` set that precedent.
 *
 * WHAT EACH ONE ACTUALLY MEASURES, because a percentage with no stated basis
 * is a horoscope:
 *
 *   READABILITY is Flesch's two inputs -- mean sentence length and syllables
 *   per word -- weighted 60/40, rather than Flesch's own formula. See the
 *   note below for the measurement that forced that, because reaching for
 *   `206.835 - 1.015x - 84.6y` was the obvious first answer and it was wrong
 *   for this corpus.
 *
 *   CLARITY is mean sentence length plus the density of `style` findings.
 *   Both are the same complaint from different directions -- the sentence you
 *   have to read twice is usually long, and LanguageTool's REDUNDANCY and
 *   STYLE rules fire on the rest.
 *
 *   FORMALITY counts contractions, first- and second-person pronouns and a
 *   short informal-word list as a share of words. It is register, not
 *   quality: a high score is not praise, it is a statement that the document
 *   reads like a CV and not like a message.
 *
 *   CONCISENESS counts filler and hedge phrases -- "responsible for", "in
 *   order to" -- plus mean sentence length again. Padding and run-ons are the
 *   two ways a bullet stops being a bullet.
 *
 * THE THRESHOLDS BELOW ARE JUDGEMENTS, not measurements, and they are written
 * down next to the constant they set rather than buried in the arithmetic.
 * Three of the four put ordinary CV prose in the seventies and eighties, so a
 * low number means something happened rather than meaning the scale is harsh.
 *
 * FLESCH ITSELF WAS TRIED AND MEASURED AND DROPPED, and the measurement is the
 * whole argument, so it is written down rather than summarised. Run over Gabe's
 * own 949-word CV (the .docx this editor imports): 14.2 words a sentence, 2.09
 * syllables a word, reading ease 15.6 -- which through any window with a floor
 * at 30 is 0%, and 0% is not a score, it is a shrug. `proofreadScore` was
 * recalibrated on 2026-09-11 for exactly that failure and the same rule applies
 * here.
 *
 * WORSE THAN LOW, IT WAS INVERTED. The same run scored a deliberately padded
 * 46-word run-on at ease 20.4 -- BETTER than the well-written CV -- because the
 * 84.6 coefficient on syllables per word swamps everything else, and a
 * technical CV cannot avoid "TypeScript", "infrastructure", "responsibilities".
 * A readability number that ranks the run-on above the CV is not harsh, it is
 * backwards, and no choice of window fixes the ordering.
 *
 * SO THE TWO INPUTS ARE KEPT AND THE COEFFICIENTS ARE NOT. Sentence length
 * takes 60 because it is the half a person can act on -- splitting a bullet is
 * a thing you can do this afternoon -- and word length takes 40 because on a
 * technical CV most of it is vocabulary the posting itself asked for. Against
 * the same three samples that reads: the real CV 56, the padded run-on 30, a
 * list of clipped bullets 100. That is the ordering the row exists to show.
 *
 * EMPTY IS 100 ACROSS THE BOARD, the same call `proofreadScore` makes: an
 * empty document is not a flawed one, and every one of these divides by a
 * word or sentence count that would be zero.
 *
 * THREE BANDS OF COMMENTARY PER METRIC, deliberately. A sentence per integer
 * would be a hundred lines of prose nobody wrote carefully; three says the
 * only three things there are to say -- it is fine, it is drifting, act on it.
 */

export type WritingMetricId = 'formality' | 'clarity' | 'readability' | 'conciseness'

export interface WritingMetric {
  id: WritingMetricId
  label: string
  /** 0..100, rounded. */
  value: number
  /** One short line, chosen by band. See the docblock. */
  comment: string
}

/**
 * The sentence-length window readability is measured across.
 *
 * EIGHT IS FREE AND THIRTY IS FULLY PAID. A CV is mostly bullets, and a good
 * one runs eight to fourteen words; thirty is where a bullet has stopped being
 * a bullet. Wider than clarity's 18..35 window on purpose -- clarity is asking
 * whether the sentence carries one idea, this is asking whether the eye gets
 * through it on the first pass, and the eye gives up sooner.
 */
const READABLE_SENTENCE_WORDS = 8
const UNREADABLE_SENTENCE_WORDS = 30

/**
 * The word-length window, in syllables per word.
 *
 * 1.4 IS PLAIN AND 2.4 IS DENSE. Conversational English sits near 1.4;
 * Gabe's own CV measures 2.09, which is what a stack of framework names and
 * "responsibilities" does to an average. The ceiling is set above it rather
 * than at it so a genuinely impenetrable document still has somewhere lower to
 * go -- a scale whose worst realistic case is also its floor cannot tell
 * "dense" from "unreadable".
 */
const PLAIN_SYLLABLES = 1.4
const DENSE_SYLLABLES = 2.4

/** Sentence length is the half a person can act on this afternoon. */
const READABILITY_SENTENCE_WEIGHT = 60
const READABILITY_WORD_WEIGHT = 40

/**
 * Sentence lengths clarity and conciseness are measured between.
 *
 * 18 WORDS IS WHERE THE PENALTY STARTS and 35 is where it is fully paid.
 * Plain-English guidance puts the comfortable average near 15-20; 35 is the
 * length at which a sentence is reliably carrying more than one idea. Nothing
 * between the two is free, but a 22-word sentence costs very little.
 */
const EASY_SENTENCE_WORDS = 18
const HARD_SENTENCE_WORDS = 35

/**
 * The densities at which a penalty is fully paid.
 *
 * ONE FINDING PER TWENTY-FIVE WORDS, one informal marker per ten, one filler
 * phrase per forty. The informal floor is the loosest of the three on purpose:
 * "you" and "our" appear in perfectly good CV prose, so it takes roughly one
 * marker in every ten words -- a genuinely conversational paragraph -- before
 * formality bottoms out.
 */
const STYLE_FLOOR_DENSITY = 1 / 25
const INFORMAL_FLOOR_DENSITY = 1 / 10
const FILLER_FLOOR_DENSITY = 1 / 40

/**
 * The informal register markers, kept short on purpose.
 *
 * A LONG LIST WOULD BE A STYLE GUIDE, not a signal. These are the words that
 * actually turn up in a first draft written at speed; anything subtler is a
 * preference, and this number is already opinionated enough. Contractions and
 * pronouns are matched separately below -- they are patterns, not vocabulary.
 */
const INFORMAL_WORDS = new Set([
  'stuff',
  'things',
  'thing',
  'lots',
  'got',
  'gotten',
  'really',
  'very',
  'pretty',
  'basically',
  'kinda',
  'sorta',
  'awesome',
  'cool',
  'super',
  'ok',
  'okay',
])

/** First and second person: the CV convention is to imply the subject. */
const PERSONAL_PRONOUNS = new Set([
  'i',
  'me',
  'my',
  'mine',
  'myself',
  'we',
  'us',
  'our',
  'ours',
  'you',
  'your',
  'yours',
])

/** Straight and typographic apostrophes both; imported .docx text uses ’. */
const CONTRACTION = /\b[a-z]+['’](s|t|re|ve|ll|d|m)\b/g

/**
 * The padding a CV bullet can almost always lose.
 *
 * EVERY ONE OF THESE IS A VERB WAITING TO HAPPEN. "responsible for the
 * migration" is "migrated"; "in order to reduce" is "to reduce". They are
 * matched as phrases rather than words because the individual words are
 * innocent.
 */
const FILLER_PHRASES = [
  'responsible for',
  'in order to',
  'a variety of',
  'a number of',
  'due to the fact that',
  'was able to',
  'were able to',
  'the ability to',
  'in terms of',
  'tasked with',
  'helped to',
  'worked on',
  'as well as',
  'it should be noted',
]

/** Bands run high to low; the first whose floor the value clears wins. */
interface Band {
  min: number
  comment: string
}

const BANDS: Record<WritingMetricId, [Band, Band, Band]> = {
  formality: [
    { min: 80, comment: 'reads professionally throughout. nothing conversational to strip out.' },
    {
      min: 55,
      comment: 'a few contractions and first-person lines. fine for a cover letter, loose for a CV.',
    },
    { min: 0, comment: 'this reads like a message. cut the contractions and the i/we openings.' },
  ],
  clarity: [
    { min: 80, comment: 'short, direct sentences. the point lands on the first read.' },
    { min: 55, comment: 'some sentences are doing too much. a few splits would help the scan.' },
    { min: 0, comment: 'long sentences carrying several ideas each. break them at the joins.' },
  ],
  readability: [
    { min: 80, comment: 'plain professional prose. a recruiter skims this without slowing down.' },
    { min: 55, comment: 'dense in places, where long words and long sentences stack up together.' },
    { min: 0, comment: 'hard to skim. splitting the longest bullets lifts this fastest.' },
  ],
  conciseness: [
    { min: 80, comment: 'tight. most lines are earning the space they take.' },
    { min: 55, comment: 'some padding. phrases like "responsible for" are usually one strong verb.' },
    { min: 0, comment: 'wordy enough to bury the achievements. cut the hedges and the run-ons.' },
  ],
}

const LABELS: Record<WritingMetricId, string> = {
  formality: 'formality',
  clarity: 'clarity',
  readability: 'readability',
  conciseness: 'conciseness',
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** 0..100, rounded, whatever the arithmetic did on the way in. */
const percent = (n: number) => Math.round(Math.min(100, Math.max(0, n)))

/** Every band list ends at `min: 0` and `percent` clamps to >= 0, so the
 *  `find` always hits -- the non-null assertion is the type system catching up
 *  with a guarantee the data already makes, not a risk being taken. */
const commentFor = (id: WritingMetricId, value: number) =>
  BANDS[id].find((band) => value >= band.min)!.comment

const metric = (id: WritingMetricId, raw: number): WritingMetric => {
  const value = percent(raw)
  return { id, label: LABELS[id], value, comment: commentFor(id, value) }
}

/**
 * Sentences, split on terminal punctuation and on block boundaries.
 *
 * A CV IS MOSTLY NOT SENTENCES. Bullets and headings rarely end in a full
 * stop, so splitting on `.!?` alone would read an entire experience section as
 * one 400-word sentence and report clarity at zero. Newlines end a sentence
 * here for the same reason the eye treats them as one.
 */
function sentencesOf(text: string): string[] {
  return text
    .split(/[.!?]+[\s]+|[.!?]+$|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

/**
 * Syllables by vowel group, which is the standard cheap heuristic.
 *
 * IT IS WRONG ON PLENTY OF WORDS and that is acceptable: Flesch is an average
 * over a whole document, so per-word error cancels far more than it
 * accumulates. A dictionary would be exact, megabytes, and no better at the
 * document level. Silent trailing "e" is the one correction worth making,
 * because it is systematic rather than random.
 */
function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!clean) return 0
  const groups = clean.replace(/e$/, '').match(/[aeiouy]+/g)
  return Math.max(1, groups ? groups.length : 0)
}

function wordsOf(text: string): string[] {
  return text.toLowerCase().match(/[a-z'’]+/g) ?? []
}

/** How far a mean sentence length sits into the 18..35 window, 0..1. */
function sentenceStrain(meanWords: number): number {
  return clamp01((meanWords - EASY_SENTENCE_WORDS) / (HARD_SENTENCE_WORDS - EASY_SENTENCE_WORDS))
}

export function writingMetrics(text: string, issues: GrammarIssue[]): WritingMetric[] {
  const words = countWords(text)

  // Empty is 100 across the board, and every one of the divisors below would
  // be zero. See the docblock.
  if (words === 0) {
    return (['formality', 'clarity', 'readability', 'conciseness'] as const).map((id) =>
      metric(id, 100)
    )
  }

  const sentences = sentencesOf(text)
  const meanSentenceWords = words / Math.max(1, sentences.length)
  const strain = sentenceStrain(meanSentenceWords)

  const tokens = wordsOf(text)
  const lower = text.toLowerCase()

  // READABILITY. Flesch's two inputs, weighted for a CV rather than for a
  // newspaper. See the docblock for the run that ruled Flesch's own formula
  // out -- it ranked a padded 46-word run-on above a well-written CV.
  const syllables = tokens.reduce((total, word) => total + countSyllables(word), 0)
  const syllablesPerWord = syllables / Math.max(1, tokens.length)
  const lengthStrain = clamp01(
    (meanSentenceWords - READABLE_SENTENCE_WORDS) /
      (UNREADABLE_SENTENCE_WORDS - READABLE_SENTENCE_WORDS)
  )
  const wordStrain = clamp01(
    (syllablesPerWord - PLAIN_SYLLABLES) / (DENSE_SYLLABLES - PLAIN_SYLLABLES)
  )
  const readability =
    READABILITY_SENTENCE_WEIGHT * (1 - lengthStrain) + READABILITY_WORD_WEIGHT * (1 - wordStrain)

  // CLARITY. Sentence length carries two thirds of it, style findings a third:
  // a long sentence is the reason a line has to be read twice, and a
  // redundancy is only ever a contributing cause.
  const styleCount = issues.filter((issue) => issue.category === 'style').length
  const styleStrain = clamp01(styleCount / words / STYLE_FLOOR_DENSITY)
  const clarity = 100 - strain * 65 - styleStrain * 35

  // FORMALITY. Contractions, personal pronouns and the informal list, as one
  // share of the whole document.
  const contractions = lower.match(CONTRACTION)?.length ?? 0
  const informal = tokens.filter(
    (word) => PERSONAL_PRONOUNS.has(word) || INFORMAL_WORDS.has(word)
  ).length
  const formality = 100 - clamp01((contractions + informal) / words / INFORMAL_FLOOR_DENSITY) * 100

  // CONCISENESS. Filler phrases lead, because they are the part a person can
  // act on in one pass; sentence length is the remaining 40.
  const filler = FILLER_PHRASES.reduce((total, phrase) => total + (lower.split(phrase).length - 1), 0)
  const conciseness = 100 - clamp01(filler / words / FILLER_FLOOR_DENSITY) * 60 - strain * 40

  return [
    metric('formality', formality),
    metric('clarity', clarity),
    metric('readability', readability),
    metric('conciseness', conciseness),
  ]
}
