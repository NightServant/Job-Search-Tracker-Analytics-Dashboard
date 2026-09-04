import * as React from 'react'
import { cn } from '@/lib/utils'
import { ICON_STATE_MOTION } from '@/components/icons/motion'

/**
 * A 2px rule plus a label. Not a pill.
 *
 * No fill, no dot, no radius -- the same vocabulary as the active nav item and
 * the follow-up nudge. Orange is never used here: it is the accent, and a status
 * that competes with the accent is the exact flaw this pattern replaced.
 *
 * The rule carries the colour and the label carries the meaning, so the state
 * is still readable when the hue is not: greyscale printing, a monochrome
 * display, or any of the red/green confusions that a five-colour status set
 * walks straight into.
 */
export const STATUSES = ['wishlist', 'applied', 'interviewing', 'offer', 'rejected'] as const

export type Status = (typeof STATUSES)[number]

const LABELS: Record<Status, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
}

// Written out rather than interpolated. `bg-status-${status}-mark` produces no
// CSS at all -- Tailwind scans source text, so a class it never literally sees
// is a class it never emits. This cost the token gallery its status swatches.
//
// Exported: this is the one place the five `bg-status-*-mark` classes are
// spelled out, so every consumer that needs a status colour as a solid
// swatch -- the rule here, the kanban column's legend dot, the status tab's
// legend dot -- shares one map instead of re-deriving it.
export const STATUS_MARK_CLASSES: Record<Status, string> = {
  wishlist: 'bg-status-wishlist-mark',
  applied: 'bg-status-applied-mark',
  interviewing: 'bg-status-interviewing-mark',
  offer: 'bg-status-offer-mark',
  rejected: 'bg-status-rejected-mark',
}

export interface StatusMarkerProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: Status
}

export function StatusMarker({ status, className, ...props }: StatusMarkerProps) {
  return (
    <span
      data-status={status}
      className={cn('inline-flex flex-col gap-1', className)}
      {...props}
    >
      <span className="text-label-caps uppercase text-text-secondary">{LABELS[status]}</span>
      {/*
        KEYED ON THE STATUS, so React replaces this node when the status
        changes and the one-shot `settle` animation runs again. Without the
        key the same element persists, the class never re-enters the DOM, and
        the animation would play once on first mount and never again -- which
        is the opposite of what a status CHANGE needs to announce.

        The rule is the right thing to animate rather than the label: the 2px
        rule in the status hue IS this system's status vocabulary, so a change
        of status should move the thing that carries the colour.
      */}
      <span
        key={status}
        data-status-rule
        aria-hidden
        className={cn(
          'h-[2px] w-full rounded-none',
          STATUS_MARK_CLASSES[status],
          ICON_STATE_MOTION.settle
        )}
      />
    </span>
  )
}
