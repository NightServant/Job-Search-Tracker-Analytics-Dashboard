'use client'

import * as React from 'react'
import { icons } from '@/components/icons'
import { cn } from '@/lib/utils'
import { DOCUMENT_TABS, type DocumentTab, type DocumentTabId } from './documentTabs'

/**
 * The left rail: which pane the right rail is showing.
 *
 * A LIST OF BUTTONS, NOT `ui/tabs`. The shadcn tab primitive puts its triggers
 * and its panels in one component and expects them adjacent; here the triggers
 * are in the left column and the panel is in the right one, with a whole sheet
 * of document between them. Driving that through `Tabs` would mean a context
 * spanning the page and a `TabsContent` rendered somewhere its `TabsList`
 * cannot see -- more machinery than a controlled `activeTab` string needs.
 *
 * THE ACCESSIBILITY IS DONE BY HAND FOR THE SAME REASON, and properly:
 * `role="tablist"` with `aria-orientation="vertical"`, each button
 * `role="tab"` with `aria-selected`, and `aria-controls` pointing at the pane
 * in the other column. That last attribute is the whole justification for the
 * layout -- it is what tells a screen reader that a control on the left drives
 * a region on the right, which sighted users get from the arrangement itself.
 *
 * ARROW KEYS MOVE BETWEEN TABS, which is what `role="tablist"` promises. A
 * tablist whose only navigation is Tab is a set of buttons wearing a tablist's
 * clothes, and announcing "tab 2 of 4" while the arrow keys do nothing is
 * worse than not making the claim.
 *
 * ORANGE IS FOR THE SELECTED TAB AND NOTHING ELSE HERE. The design system
 * reserves the accent for "the current action", and in this rail the selected
 * pane is exactly that. Selection is carried by a left rule plus weight, not a
 * filled block, because status is never a filled pill in this app.
 */

export interface DocumentRailTabsProps {
  active: DocumentTabId
  onSelect: (id: DocumentTabId) => void
  /** Per-tab counts, e.g. 3 spelling issues. `null` renders nothing. */
  badges?: Partial<Record<DocumentTabId, number | null>>
  /** Marks the application-dependent tabs when no application is chosen. */
  applicationSelected?: boolean
  id?: string
  className?: string
}

export function DocumentRailTabs({
  active,
  onSelect,
  badges = {},
  applicationSelected = false,
  id = 'document-rail',
  className,
}: DocumentRailTabsProps) {
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({})

  function move(from: DocumentTabId, delta: number) {
    const order = DOCUMENT_TABS.map((tab) => tab.id)
    const index = order.indexOf(from)
    // Wraps, because a tablist that stops at the ends makes the last tab feel
    // unreachable when arrowing down from the first.
    const next = order[(index + delta + order.length) % order.length]
    onSelect(next)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-orientation="vertical"
      aria-label="document tools"
      className={cn('flex flex-col', className)}
      data-document-rail
    >
      {DOCUMENT_TABS.map((tab) => (
        <RailTab
          key={tab.id}
          tab={tab}
          active={tab.id === active}
          badge={badges[tab.id] ?? null}
          muted={tab.needsApplication && !applicationSelected}
          paneId={`${id}-pane`}
          ref={(node) => {
            refs.current[tab.id] = node
          }}
          onSelect={() => onSelect(tab.id)}
          onMove={(delta) => move(tab.id, delta)}
        />
      ))}
    </div>
  )
}

interface RailTabProps {
  tab: DocumentTab
  active: boolean
  badge: number | null
  muted: boolean
  paneId: string
  onSelect: () => void
  onMove: (delta: number) => void
}

const RailTab = React.forwardRef<HTMLButtonElement, RailTabProps>(function RailTab(
  { tab, active, badge, muted, paneId, onSelect, onMove },
  ref
) {
  const Icon = icons[tab.icon]

  return (
    <button
      ref={ref}
      role="tab"
      type="button"
      id={`${paneId}-tab-${tab.id}`}
      aria-selected={active}
      aria-controls={paneId}
      // Roving tabindex: the tablist is one Tab stop and the arrows move
      // within it, which is what a tablist is supposed to feel like.
      tabIndex={active ? 0 : -1}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
          event.preventDefault()
          onMove(1)
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
          event.preventDefault()
          onMove(-1)
        }
      }}
      className={cn(
        'group flex w-full items-start gap-3 border-l-2 py-3 pl-3 pr-2 text-left',
        'transition-colors duration-(--duration-fast)',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default/30',
        'active:scale-[0.99]',
        active
          ? 'border-l-accent-default bg-bg-surface'
          : 'border-l-transparent hover:bg-bg-surface/60'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 shrink-0 transition-colors',
          active ? 'text-accent-default' : 'text-text-muted group-hover:text-text-secondary'
        )}
      >
        <Icon size={16} />
      </span>

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'text-body-m',
              active ? 'font-medium text-text-primary' : 'text-text-secondary'
            )}
          >
            {tab.label}
          </span>
          {badge !== null && badge > 0 && (
            // A count, not a dot: "3" answers how much work is left and a dot
            // only says "some". Rendered as a bare numeral against a rule
            // rather than a filled pill.
            <span className="shrink-0 border-b border-border-default px-1 text-label-caps tabular-nums text-text-secondary">
              {badge}
            </span>
          )}
        </span>
        <span className="text-body-s text-text-muted">
          {muted ? 'needs an application' : tab.hint}
        </span>
      </span>
    </button>
  )
})
