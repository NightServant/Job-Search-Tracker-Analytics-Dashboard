'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar, NAV, type NavEntry } from '@/components/ui/sidebar'
import { AppBackground } from './AppBackground'
import { activeNavHref, isUnder } from '@/lib/activeNav'
import { cn } from '@/lib/utils'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { DocumentFocusProvider } from './documentFocus'

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

  // DOCUMENT FOCUS. A CV editor takes the whole viewport: the sidebar and the
  // bottom nav are hidden while one is open, on Gabe's instruction
  // (2026-09-04). The editor claims it on mount and releases it on unmount, so
  // navigating away or closing the draft restores the nav without either side
  // having to remember. See ./documentFocus.
  //
  // The Top Bar STAYS. It carries the theme toggle and the settings button,
  // which are the only controls a full-screen editor still needs -- and
  // removing it would leave a phone user in a document with no chrome at all.
  const [documentFocused, setDocumentFocused] = React.useState(false)
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
      {!documentFocused && (
        <Sidebar
          pathname={pathname}
          activeHref={active}
          nav={nav}
          settingsHref={settingsHref}
          className="hidden md:flex"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar settingsActive={settingsActive} settingsHref={settingsHref} />
        {banner}
        {/* pb-20 clears the fixed bottom nav; without it the last row of every
            list sits under it and looks like the page is cut off. */}
        {/* `pb-20` clears the fixed bottom nav; without it the last row of
            every list sits under it and looks like the page is cut off. With
            the nav hidden that padding is dead space at the foot of a
            document, so it goes with it. */}
        <main
          className={cn(
            'min-w-0 flex-1 p-4 md:p-8',
            documentFocused ? 'pb-8' : 'pb-20 md:pb-8'
          )}
        >
          <DocumentFocusProvider setFocused={setDocumentFocused}>{children}</DocumentFocusProvider>
        </main>
        {!documentFocused && <BottomNav activeHref={active} nav={nav} />}
      </div>
    </div>
  )
}
