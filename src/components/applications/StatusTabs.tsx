'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { STATUSES, STATUS_MARK_CLASSES, type Status } from '@/components/ui/status-marker'

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
 * The sort/filter control for the Applications screen, at every width.
 *
 * Built on shadcn's `Tabs` (Base UI underneath, not Radix -- this repo's
 * `components.json` is pinned to `style: base-nova`, a Base UI style. Base
 * UI's `Tabs.List` sets `enableHomeAndEndKeys` and drives a roving-tabindex
 * composite the same way the hand-rolled version did by hand, so the old
 * `handleKeyDown`/`tabRefs` bookkeeping is gone rather than reimplemented.
 * `activateOnFocus` is set so arrow/Home/End keeps the old "automatic
 * activation" behaviour -- moving focus also moves the selection, matching
 * the tab widget pattern the previous implementation already tested against.
 *
 * These are real tabs, not styled divs: `role="tab"` with `aria-selected` on
 * a `role="tablist"`. Restyled to this system's vocabulary rather than
 * shadcn's default -- no filled pill indicator, no rounded capsule. The
 * active marker is a 2px accent rule, the same vocabulary the nav item uses
 * for "this one". It is deliberately NOT a status colour: the tab says where
 * you are, not what state an application is in, and colouring the *active
 * marker* by status would put a sixth meaning on the five-hue set.
 *
 * A second, separate colour cue -- a 6px status-hue dot per tab (not `all`)
 * -- was in the Figma mobile frame (`60:670`) and was dropped when this was
 * first built. It is restored here. Unlike the active marker, the dot is not
 * about "where you are": it is a legend swatch, the same 8px-swatch
 * vocabulary the Overview donut legend uses, telling you which colour the
 * matching kanban column renders in. The two are different things and both
 * survive at once without contradiction.
 *
 * Renders at every breakpoint, not `md:hidden`. Below 768px there is no
 * kanban at all (a Global Constraint), so the list is the whole screen and
 * these tabs are its only navigation. At 768px and up they are a **view
 * switch**, not a filter: `all` keeps the five-column kanban board, and every
 * other tab replaces it with the same flat list mobile already used, no
 * longer hidden at that width. `ApplicationsPage` owns that switch; this
 * component only ever reports which tab is selected. See its docblock for
 * why a filter (narrowing the board's columns instead of replacing it) was
 * the first cut and was overruled. Putting tabs on desktop at all is a
 * deliberate departure from the Figma desktop frame (`31:174`, which has no
 * tabs and no search field at all) at Gabe's explicit instruction, not a
 * restoration of something the frame shows.
 */
export interface StatusTabsProps {
  value: StatusTabValue
  onChange: (value: StatusTabValue) => void
  counts: Record<StatusTabValue, number>
  panelId?: string
  className?: string
}

export function StatusTabs({ value, onChange, counts, panelId, className }: StatusTabsProps) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as StatusTabValue)}>
      <TabsList
        aria-label="Filter applications by status"
        variant="line"
        activateOnFocus
        className={cn(
          '-mx-4 w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0 px-4',
          className
        )}
      >
        {STATUS_TABS.map((tab) => (
          <TabsTrigger
            key={tab}
            id={`status-tab-${tab}`}
            value={tab}
            aria-controls={panelId}
            className={cn(
              'relative h-8 shrink-0 items-center justify-start gap-1.5 whitespace-nowrap rounded-none border-0 px-3 py-0',
              'text-label-caps uppercase transition-colors duration-[--duration-fast]',
              'text-text-muted hover:text-text-primary',
              'data-active:bg-transparent data-active:text-text-primary data-active:shadow-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default',
              'after:hidden'
            )}
          >
            {tab !== 'all' && (
              <span
                aria-hidden
                data-status-mark
                className={cn('size-[6px] shrink-0 rounded-full', STATUS_MARK_CLASSES[tab])}
              />
            )}
            {LABELS[tab]}
            <span className="tabular text-text-muted">{counts[tab]}</span>
            {tab === value && (
              <span
                aria-hidden
                data-tab-rule
                className="absolute inset-x-0 bottom-0 h-[2px] rounded-none bg-accent-default"
              />
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
