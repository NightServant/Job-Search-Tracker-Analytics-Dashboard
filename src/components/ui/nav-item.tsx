'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { IconName } from '@/components/icons'
import { icons } from '@/components/icons'

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
 * M5 used), a full-height 2px rule flush at the item's own left edge (the
 * container supplies the 24px inset), accent text AND accent index when
 * active, text/secondary (not text/muted) otherwise -- and no background
 * fill in any state; the Figma Nav Item description says so outright.
 */
export interface NavItemProps {
  href: string
  label: string
  icon: IconName
  index?: number
  active?: boolean
  variant?: 'sidebar' | 'bottom'
  className?: string
}

export function NavItem({
  href,
  label,
  icon,
  index,
  active = false,
  variant = 'sidebar',
  className,
}: NavItemProps) {
  const Icon = icons[icon]
  const bottom = variant === 'bottom'

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      data-nav-item
      data-active={active ? '' : undefined}
      className={cn(
        'group relative flex items-center gap-3 transition-colors duration-[--duration-fast]',
        active ? 'text-accent-default' : 'text-text-secondary hover:text-text-primary',
        bottom ? 'h-11 min-w-11 flex-1 flex-col justify-center gap-1' : 'h-9 pr-4',
        className
      )}
    >
      {!bottom && index !== undefined && (
        <span
          data-nav-index
          className={cn('tabular text-data-s', active ? 'text-accent-default' : 'text-text-muted')}
        >
          {String(index).padStart(2, '0')}
        </span>
      )}
      <Icon size={20} />
      <span
        className={cn(bottom ? 'text-label-caps' : 'text-body-m', active && !bottom && 'font-medium')}
      >
        {label}
      </span>
      {active && (
        <span
          data-nav-rule
          aria-hidden
          className={cn(
            'absolute rounded-none bg-accent-default',
            bottom ? 'inset-x-2 top-0 h-[2px]' : 'inset-y-0 left-0 w-[2px]'
          )}
        />
      )}
    </Link>
  )
}
