import { cn } from "@/lib/utils"
import { LoaderCircleIcon } from "@/components/icons/loader-circle"

/**
 * base-nova ships this as the registry's icon shim, resolving to lucide's
 * Loader2.
 * Resolved to AnimateIcons' loader-circle, whose root element is a <div>
 * wrapping the <svg> -- so the props type is the icon's, not
 * React.ComponentProps<"svg">, and the size class is paired with its
 * descendant form so it reaches the glyph rather than the wrapper.
 *
 * M4's CSS-border spinner survives as CssSpinner in css-spinner.tsx; it is
 * still the right thing inside a pending button, where a 14px animated icon
 * is not.
 */
function Spinner({
  className,
  ...props
}: React.ComponentProps<typeof LoaderCircleIcon>) {
  return (
    <LoaderCircleIcon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 [&_svg]:size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
