'use client'

import * as React from 'react'

/**
 * The one viewport subscription on the landing page.
 *
 * Width decides whether the hero loads its video and (in 6.1a) whether
 * anything pins at all; height decides how much scroll a pinned hold costs.
 * Both come from here so there is a single listener and a single answer. Two
 * hooks each measuring the window is two re-render cascades and two chances to
 * disagree about what "mobile" means mid-resize.
 *
 * Returns {0,0} before the effect runs, and every consumer treats that as the
 * SMALL case: the hero shows its poster and shouldPin() reads a zero width as
 * "not pinned". So the first paint on a phone is never a desktop layout that
 * then collapses, and never a 6.8 MB video fetch started before we know what
 * device we are on.
 *
 * Written for M6 Task 2's hero; Task 3 consumes the same hook for pinning.
 */
export interface ViewportSize {
  widthPx: number
  heightPx: number
}

export function useViewportSize(override?: Partial<ViewportSize>): ViewportSize {
  const [measured, setMeasured] = React.useState<ViewportSize>({ widthPx: 0, heightPx: 0 })

  const fullyOverridden = override?.widthPx !== undefined && override?.heightPx !== undefined

  React.useEffect(() => {
    if (fullyOverridden) return
    const read = () => setMeasured({ widthPx: window.innerWidth, heightPx: window.innerHeight })
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [fullyOverridden])

  return {
    widthPx: override?.widthPx ?? measured.widthPx,
    heightPx: override?.heightPx ?? measured.heightPx,
  }
}
