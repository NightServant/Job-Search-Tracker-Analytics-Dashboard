import * as React from "react"

import { cn } from "@/lib/utils"
import { icons, type IconName } from "@/components/icons"

/**
 * Installed because Gabe asked for the whole catalogue, not because a screen
 * needs it. Restyled to this system: no shadow, radius at the 4px cap, and a
 * hairline `border-border-subtle` rule in place of shadcn's `ring-1
 * ring-foreground/10`.
 *
 * Note what that leaves: a restyled card is very close to a plain bordered div.
 * Screens should prefer `PanelSection`, which supplies the heading, the
 * hairline and the failed-read treatment, and is what every existing screen
 * already composes.
 *
 * `CardTitle` TAKES AN `icon` (2026-09-05, Gabe's ask). It is a marker for the
 * card, not a control and not information: `aria-hidden`, muted, and 16px
 * against a 16px title, so it reads as punctuation rather than as a second
 * thing on the line. On a grid of five cards it is what lets somebody find the
 * one they want without reading five headings -- which is the whole and only
 * argument for it.
 *
 * It is a NAME, not a picture. `icon="Calendar"` on "upcoming events" is worth
 * having; a decorative glyph chosen because the row looked bare is the thing
 * this system spent M4 removing.
 */

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-md border border-border-subtle bg-card py-(--card-spacing) text-sm text-card-foreground [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-md *:[img:last-child]:rounded-b-md",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-2 rounded-t-md px-(--card-spacing) has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        // MOBILE-FIRST HERE TOO, for the same reason as the columns below.
        // Once the action stacks under the description rather than sitting
        // beside the title, a 4px gap puts three unrelated lines in one block;
        // beside it, 4px is right. So the roomier value is the base and the
        // tight one arrives with the second column, rather than a `@max-sm`
        // override of a base -- which is the shape that failed before.
        "@sm/card-header:gap-1",
        // MOBILE-FIRST, AND THE ORDER IS THE WHOLE FIX.
        //
        // This began as a two-column rule with an `@max-sm` override to
        // collapse it, and the override NEVER WON: both are single-class
        // specificity, so whichever Tailwind emits last takes it, and the
        // plain `has-` rule did. Worse, the matching reset on `CardAction`
        // DID apply -- so the action stopped occupying (row 1, col 2), the
        // description auto-placed into the hole it left, and every card on a
        // phone rendered its heading and its description SIDE BY SIDE in two
        // narrow columns. Measured 2026-09-06: a 333px header still computing
        // `89.8px 207.2px`.
        //
        // There is now exactly ONE `grid-template-columns` declaration per
        // width, so nothing races. Stacked by default; two columns only once
        // the header is wide enough to seat them.
        //
        // A CONTAINER query, not a viewport one: the same card is full-width
        // in one column and half-width in two at identical viewports, so only
        // its own width can answer this.
        "@sm/card-header:has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({
  className,
  icon,
  children,
  ...props
}: React.ComponentProps<"div"> & { icon?: IconName }) {
  const Icon = icon ? icons[icon] : null
  return (
    <div
      data-slot="card-title"
      className={cn(
        "flex items-center gap-2 text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    >
      {Icon && <Icon size={16} aria-hidden className="shrink-0 text-text-muted" />}
      {children}
    </div>
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        // Mobile-first, matching CardHeader: auto-placed after the
        // description by default, pinned into the second column only once that
        // column exists. One rule per width rather than a base rule plus an
        // override -- see CardHeader for what the override cost.
        "justify-self-start pt-1",
        "@sm/card-header:col-start-2 @sm/card-header:row-span-2 @sm/card-header:row-start-1 @sm/card-header:self-start @sm/card-header:justify-self-end @sm/card-header:pt-0",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-md border-t bg-muted/50 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
