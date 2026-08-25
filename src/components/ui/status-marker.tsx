import * as React from 'react'
import { cn } from '@/lib/utils'

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
const RULES: Record<Status, string> = {
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
      <span
        data-status-rule
        aria-hidden
        className={cn('h-[2px] w-full rounded-none', RULES[status])}
      />
    </span>
  )
}
