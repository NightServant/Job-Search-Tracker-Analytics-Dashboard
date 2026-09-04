'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

/**
 * The system's own chrome over shadcn's `Dialog`, for every screen surface
 * that needs a modal -- the application record, the application form and the
 * new-CV mode chooser.
 *
 * There is no dialog frame anywhere in the Figma file: searching every screen
 * frame's layer names for `dialog|modal|overlay|drawer|sheet` returns
 * nothing. The one thing the design says about dialogs is the Motion
 * Specification row `smooth caret` (`43:571`), whose "where" cell reads "auth,
 * add job dialog" -- confirming one was intended, but not drawing it. So the
 * chrome here is derived from the rest of the system rather than transcribed
 * from a frame: `bg-bg-canvas`, a hairline `border-border-subtle`, `rounded-md`
 * (the 4px cap), no drop shadow, and a hairline rule under the title in place
 * of shadcn's default rounded, shadowed popup chrome.
 *
 * THE HEADER GREW TWO SLOTS for the application record, which puts company,
 * role, status and the record's actions in one bar:
 *
 * - `eyebrow` sits ABOVE the title. It is where the record's company and
 *   status marker go. Above rather than beside, because the title is the
 *   thing being named and a status rule sharing its line competes with it.
 * - `actions` sits opposite the title. It is padded clear of shadcn's own
 *   close button, which `DialogContent` pins at `top-2 right-2` -- these
 *   would otherwise sit underneath it.
 *
 * `title` widened from `string` to `ReactNode` at the same time. It still
 * renders inside `DialogTitle`, so whatever goes in is still the dialog's
 * accessible name; passing a node that contains no text would take that name
 * away, which is the one thing a caller must not do here.
 */
export interface AppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: string
  /** Rendered above the title. Metadata about the thing being shown, not a second heading. */
  eyebrow?: React.ReactNode
  /** Rendered opposite the title, clear of the built-in close button. */
  actions?: React.ReactNode
  /**
   * `m` is 480px (the mode chooser); `l` is 720px (the standalone form); `xl`
   * is 1040px (the whole application record, which carries a two-column body
   * and would be a column of slivers at `l`).
   */
  size?: 'm' | 'l' | 'xl'
  children: React.ReactNode
}

const MAX_WIDTH = {
  m: 'sm:max-w-[480px]',
  l: 'sm:max-w-[720px]',
  xl: 'sm:max-w-[1040px]',
} as const

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  eyebrow,
  actions,
  size = 'm',
  children,
}: AppDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent
        className={cn(
          'gap-0 border border-border-subtle bg-bg-canvas p-0 ring-0',
          'max-h-[85vh] w-[calc(100%-2rem)] overflow-hidden rounded-md',
          MAX_WIDTH[size]
        )}
      >
        <DialogHeader className="gap-0 p-6 pb-4">
          {eyebrow && <div className="mb-2 pr-8">{eyebrow}</div>}
          <div className="flex items-start justify-between gap-6">
            <DialogTitle className="text-heading-m text-text-primary">{title}</DialogTitle>
            {actions && <div className="shrink-0 pr-8">{actions}</div>}
          </div>
          {description && (
            <DialogDescription className="text-body-s text-text-muted">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <Separator />
        <div className="max-h-[calc(85vh-6rem)] overflow-y-auto p-6">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
