'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { NavItem } from '@/components/ui/nav-item'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import type { IconName } from '@/components/icons'

/**
 * Logo, nav, divider, settings, spacer, theme toggle, footer -- in that order.
 *
 * The order matches Figma and is load-bearing rather than incidental. Settings
 * sits below the divider because it is chrome, not a destination alongside the
 * five sections. The spacer is what pins the toggle and footer to the bottom on
 * a tall viewport; without it they float directly under Settings and the
 * sidebar reads as unfinished at 1440px.
 */
export const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/dashboard', label: 'Overview', icon: 'Overview' },
  { href: '/jobs', label: 'Applications', icon: 'Applications' },
  { href: '/calendar', label: 'Calendar', icon: 'Calendar' },
  { href: '/documents', label: 'Documents', icon: 'Documents' },
  { href: '/analytics', label: 'Analytics', icon: 'Analytics' },
]

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  pathname?: string
}

export function Sidebar({ pathname = '/dashboard', className, ...props }: SidebarProps) {
  return (
    <nav
      aria-label="Main"
      className={cn(
        'flex h-full w-60 flex-col gap-1 border-r border-border-subtle bg-bg-canvas p-3',
        className
      )}
      {...props}
    >
      <span data-sidebar-logo className="px-3 py-4 text-heading-m text-text-primary">
        Worktrack
      </span>

      {NAV.map((item, i) => (
        <NavItem key={item.href} {...item} index={i + 1} active={pathname === item.href} />
      ))}

      <hr data-sidebar-divider className="my-2 border-border-subtle" />

      <NavItem href="/settings" label="Settings" icon="Settings" active={pathname === '/settings'} />

      <div data-sidebar-spacer className="flex-1" />

      <div className="px-3">
        <ThemeToggle />
      </div>

      <p data-sidebar-footer className="px-3 pb-1 text-caption text-text-muted">
        Every application, every version of your CV.
      </p>
    </nav>
  )
}
