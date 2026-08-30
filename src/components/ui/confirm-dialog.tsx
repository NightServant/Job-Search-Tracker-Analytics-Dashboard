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
 */
export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: string
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <AlertDialogContent className="gap-4 rounded-md border border-border-subtle bg-bg-canvas p-6 text-left ring-0 sm:max-w-[420px]">
        <AlertDialogHeader className="grid-rows-none place-items-start gap-2 text-left">
          <AlertDialogTitle className="text-heading-m text-text-primary">{title}</AlertDialogTitle>
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
