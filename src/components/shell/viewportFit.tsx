'use client'

import * as React from 'react'

/**
 * Whether the current screen manages its own scrolling, and therefore whether
 * the shell should stop being taller than the viewport.
 *
 * WHY THIS EXISTS. Most screens are documents: they grow, the page scrolls,
 * and that is right. `/applications` is not — it is a fixed frame (title,
 * tabs, toolbar, pagination) around one scrolling list. Left to the page
 * scroll, that frame slides away with the list: measured 2026-09-06 at
 * 780x700, the page scrolled 398px while the table only had 375px to travel
 * before its header disappeared under the top bar, which is exactly the
 * artifact Gabe reported.
 *
 * MIRRORS `documentFocus` DELIBERATELY, including the reason. The obvious
 * alternative is for `AppShell` to check the pathname, and it is wrong for the
 * same reason: `/applications` with no rows is an empty state that should
 * scroll like any other page, and a shell that knows which screens have tables
 * has taken on those screens' business. The screen knows; the screen says so.
 *
 * ONLY FROM `sm` UP, and that part is CSS rather than JS. Below 640 the table
 * is stacked into cards and the whole point is to spend height — locking the
 * viewport there would put a nested scrollport under a thumb, which is the
 * worst version of this pattern. `AppShell` applies the lock with `sm:`
 * prefixes, so a phone keeps ordinary page scrolling and no JS has to know the
 * width.
 *
 * Default is a no-op setter, so a screen rendered outside the shell — in a
 * test, in the gallery — behaves normally instead of throwing.
 */
const ViewportFitContext = React.createContext<(fit: boolean) => void>(() => {})

export function ViewportFitProvider({
  setFit,
  children,
}: {
  setFit: (fit: boolean) => void
  children: React.ReactNode
}) {
  return <ViewportFitContext.Provider value={setFit}>{children}</ViewportFitContext.Provider>
}

/**
 * Call from a screen that owns its own scroll region. Claimed on mount and
 * released on unmount, so navigating away restores ordinary page scrolling
 * without anyone remembering to.
 *
 * Pass `false` to stand down conditionally — `/applications` does this when it
 * has no rows, because an empty state has nothing to scroll and locking the
 * viewport around it would just strand it at the top of a fixed frame.
 */
export function useViewportFit(active = true): void {
  const setFit = React.useContext(ViewportFitContext)
  React.useEffect(() => {
    setFit(active)
    return () => setFit(false)
  }, [setFit, active])
}
