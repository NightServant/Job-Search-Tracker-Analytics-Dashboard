'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
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
 * Icon + a light/dark label, reflecting the live theme.
 *
 * Not in Figma: node 152:2442 / its main component 109:2402 is a bare
 * hairline 32px square with only the sun/moon icon inside -- no text node
 * anywhere in it. Gabe asked for an indicator so the icon is not an orphaned
 * glyph with no visible label, the way settings and every nav item have one.
 * Lowercase because it is chrome copy, not an acronym.
 *
 * Guards the same server/client mismatch ThemeToggle itself guards against:
 * the server cannot know the stored theme, so the first client render must
 * match the server's (empty label) rather than guessing and then swapping.
 */
function ThemeSection({ collapsed }: { collapsed: boolean }) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const label = mounted ? (resolvedTheme === 'dark' ? 'dark' : 'light') : ''

  return (
    <div className={cn('flex h-8 items-center gap-3', collapsed && 'justify-center')}>
      <ThemeToggle />
      {!collapsed && (
        <span data-theme-label className="text-body-m text-text-secondary">
          {label}
        </span>
      )}
    </div>
  )
}

/**
 * The collapse control is NOT in the Figma sidebar (19:11) -- it has no
 * collapse affordance at either breakpoint. Gabe asked for one; this is
 * shadcn's SidebarTrigger/SidebarProvider, added deliberately on top of the
 * Figma layout rather than restoring anything the frame specifies.
 *
 * Collapsing turns the nav into an icon rail (shadcn's `collapsible="icon"`
 * idea, reimplemented directly rather than through shadcn's own Sidebar
 * container -- see the file-level note above `Sidebar` for why): every
 * destination stays mounted and clickable, only the index numbers and the
 * visible labels drop out, and a right-side tooltip carries the label for a
 * sighted user. The first pass hid the whole nav below the header on
 * collapse, which stranded every destination and left a blank column --
 * exactly the state a "collapse" control must not produce.
 */
function SidebarNav({ pathname = '/dashboard', activeHref, className, ...props }: SidebarProps) {
  const { open } = useSidebar()
  const collapsed = !open
  const active =
    activeHref !== undefined ? activeHref : activeNavHref(pathname, NAV.map((n) => n.href))
  const settingsActive = isUnder(pathname, '/settings')

  return (
    <nav
      aria-label="Main"
      data-state={open ? 'expanded' : 'collapsed'}
      className={cn(
        'flex h-full flex-col gap-8 border-r border-border-subtle bg-bg-canvas py-8 transition-[width,padding] duration-[--duration-base]',
        open ? 'w-60 pl-6 pr-4' : 'w-16 items-center px-2',
        className
      )}
      {...props}
    >
      <div className={cn('flex items-center gap-2', open ? 'justify-between' : 'flex-col')}>
        <div data-sidebar-logo>{open ? <BrandLockup /> : <BrandMark />}</div>
        <SidebarTrigger />
      </div>

      <div className={cn('flex flex-col gap-1', collapsed && 'items-center')}>
        {NAV.map((item, i) => (
          <NavItem
            key={item.href}
            {...item}
            index={i + 1}
            active={active === item.href}
            collapsed={collapsed}
          />
        ))}
      </div>

      <hr data-sidebar-divider className="w-full border-border-subtle" />

      <NavItem
        href="/settings"
        label="settings"
        icon="Settings"
        index={6}
        active={settingsActive}
        collapsed={collapsed}
      />

      <div data-sidebar-spacer className="flex-1" />

      {/* The same divider-and-section rhythm settings gets below the nav
          group, so the theme control reads as its own section rather than an
          orphaned icon floating above the footer. */}
      <hr className="w-full border-border-subtle" />

      <ThemeSection collapsed={collapsed} />

      {open && (
        <p data-sidebar-footer className="text-caption leading-[1.5] text-text-muted">
          stay focused.
          <br />
          your next opportunity is
          <br />
          closer than you think.
        </p>
      )}
    </nav>
  )
}

export function Sidebar(props: SidebarProps) {
  return (
    // shadcn's SidebarProvider wrapper defaults to `min-h-svh w-full`, meant
    // for wrapping the whole app shell. Wrapping only the nav here instead
    // (per M5.5 Task 3's "AppShell mounts SidebarProvider around the desktop
    // tree only", which -- since TopBar/BottomNav handle mobile -- means the
    // nav itself), that default forced the wrapper to at least one full
    // viewport tall regardless of its actual container (a 520px gallery
    // preview box, or an AppShell row that is often shorter than 100svh),
    // which is what let `<nav>`'s own h-full stretch past its real
    // container and left the flex-1 spacer with nothing to grow into --
    // the footer would end up sitting well short of the visible bottom
    // edge, with a dead gap below it. min-h-0 cancels that; h-full/w-fit
    // make the wrapper track the nav's real size instead.
    <SidebarProvider className="h-full min-h-0 w-fit">
      <SidebarNav {...props} />
    </SidebarProvider>
  )
}
