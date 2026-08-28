import { cn } from '@/lib/utils'

/**
 * A pending state with no glyph.
 *
 * Lucide's Loader2 existed only to be rotated, so it was a drawing that carried
 * no information a bordered circle does not. The visible label is screen-reader
 * only: sighted users read the motion, and a spinner captioned "Loading" beside
 * a button that already says "Saving" is a duplicate.
 */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
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
