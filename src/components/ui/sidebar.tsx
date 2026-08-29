'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { NavItem } from '@/components/ui/nav-item'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { BrandLockup, BrandMark } from '@/components/ui/brand-mark'
import { SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/shadcn-sidebar'
import { activeNavHref, isUnder } from '@/lib/activeNav'
import type { IconName } from '@/components/icons'

/**
 * Logo, nav, divider, settings, spacer, theme toggle, footer -- in that
 * order. Read from Figma node 19:11 (M5.5 Task 3, 2026-08-29).
 *
 * The order matches Figma and is load-bearing rather than incidental. Settings
 * sits below the divider because it is chrome, not a destination alongside the
 * five sections. The spacer is what pins the toggle and the footer to the
 * bottom on a tall viewport; without it they float directly under Settings
 * and the sidebar reads as unfinished at 1440px.
 *
 * `NAV` labels are full lowercase words (`overview`, `applications`, ...),
 * read directly off node 19:20-19:36 -- not the title-cased M5 originals and
 * not the roadmap's abbreviated `apps`/`docs`/`stats` wording, which the
 * Figma frame disagrees with.
 */
export const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/dashboard', label: 'overview', icon: 'Overview' },
  { href: '/applications', label: 'applications', icon: 'Applications' },
  { href: '/calendar', label: 'calendar', icon: 'Calendar' },
  { href: '/documents', label: 'documents', icon: 'Documents' },
  { href: '/analytics', label: 'analytics', icon: 'Analytics' },
]

/**
 * Text, not icon -- `LogOut` is one of the four glyphs the icon set
 * deliberately eliminated (see the M5 icon-gap task). Disabled while the
 * sign-out promise is in flight so a slow network can't be clicked twice.
 *
 * A failed sign-out is not silent: it's logged and surfaced as a toast, the
 * same handling the deleted Layout.tsx had, so a network blip doesn't leave
 * someone still signed in with no idea why the click did nothing.
 *
 * There is no sign-out control here. Gabe removed the duplicate one in
 * eb9d784 -- sign-out lives in Settings, and that matches the Figma sidebar
 * (19:11), which has none either.
 */

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

/**
 * The collapse control is NOT in the Figma sidebar (19:11) -- it has no
 * collapse affordance at either breakpoint. Gabe asked for one; this is
 * shadcn's SidebarTrigger/SidebarProvider, added deliberately on top of the
 * Figma layout rather than restoring anything the frame specifies.
 *
 * Collapsing hides the nav's content (sections, settings, the toggle, the
 * footer) but keeps the header row -- the mark and the trigger -- always
 * rendered, so the control that reopens it is never the thing it just hid.
 */
function SidebarNav({ pathname = '/dashboard', activeHref, className, ...props }: SidebarProps) {
  const { open } = useSidebar()
  const active =
    activeHref !== undefined ? activeHref : activeNavHref(pathname, NAV.map((n) => n.href))
  const settingsActive = isUnder(pathname, '/settings')

  return (
    <nav
      aria-label="Main"
      data-state={open ? 'expanded' : 'collapsed'}
      className={cn(
        'flex h-full w-60 flex-col gap-8 border-r border-border-subtle bg-bg-canvas pl-6 pr-4 py-8',
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <div data-sidebar-logo>{open ? <BrandLockup /> : <BrandMark />}</div>
        <SidebarTrigger />
      </div>

      {open && (
        <>
          <div className="flex flex-col gap-1">
            {NAV.map((item, i) => (
              <NavItem key={item.href} {...item} index={i + 1} active={active === item.href} />
            ))}
          </div>

          <hr data-sidebar-divider className="border-border-subtle" />

          <NavItem
            href="/settings"
            label="settings"
            icon="Settings"
            index={6}
            active={settingsActive}
          />

          <div data-sidebar-spacer className="flex-1" />

          <div>
            <ThemeToggle />
          </div>

          <p data-sidebar-footer className="text-caption leading-[1.5] text-text-muted">
            stay focused.
            <br />
            your next opportunity is
            <br />
            closer than you think.
          </p>
        </>
      )}
    </nav>
  )
}

export function Sidebar(props: SidebarProps) {
  return (
    <SidebarProvider className="contents">
      <SidebarNav {...props} />
    </SidebarProvider>
  )
}
