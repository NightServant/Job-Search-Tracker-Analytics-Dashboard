/**
 * A failed metric read, as a sentence a panel can show.
 *
 * ITS OWN MODULE so `AnalyticsPanel` exports components and nothing else --
 * the same `react-refresh/only-export-components` rule that put
 * `button-variants.ts` and `progress-tones.ts` in theirs.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'could not load this panel.'
}
