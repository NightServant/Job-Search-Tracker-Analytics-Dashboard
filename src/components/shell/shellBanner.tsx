'use client'

import * as React from 'react'

/**
 * Whether the shell's banner should stand down for the screen currently
 * mounted.
 *
 * WHY A CONTEXT, for the third time in this directory. The demo banner is
 * passed into `AppShell` by `app/demo/layout.tsx`, which wraps every demo
 * route and has no business knowing that one of them does not want it. The
 * alternative -- a pathname check, in either the layout or the banner -- puts
 * a list of routes inside a component that exists to be route-agnostic, and
 * that list is guaranteed to fall out of step with the routes.
 *
 * So the screen says so, the same way `documentFocus` and `viewportFit`
 * already work. Claimed on mount, released on unmount, so navigating away
 * brings the banner back without anyone remembering to.
 *
 * ONLY THE TEMPLATES PAGE USES IT so far (Gabe, 2026-09-06): it is a
 * full-height grid of cards reached by a deliberate tap from a screen that
 * already carried the demo notice, and a second copy of that paragraph pushes
 * the first row of templates off a phone.
 */
const ShellBannerContext = React.createContext<(hidden: boolean) => void>(() => {})

export function ShellBannerProvider({
  setHidden,
  children,
}: {
  setHidden: (hidden: boolean) => void
  children: React.ReactNode
}) {
  return <ShellBannerContext.Provider value={setHidden}>{children}</ShellBannerContext.Provider>
}

/** Call from a screen that wants the shell banner suppressed while it is open. */
export function useHideShellBanner(active = true): void {
  const setHidden = React.useContext(ShellBannerContext)
  React.useEffect(() => {
    setHidden(active)
    return () => setHidden(false)
  }, [setHidden, active])
}
