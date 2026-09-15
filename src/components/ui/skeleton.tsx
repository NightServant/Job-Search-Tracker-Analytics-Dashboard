import { cn } from "@/lib/utils"

/**
 * `bg-bg-inset` rather than shadcn's `bg-muted`: the two resolve to the same
 * colour through the alias in index.css, but naming the semantic token keeps
 * the surface readable when the legacy block is deleted in Task 11.
 *
 * The pulse cycle is redefined in index.css to the 1200ms ease-in-out the Figma
 * motion spec names (node 43:523), not Tailwind's 2s default.
 *
 * `animate-shimmer` JOINED IT ON 2026-09-15 ("add a premium feel to it") and
 * the two are not redundant. The pulse says "this is not real yet"; the sweep
 * says "and something is actively happening". A slow opacity pulse on its own
 * is what a page looks like when it has quietly stopped working -- the
 * difference between waiting and abandoned is motion that TRAVELS.
 *
 * Both are defined in index.css, both are `transform`/`opacity` only so a
 * table rendering two hundred of these cannot reflow, and both are removed
 * entirely under `prefers-reduced-motion` -- leaving the block its flat
 * `bg-bg-inset`, which carries all the information a skeleton ever had.
 *
 * The sheen colour is a per-theme token rather than a fixed white for the
 * reason spelled out beside it: the value that reads as a highlight on the
 * light palette reads as a flashlight on the dark one.
 */

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse animate-shimmer rounded-md bg-bg-inset", className)}
      {...props}
    />
  )
}

export { Skeleton }
