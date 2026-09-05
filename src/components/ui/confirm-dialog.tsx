'use client'

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { icons, type IconName } from '@/components/icons'
import { ICON_STATE_MOTION } from '@/components/icons/motion'
import { cn } from '@/lib/utils'

/**
 * The replacement for every `window.confirm` site in the app (Task 4, M5.5).
 * A native `confirm()` is unstyled, unthemeable and untestable without
 * stubbing a global -- the same defect class as the dialogs this task
 * restores.
 *
 * Deliberately an `alertdialog`, not a plain `Dialog`: it interrupts and
 * requires an explicit choice, and does not dismiss on an outside click --
 * `window.confirm` had that property and a plain modal does not, so a
 * destructive confirmation staying an alertdialog is what keeps this a
 * lateral move rather than a quiet downgrade.
 *
 * `destructive` paints the confirm control with `--color-destructive`, which
 * is mapped to `--color-status-rejected-solid` (Task 2) -- never the accent,
 * which stays reserved for "the current action," not "the dangerous one."
 *
 * IT ALSO PICKS THE GLYPH, and here the glyph is not decoration. Gabe asked
 * for icons on dialog headings (2026-09-05); on this dialog the heading is a
 * question with consequences, so a destructive one gets `AlertCircle` in
 * `status-rejected-mark` and the one-shot `refuse` shake. That is the same
 * treatment PanelSection gives a failed read, and it means "this deletes
 * something" is said in colour and motion as well as in words -- for the
 * person who has already stopped reading the body text.
 *
 * A non-destructive confirmation gets a muted `Info` instead, and a caller can
 * name its own with `icon`. The glyph sits OUTSIDE `AlertDialogTitle`, so it
 * stays out of the name the dialog is announced by.
 */
export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: string
  confirmLabel: string
  destructive?: boolean
  /** Overrides the glyph `destructive` would otherwise choose. */
  icon?: IconName
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  destructive = false,
  icon,
  onConfirm,
}: ConfirmDialogProps) {
  const Icon = icons[icon ?? (destructive ? 'AlertCircle' : 'Info')]
  return (
    <AlertDialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <AlertDialogContent className="gap-4 rounded-md border border-border-subtle bg-bg-canvas p-6 text-left ring-0 sm:max-w-[420px]">
        <AlertDialogHeader className="grid-rows-none place-items-start gap-2 text-left">
          <div className="flex items-start gap-2.5">
            <Icon
              size={18}
              aria-hidden
              className={cn(
                'mt-0.5 shrink-0',
                destructive
                  ? cn('text-status-rejected-mark', ICON_STATE_MOTION.refuse)
                  : 'text-text-muted'
              )}
            />
            <AlertDialogTitle className="text-heading-m text-text-primary">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-body-s text-text-muted">
            {body}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="-mx-0 -mb-0 border-t-0 bg-transparent p-0">
          <AlertDialogCancel variant="secondary">cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void onConfirm()}
            className={cn(
              destructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : 'bg-accent-default text-accent-on-accent hover:bg-accent-hover'
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
