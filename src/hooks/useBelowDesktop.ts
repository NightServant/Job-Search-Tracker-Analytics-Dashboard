'use client'

import * as React from 'react'

/** The `lg` breakpoint, and the one this app switches its chrome at. */
const DESKTOP_MIN_WIDTH = 1024

/**
 * Whether the viewport is narrower than `lg`.
 *
 * WHY A HOOK AND NOT A `lg:` CLASS. Most responsive work here is CSS, and
 * should be. This is for the cases where the two layouts cannot both be in the
 * DOM: the document editor's tailoring rails are interactive controls, and
 * rendering them twice -- once in the desktop rail, once in the mobile sheet
 * -- would put two of every button in the accessibility tree and two of every
 * match in a test's `getByRole`. One tree, chosen in JS.
 *
 * DEFAULTS TO DESKTOP (`false`), deliberately. The server cannot know the
 * width, so the first client render must agree with the markup it is
 * hydrating or React discards it. The correction lands in the same frame as
 * mount. This is the same shape `useTierSidebarState` already uses for the
 * sidebar, for the same reason.
 *
 * The listener re-reads on CROSSING the line rather than on every resize,
 * which is all that can change the answer.
 */
export function useBelowDesktop(): boolean {
  const [below, setBelow] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${DESKTOP_MIN_WIDTH - 1}px)`)
    const apply = () => setBelow(mql.matches)
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [])

  return below
}
