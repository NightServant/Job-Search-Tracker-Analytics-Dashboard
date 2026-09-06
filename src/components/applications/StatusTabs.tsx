'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select } from '@/components/ui/select'
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
    <>
      {/* A PHONE GETS A DROPDOWN, NOT A SCROLLER (Gabe, 2026-09-06). Six tabs
          do not fit 320-375px, so the strip became a horizontal scroller with
          three destinations off-screen and no affordance saying so -- a filter
          you cannot see is a filter you do not use. A select shows the current
          one, names all six on open, and costs one row instead of one row plus
          a scrollbar.

          CSS rather than a JS breakpoint, deliberately. Both are form controls
          over the SAME `value`/`onChange`, so the hidden one is inert; and
          `display:none` takes it out of the accessibility tree, so nothing is
          announced twice. A JS switch would buy nothing here and cost a
          first-paint correction. */}
      <div className={cn('sm:hidden', className)}>
        <Select
          aria-label="Filter applications by status"
          value={value}
          onValueChange={(next) => onChange(next as StatusTabValue)}
          items={STATUS_TABS.map((tab) => ({
            value: tab,
            // The count comes along: it is why someone opens this at all --
            // "is there anything in interviewing" is the question, and a list
            // of bare labels makes them pick one to find out.
            label: `${LABELS[tab]} (${counts[tab]})`,
          }))}
        />
      </div>

    <Tabs
      value={value}
      onValueChange={(next) => onChange(next as StatusTabValue)}
      className="max-sm:hidden"
    >
      <TabsList
        aria-label="Filter applications by status"
        variant="line"
        activateOnFocus
        className={cn(
          // `overflow-y-hidden` IS NOT REDUNDANT. Per the CSS overflow spec, a
          // `visible` value coerces to `auto` the moment the other axis
          // scrolls -- so `overflow-x-auto` alone made this a scrollport on
          // BOTH axes and drew a vertical scrollbar in a 32px-tall row that
          // has nothing to scroll to. Same coercion the table container hit.
          //
          // AND THE HEIGHT HAS TO GO WITH IT. Clipping alone hid the active
          // tab's orange rule from tablet up: the list is a fixed 32px, its
          // triggers are 32px, and the horizontal scrollbar plus rounding put
          // content 1-5px past the padding box -- exactly the bottom edge the
          // 2px rule sits on. Sizing the list to its content means there is no
          // vertical overflow for `hidden` to clip.
          //
          // Written with the SAME variant the height it replaces uses, because
          // a plain `h-auto` loses: `group-data-[orientation=horizontal]/tabs:h-8`
          // is a variant class and outranks it, so the override was inert.
          // Matching the variant lets tailwind-merge resolve the pair.
          '-mx-4 w-full justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-none bg-transparent p-0 px-4',
          'group-data-[orientation=horizontal]/tabs:h-auto',
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
              'text-label-caps uppercase transition-colors duration-(--duration-fast)',
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
    </>
  )
}
