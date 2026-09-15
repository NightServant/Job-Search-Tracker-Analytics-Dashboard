// rounded-full is kept here and allowlisted in shadcnHouseRules.test.ts: a spinner is a circle.
// The 4px cap governs corners on rectangles, not circles.
import { cn } from '@/lib/utils'

/**
 * A pending state with no glyph. Renamed from `Spinner` in M5.5 Task 2, where
 * shadcn's own `spinner` -- an animated icon -- took that name.
 *
 * Both survive on purpose. This one is the right thing inside a pending button,
 * where a 14px animated glyph is not, and it is what every in-button pending
 * state in the app already uses.
 *
 * Lucide's Loader2 existed only to be rotated, so it was a drawing that carried
 * no information a bordered circle does not. The visible label is screen-reader
 * only: sighted users read the motion, and a spinner captioned "Loading" beside
 * a button that already says "Saving" is a duplicate.
 */
export function CssSpinner({
  size = 16,
  className,
  decorative = false,
}: {
  size?: number
  className?: string
  /**
   * Drops the `status` role and the "Loading" label, leaving only the motion.
   *
   * FOR WHEN SOMETHING ELSE ALREADY SAYS IT. The docblock above has always
   * argued that a spinner captioned "Loading" next to a button reading
   * "Saving" is a duplicate; `Button`'s `loadingText` is what finally made
   * that concrete, because the two labels CONCATENATE into the control's
   * accessible name. A sign-in button mid-submit announced itself as
   * "Loading Signing in...", which is not a sentence and was found by the
   * test written for the layout bug next to it.
   *
   * Default false, so a bare spinner with nothing else to speak for it still
   * announces itself -- which is most of them.
   */
  decorative?: boolean
}) {
  return (
    <span
      role={decorative ? undefined : 'status'}
      aria-hidden={decorative || undefined}
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 8)) }}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent align-middle',
        className
      )}
    >
      {!decorative && <span className="sr-only">Loading</span>}
    </span>
  )
}
