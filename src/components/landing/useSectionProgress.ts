'use client'

import * as React from 'react'
import {
  activeSectionId,
  railFillFraction,
  withinSectionFraction,
  type SectionTop,
} from '@/lib/sectionProgress'

/**
 * Derives the rail's state from page scroll.
 *
 * This is the PRE-PINNING implementation. M6 6.1a gives the hero and the
 * carousel their own 0..1 progress while each holds the viewport, at which
 * point raw scrollY stops being a truthful measure of how far through the
 * content the reader is -- a thousand pixels of scroll inside a pinned hero
 * advances the page not at all. Task 3 can compute `progress` from the pinned
 * sequence and pass it to SectionRail directly; this hook is then either
 * retired or fed the pinned value. SectionRail itself does not change either
 * way, which is the point of it taking props and computing nothing.
 *
 * One scroll subscription, passive, plus a resize -- section offsets move when
 * the viewport changes width and the layout reflows.
 */
export interface SectionProgress {
  activeId: string | null
  /**
   * How far the rail's fill should reach, 0..1 of the TRACK -- not of the
   * page. The dots are evenly spaced and the sections are not evenly tall, so
   * a pixel-linear value leaves the fill trailing the active dot for the whole
   * page. See railFillFraction.
   */
  progress: number
}

export function useSectionProgress(ids: string[]): SectionProgress {
  const [state, setState] = React.useState<SectionProgress>({
    activeId: ids[0] ?? null,
    progress: 0,
  })

  // The ids array is a new literal on every render at most call sites, so the
  // effect keys on its contents rather than its identity -- otherwise the
  // subscription tears down and rebuilds on every scroll-driven re-render.
  const key = ids.join(',')

  React.useEffect(() => {
    const read = () => {
      const tops: SectionTop[] = []
      for (const id of key.split(',')) {
        if (!id) continue
        const el = document.querySelector(`[data-landing-section="${id}"]`)
        if (!el) continue
        tops.push({ id, top: el.getBoundingClientRect().top + window.scrollY })
      }
      const active = activeSectionId(window.scrollY, window.innerHeight, tops)
      const index = tops.findIndex((t) => t.id === active)
      // The last section is measured against the end of the document, since
      // it has no successor to span to.
      const nextTop =
        index >= 0 && index < tops.length - 1
          ? tops[index + 1].top
          : document.documentElement.scrollHeight
      const within =
        index >= 0
          ? withinSectionFraction(window.scrollY, window.innerHeight, tops[index].top, nextTop)
          : 0

      setState({
        activeId: active,
        progress: railFillFraction(index, tops.length, within),
      })
    }

    read()
    window.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    return () => {
      window.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
    }
  }, [key])

  return state
}
