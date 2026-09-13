import type { AtsResult } from '@/components/ui/ats-check'

/**
 * The ATS thresholds and the sentence each band gets.
 *
 * SPLIT OUT OF `ats-verdict.tsx` for the reason `button-variants.ts` and
 * `progress-tones.ts` were split out of theirs: a file that exports both
 * components and constants breaks fast refresh, so the constants move and the
 * components stay. Nothing else about them changed.
 *
 * They live beside the components rather than in `services/` because they are
 * COPY -- the wording a reader sees under the score -- and the number they
 * switch on is a presentation threshold, not a fact about the match.
 */

/** 80 and 50: loosely "most requirements met" and "roughly half". */
export function verdictFor(score: number): AtsResult {
  if (score >= 80) return 'pass'
  if (score >= 50) return 'review'
  return 'fail'
}

export const VERDICT_COPY: Record<AtsResult, { label: string; detail: string; className: string }> =
  {
    pass: {
      label: 'strong match',
      detail: 'most of what the posting asks for is already in this CV.',
      className: 'text-verdict-pass',
    },
    review: {
      label: 'fair match',
      detail: 'about half the posting’s vocabulary shows up. The missing list is where to start.',
      className: 'text-verdict-review',
    },
    fail: {
      label: 'weak match',
      detail: 'this CV and this posting share little language. Tailor it before sending.',
      className: 'text-verdict-fail',
    },
  }
