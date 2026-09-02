'use client'

import { usePathname } from 'next/navigation'
import { Sidebar, NAV, type NavEntry } from '@/components/ui/sidebar'
import { AppBackground } from './AppBackground'
import { activeNavHref, isUnder } from '@/lib/activeNav'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'

/**
 * The authenticated chrome every route renders inside.
 *
 * Sidebar for desktop, Top Bar plus Bottom Nav for mobile -- both driven by
 * the same `active` value computed once here, so the two can't disagree about
 * which destination a route belongs to the way they did when Sidebar derived
 * its own active state from a bare `pathname === item.href` check.
 */
export interface AppShellProps {
  children: React.ReactNode
  /**
   * The primary destinations. Defaults to the app's own NAV; /demo/* passes a
   * demo-scoped copy so its links stay inside the demo rather than bouncing a
   * visitor to /login.
   */
  nav?: NavEntry[]
  /** Where settings points, or null to omit it. The demo has no settings. */
  settingsHref?: string | null
  /** Rendered above <main>. The demo puts its persistent banner here. */
  banner?: React.ReactNode
}

export function AppShell({
  children,
  nav = NAV,
  settingsHref = '/settings',
  banner,
}: AppShellProps) {
  const pathname = usePathname()
  const active = activeNavHref(pathname, nav.map((n) => n.href))
  const settingsActive = settingsHref ? isUnder(pathname, settingsHref) : false

  return (
    // NO bg-* on this container, deliberately. It used to carry
    // `bg-bg-canvas`, which is the same colour body already paints
    // (--color-background IS --color-bg-canvas) -- but painting it here made
    // the backdrop permanently invisible at any opacity. Within a stacking
    // context, negative z-index children paint BEFORE in-flow block
    // backgrounds, so this div's opaque fill covered the fixed -z-10 backdrop
    // every time. Two "raise the opacity" fixes could never have worked.
    <div className="flex min-h-screen">
      <AppBackground />
      <Sidebar
        pathname={pathname}
        activeHref={active}
        nav={nav}
        settingsHref={settingsHref}
        className="hidden md:flex"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar settingsActive={settingsActive} settingsHref={settingsHref} />
        {banner}
        {/* pb-20 clears the fixed bottom nav; without it the last row of every
            list sits under it and looks like the page is cut off. */}
        <main className="min-w-0 flex-1 p-4 pb-20 md:p-8 md:pb-8">{children}</main>
        <BottomNav activeHref={active} nav={nav} />
      </div>
    </div>
  )
}
