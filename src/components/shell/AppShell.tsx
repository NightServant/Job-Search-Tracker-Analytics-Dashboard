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

/**
 * How wide the content column is allowed to get, per route.
 *
 * Three answers, and the reason there are three rather than one:
 *
 * - `shell-wide` (1440) is the default, and it is what the grid screens want.
 *   The overview, analytics, the kanban board and the calendar are columns of
 *   panels, not prose -- at 1440 a two-column grid is two real columns, and
 *   capping them at 1200 would waste a 1600px monitor without helping anyone
 *   read anything.
 *
 * - `shell-page` (1200) is for the screens that ARE reading: settings is a
 *   stack of labelled fields, and an application record is a document about
 *   one job. Both are single measures, and a single measure at 1440 is a line
 *   of text too long to track back to the start of.
 *
 * - `w-full` is the opt-out, and only the CV/document workspace takes it. That
 *   component caps ITSELF at 1100 without rails and 1600 with them, because a
 *   letter page is 816px and two rails either side need more room than any
 *   shell cap would allow. A cap here would clip the wider of its two states.
 *   It is detected by the same document-focus flag the sidebar already reads,
 *   rather than by a second list of routes that could drift from the first.
 *
 * Uncapped-at-any-width was the state before this: on a 2560px monitor the
 * overview's two columns were 1200px each and the recent-applications table
 * ran the full width of the screen.
 */
const READING_ROUTES = ['/settings', '/applications/']

function contentWidth(pathname: string, documentFocused: boolean): string {
  if (documentFocused) return 'w-full'
  // `/applications/` with the trailing slash is the DETAIL route only -- the
  // list at `/applications` is a board and stays wide.
  const reading = READING_ROUTES.some((route) => pathname.includes(route))
  return reading ? 'shell-page' : 'shell-wide'
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
  const width = contentWidth(pathname, documentFocused)

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
        <main
          className={cn(
            // `p-gutter` is one fluid token in place of the old `p-4 md:p-8`
            // pair: 16px at 320, ~23px on a tablet, 32px from 1200 up, with no
            // jump at 768. See --spacing-gutter.
            'min-w-0 flex-1 p-gutter',
            // The bottom nav is fixed, so without clearance the last row of
            // every list sits under it and the page looks cut off. `pb-nav` is
            // that clearance plus the iOS home-indicator inset in one calc --
            // see the utility for why it is not two classes. With the nav
            // hidden the padding is dead space at the foot of a document, so
            // it goes with it.
            documentFocused ? 'pb-gutter' : 'pb-nav md:pb-gutter'
          )}
        >
          {/* THE CAP. Below lg this is a no-op and the shell is full-bleed
              with gutters; from lg up it stops content growing with the
              monitor and hands the surplus back as margin. Two widths because
              the screens want different things -- see contentWidth. */}
          <div className={width}>
            <DocumentFocusProvider setFocused={setDocumentFocused}>{children}</DocumentFocusProvider>
          </div>
        </main>
        {!documentFocused && <BottomNav activeHref={active} nav={nav} />}
      </div>
    </div>
  )
}
