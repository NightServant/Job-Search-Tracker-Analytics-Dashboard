/**
 * The colour sets a `ProgressTrack` step can wear.
 *
 * A SEPARATE FILE for the same reason `button-variants.ts` is one: a module
 * that exports both a component and a constant breaks Fast Refresh, and
 * `react-refresh/only-export-components` says so on every save. The
 * application pipeline's five status tones live with the pipeline, since they
 * are specific to it; this is the default every other tracker uses.
 *
 * EVERY CLASS IS A COMPLETE LITERAL. Tailwind reads class names as strings out
 * of the source, so a tone built as `bg-${token}` would be purged and the
 * connector would render colourless.
 */
export interface ProgressTone {
  /** The connector, and the ring on the node you are at. */
  line: string
  /** The node's outline once it has been reached. */
  edge: string
  /** The icon and the heading once reached. */
  ink: string
  /** The node's centre on the step you are at. */
  tint: string
}

export const ACCENT_TONE: ProgressTone = {
  line: 'bg-accent-default',
  edge: 'border-accent-default',
  ink: 'text-accent-default',
  tint: 'bg-accent-default/10',
}
