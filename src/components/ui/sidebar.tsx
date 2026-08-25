'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { NavItem } from '@/components/ui/nav-item'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { activeNavHref, isUnder } from '@/lib/activeNav'
import type { IconName } from '@/components/icons'

/**
 * Logo, nav, divider, settings, spacer, sign out, theme toggle, footer -- in
 * that order.
 *
 * The order matches Figma and is load-bearing rather than incidental. Settings
 * sits below the divider because it is chrome, not a destination alongside the
 * five sections. The spacer is what pins sign out, the toggle and the footer to
 * the bottom on a tall viewport; without it they float directly under Settings
 * and the sidebar reads as unfinished at 1440px.
 */
export const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/dashboard', label: 'Overview', icon: 'Overview' },
  { href: '/applications', label: 'Applications', icon: 'Applications' },
  { href: '/calendar', label: 'Calendar', icon: 'Calendar' },
  { href: '/documents', label: 'Documents', icon: 'Documents' },
  { href: '/analytics', label: 'Analytics', icon: 'Analytics' },
]

/**
 * Text, not icon -- `LogOut` is one of the four glyphs the icon set
 * deliberately eliminated (see the M5 icon-gap task). Disabled while the
 * sign-out promise is in flight so a slow network can't be clicked twice.
 *
 * A failed sign-out is not silent: it's logged and surfaced as a toast, the
 * same handling the deleted Layout.tsx had, so a network blip doesn't leave
 * someone still signed in with no idea why the click did nothing.
 */
function SignOutButton() {
  const { signOut } = useAuth()
  const { error: showError } = useToast()
  const [pending, setPending] = React.useState(false)

  const handleClick = async () => {
    setPending(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
      const message = error instanceof Error ? error.message : 'Failed to sign out'
      showError('Sign Out Failed', message)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="mx-3 rounded-md px-3 py-2 text-left text-body-m text-text-secondary transition-colors duration-[--duration-fast] hover:bg-bg-inset hover:text-text-primary disabled:opacity-50"
    >
      Sign out
    </button>
  )
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  pathname?: string
  /**
   * Which NAV destination is active, precomputed by activeNavHref.
   *
   * AppShell passes this explicitly so the desktop sidebar and the mobile
   * bottom nav read off the exact same value rather than each deriving it
   * from `pathname` on their own -- that duplication is what let a detail
   * route (e.g. /applications/abc) highlight the bottom nav and nothing in
   * the sidebar. Left undefined, Sidebar derives it the same way, so it stays
   * self-sufficient for standalone use (tests, the dev gallery).
   */
  activeHref?: string | null
}

export function Sidebar({ pathname = '/dashboard', activeHref, className, ...props }: SidebarProps) {
  const active =
    activeHref !== undefined ? activeHref : activeNavHref(pathname, NAV.map((n) => n.href))
  const settingsActive = isUnder(pathname, '/settings')

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
        <NavItem key={item.href} {...item} index={i + 1} active={active === item.href} />
      ))}

      <hr data-sidebar-divider className="my-2 border-border-subtle" />

      <NavItem href="/settings" label="Settings" icon="Settings" active={settingsActive} />

      <div data-sidebar-spacer className="flex-1" />

      <SignOutButton />

      <div className="px-3">
        <ThemeToggle />
      </div>

      <p data-sidebar-footer className="px-3 pb-1 text-caption text-text-muted">
        Every application, every version of your CV.
      </p>
    </nav>
  )
}
