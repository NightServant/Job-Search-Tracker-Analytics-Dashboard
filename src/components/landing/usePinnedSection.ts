'use client'

import * as React from 'react'
import { useScroll, useMotionValueEvent } from 'motion/react'
import { clamp01 } from '@/lib/pinnedScroll'

/**
 * One pinned section: the hero, or the screen carousel.
 *
 * PINNING, NOT PARALLAX. Parallax moves layers at different speeds; this holds
 * one section in the viewport while scroll advances it, then releases it. CSS
 * position: sticky does the holding (see PinnedBlock) -- never JavaScript.
 * Sticky is native, keeps the scrollbar honest, survives keyboard paging and
 * in-page anchors, and degrades to normal flow where unsupported. useScroll is
 * used ONLY to read a progress value inside an already-pinned section; it
 * never takes over scrolling.
 *
 * This is a hook called twice, not a component owning both sections, because
 * the two pinned blocks are FOUR SECTIONS APART: the hero is section 1 and the
 * carousel lives inside section 4, with social proof and the problem statement
 * between them. An earlier draft emitted both pin wrappers as adjacent
 * siblings and could not express that page at all.
 *
 * `pinned` is a parameter, not a decision made here. Both calls must agree,
 * and Landing computes shouldPin(reduced, width) once for exactly that reason
 * -- two callers each deriving it could straddle a resize and pin the hero
 * while the carousel sat in flow.
 */
export interface PinnedSection {
  ref: React.RefObject<HTMLDivElement | null>
  pinned: boolean
  progress: number
  released: boolean
  heightPx: number | undefined
}

export function usePinnedSection(holdHeightPx: number, pinned: boolean): PinnedSection {
  const ref = React.useRef<HTMLDivElement>(null)
  const [progress, setProgress] = React.useState(0)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    // Guarded rather than conditionally subscribed: hooks cannot be called
    // conditionally, and an unpinned section produces no meaningful progress
    // anyway because nothing is sticky.
    if (!pinned) return
    setProgress(clamp01(v))
  })

  // Held at zero rather than merely ignored when unpinned. A stale progress
  // left over from before a resize would keep driving the carousel after the
  // pin was dropped.
  const effectiveProgress = pinned ? progress : 0

  return {
    ref,
    pinned,
    progress: effectiveProgress,
    released: pinned && effectiveProgress >= 1,
    heightPx: pinned ? holdHeightPx : undefined,
  }
}
