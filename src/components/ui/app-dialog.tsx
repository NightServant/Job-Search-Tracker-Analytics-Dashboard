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
 * that needs a modal -- the application form and the new-CV mode chooser, as
 * of Task 4 (M5.5).
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
 */
export interface AppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** `m` is 480px (the mode chooser); `l` is 720px (the fourteen-field form). */
  size?: 'm' | 'l'
  children: React.ReactNode
}

const MAX_WIDTH = {
  m: 'sm:max-w-[480px]',
  l: 'sm:max-w-[720px]',
} as const

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
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
          <DialogTitle className="text-heading-m text-text-primary">{title}</DialogTitle>
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
