'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { IconName } from '@/components/icons'
import { icons } from '@/components/icons'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

/**
 * A numbered navigation entry.
 *
 * Active state is a 2px rule, the same vocabulary as the Status Marker -- not a
 * filled pill and not a tinted background. One way of saying "this one",
 * everywhere.
 *
 * The number is dropped on the mobile bottom bar. Five entries across 375px
 * leaves roughly 75px each, which fits an icon and a label or an icon and a
 * number, but not all three without the label truncating -- and the label is
 * the part that carries meaning.
 *
 * Sidebar metrics read from Figma node 19:20/19:41 (M5.5 Task 3): 36px tall,
 * a 20px icon, the index in Data/S (12px, not the 11px uppercase Label/Caps
 * M5 used), accent text AND accent index when active, text/secondary (not
 * text/muted) otherwise -- and no background fill in any state; the Figma
 * Nav Item description says so outright.
 *
 * The rule (Active Bar, node I19:20;18:18) is a REAL flex child in Figma --
 * `w-[2px] h-full`, transparent when inactive, painted when active -- not an
 * absolutely-positioned overlay. That matters beyond fidelity: it reserves
 * the bar's own width plus one gap (2px + 12px = 14px, confirmed against
 * 19:20) ahead of the index on every row, active or not, so nothing shifts
 * sideways by 14px the moment a route becomes current. An `absolute` bar
 * sitting at the same x=0 as the index (the M5.5 first pass) reads as the
 * index and the bar overlapping.
 *
 * `*:focus-visible` (src/index.css) gives every element in the app a 2px
 * `ring-ring` outline -- `--color-ring` resolves to the accent orange, so an
 * unmodified nav item shows a boxed ring the moment it is focused. That is
 * exactly the "boxed treatment" the design forbids ("no background fill and
 * no border in any state"), so it is suppressed here (`outline-none`) and
 * replaced with the same bar-plus-colour vocabulary the active state
 * already uses: `group-focus-visible:` lights up the bar and the text/icon
 * colour instead of drawing a box, which keeps keyboard focus visible
 * without inventing a second visual language.
 */
export interface NavItemProps {
  href: string
  label: string
  icon: IconName
  index?: number
  active?: boolean
  variant?: 'sidebar' | 'bottom'
  /**
   * Icon-rail mode: the sidebar collapsed via SidebarTrigger. Sidebar
   * variant only -- the mobile bottom bar never collapses. Hides the index
   * and (visually) the label; the label stays in the DOM as `sr-only` so the
   * link keeps a real accessible name rather than depending solely on the
   * tooltip, which is the visual affordance for a sighted, collapsed rail.
   */
  collapsed?: boolean
  className?: string
}

export function NavItem({
  href,
  label,
  icon,
  index,
  active = false,
  variant = 'sidebar',
  collapsed = false,
  className,
}: NavItemProps) {
  const Icon = icons[icon]
  const bottom = variant === 'bottom'
  const rail = !bottom && collapsed

  const link = (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      data-nav-item
      data-active={active ? '' : undefined}
      className={cn(
        'group relative flex items-center gap-3 outline-none transition-colors duration-[--duration-fast]',
        active
          ? 'text-accent-default'
          : 'text-text-secondary group-focus-visible:text-accent-default hover:text-text-primary focus-visible:text-accent-default',
        bottom
          ? 'h-11 min-w-11 flex-1 flex-col justify-center gap-1'
          : rail
            ? 'h-9 w-9'
            : 'h-9 pr-4',
        className
      )}
    >
      {/* Sidebar (expanded): a real flex child ahead of the index, reserving
          its own width so the row never reflows when it becomes active.
          Sidebar (rail): pinned absolute at the item's own left edge per the
          collapsed-rail spec -- there is no index to protect from reflow, so
          it does not need to sit in-flow. Bottom bar: unchanged, an overlay
          top rule that only exists when active. */}
      {bottom ? (
        active && (
          <span
            data-nav-rule
            aria-hidden
            className="absolute inset-x-2 top-0 h-[2px] rounded-none bg-accent-default"
          />
        )
      ) : rail ? (
        <span
          data-nav-rule
          aria-hidden
          className={cn(
            'absolute inset-y-0 left-0 w-[2px] rounded-none',
            active ? 'bg-accent-default' : 'bg-transparent',
            !active && 'group-focus-visible:bg-accent-default'
          )}
        />
      ) : (
        <span
          data-nav-rule
          aria-hidden
          className={cn(
            'h-full w-[2px] shrink-0 rounded-none',
            active ? 'bg-accent-default' : 'bg-transparent',
            !active && 'group-focus-visible:bg-accent-default'
          )}
        />
      )}

      {!bottom && !rail && index !== undefined && (
        <span
          data-nav-index
          className={cn('tabular text-data-s', active ? 'text-accent-default' : 'text-text-muted')}
        >
          {String(index).padStart(2, '0')}
        </span>
      )}

      {rail ? (
        <span className="flex h-full w-full items-center justify-center">
          <Icon size={20} />
        </span>
      ) : (
        <Icon size={20} />
      )}

      <span
        className={cn(
          bottom ? 'text-label-caps' : 'text-body-m',
          active && !bottom && 'font-medium',
          rail && 'sr-only'
        )}
      >
        {label}
      </span>
    </Link>
  )

  if (!rail) return link

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
