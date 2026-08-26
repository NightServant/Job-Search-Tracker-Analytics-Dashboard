'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { STATUSES, type Status } from '@/components/ui/status-marker'

export type StatusTabValue = Status | 'all'

const LABELS: Record<StatusTabValue, string> = {
  all: 'All',
  wishlist: 'Wishlist',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
}

export const STATUS_TABS: StatusTabValue[] = ['all', ...STATUSES]

/**
 * The mobile substitute for the kanban's five columns.
 *
 * These are real tabs, not styled divs: `role="tab"` with `aria-selected` on a
 * `role="tablist"`. A screen reader on the list has no columns to fall back
 * on, so "which slice am I looking at" has to be in the accessibility tree
 * rather than only in the rule under the active label.
 *
 * The active marker is a 2px accent rule, the same vocabulary the nav item
 * uses for "this one". It is deliberately NOT a status colour: the tab says
 * where you are, not what state an application is in, and colouring it by
 * status would put a sixth meaning on the five-hue set.
 */
export interface StatusTabsProps {
  value: StatusTabValue
  onChange: (value: StatusTabValue) => void
  counts: Record<StatusTabValue, number>
  panelId?: string
  className?: string
}

export function StatusTabs({ value, onChange, counts, panelId, className }: StatusTabsProps) {
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([])

  // Roving tabindex means Tab only ever reaches the selected tab -- the ARIA
  // APG requires the arrow keys (plus Home/End) to move both focus and
  // selection among the rest, or five of the six statuses are unreachable
  // from the keyboard.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = STATUS_TABS.indexOf(value)
    let nextIndex: number
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % STATUS_TABS.length
        break
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + STATUS_TABS.length) % STATUS_TABS.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = STATUS_TABS.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    onChange(STATUS_TABS[nextIndex])
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Filter applications by status"
      onKeyDown={handleKeyDown}
      className={cn('-mx-4 flex gap-1 overflow-x-auto px-4', className)}
    >
      {STATUS_TABS.map((tab, index) => {
        const selected = tab === value
        return (
          <button
            key={tab}
            ref={(node) => {
              tabRefs.current[index] = node
            }}
            type="button"
            role="tab"
            id={`status-tab-${tab}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab)}
            className={cn(
              'relative flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap px-3',
              'text-label-caps uppercase transition-colors duration-[--duration-fast]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default',
              selected ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
            )}
          >
            {LABELS[tab]}
            <span className="tabular text-text-muted">{counts[tab]}</span>
            {selected && (
              <span
                aria-hidden
                data-tab-rule
                className="absolute inset-x-0 bottom-0 h-[2px] rounded-none bg-accent-default"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
