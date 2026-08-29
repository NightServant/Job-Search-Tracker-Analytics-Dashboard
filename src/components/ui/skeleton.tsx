import { cn } from "@/lib/utils"

/**
 * `bg-bg-inset` rather than shadcn's `bg-muted`: the two resolve to the same
 * colour through the alias in index.css, but naming the semantic token keeps
 * the surface readable when the legacy block is deleted in Task 11.
 *
 * The pulse cycle is redefined in index.css to the 1200ms ease-in-out the Figma
 * motion spec names (node 43:523), not Tailwind's 2s default.
 */

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-bg-inset", className)}
      {...props}
    />
  )
}

export { Skeleton }
