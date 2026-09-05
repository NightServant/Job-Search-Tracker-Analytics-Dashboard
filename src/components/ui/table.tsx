"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * `stacked` turns each row into its own block below 640px: the header row is
 * taken out of the flow and every cell prints its own label instead, so a
 * six-column table becomes a readable list of six labelled lines per record
 * rather than a table you have to drag sideways to read.
 *
 * The switch is CSS, in `index.css` under `[data-stacked]`, not a second React
 * tree. One markup means the desktop table and the phone list can never drift
 * apart, and every test that queries rows keeps finding the same nodes at
 * every width.
 *
 * `sticky` is the other half, for tables that stay tables: it pins the first
 * column so the row is still identifiable once it has been scrolled sideways.
 * Cells opt in per-table via `TableCell`'s own `sticky` prop, because only the
 * FIRST column may take it and this component cannot know which cell that is.
 *
 * ROLES ARE EXPLICIT on every part. `display: block` strips a table of its
 * implicit ARIA semantics -- a stacked table with no roles is announced as a
 * pile of generic groups, which is the standard, silent failure of this
 * pattern. Declared unconditionally rather than only when stacked: they are
 * redundant-but-correct at desktop widths, and a role that appears at one
 * breakpoint is a role nobody tests.
 */
function Table({
  className,
  stacked = false,
  ...props
}: React.ComponentProps<"table"> & { stacked?: boolean }) {
  return (
    <div
      data-slot="table-container"
      data-stacked={stacked ? "" : undefined}
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        role="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      role="rowgroup"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      role="rowgroup"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      role="rowgroup"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      role="row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({
  className,
  sticky = false,
  ...props
}: React.ComponentProps<"th"> & { sticky?: boolean }) {
  return (
    <th
      data-slot="table-head"
      role="columnheader"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        // `inherit` rather than a token: this cell has to paint the SAME fill
        // as the header row it sits in, and that fill is set per table (the
        // applications header wears the accent band). A hardcoded colour here
        // would show as a patch of the wrong shade the moment a table styles
        // its own header.
        sticky && "sticky left-0 z-20 bg-[inherit]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  label,
  sticky = false,
  ...props
}: React.ComponentProps<"td"> & {
  /**
   * The column this cell belongs to, printed beside the value once the table
   * stacks. Without it a stacked row is a column of unlabelled values.
   */
  label?: string
  /** First column only -- pinned while the rest of the row scrolls under it. */
  sticky?: boolean
}) {
  return (
    <td
      data-slot="table-cell"
      role="cell"
      data-label={label}
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        // Inherits the row's fill for the same reason TableHead does -- here it
        // is the zebra banding that would otherwise scroll out from under the
        // pinned column.
        sticky && "sticky left-0 z-10 bg-[inherit]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
