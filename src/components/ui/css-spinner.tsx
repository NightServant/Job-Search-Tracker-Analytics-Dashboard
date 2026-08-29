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
export function CssSpinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 8)) }}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent align-middle',
        className
      )}
    >
      <span className="sr-only">Loading</span>
    </span>
  )
}
