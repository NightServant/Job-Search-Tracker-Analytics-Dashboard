'use client'

import * as React from 'react'
import type { PinnedSection } from './usePinnedSection'

/**
 * The wrapper that actually holds a section in the viewport.
 *
 * The outer div is the scroll distance; the inner sticky div is what the
 * viewer sees held in place. Height comes from usePinnedSection, which gets it
 * from lib/pinnedScroll -- NOT from the Figma frame. The frame height is the
 * drawn height, not the scroll height: a pinned section needs scroll distance
 * allocated for its hold, so the real page is materially taller than the
 * 3102px desktop mockup.
 *
 * Used TWICE and far apart -- once around the hero (section 1) and once around
 * the screen carousel (inside section 4). It renders exactly one section so
 * that ordinary sections can sit between the two. An earlier design emitted
 * both wrappers as adjacent siblings and could not express that page.
 *
 * In normal flow -- mobile, or prefers-reduced-motion -- the same children
 * render in the same document position with no height and no sticky layer.
 * Children are inside the element in BOTH branches; an earlier draft rendered
 * empty marker divs and put the children elsewhere, which meant the unpinned
 * path was a different tree from the pinned one and only one of them was ever
 * really tested.
 */
export interface PinnedBlockProps {
  section: PinnedSection
  /** 'hero' | 'carousel'. Becomes data-testid="pinned-<name>". */
  name: string
  children: React.ReactNode
}

export function PinnedBlock({ section, name, children }: PinnedBlockProps) {
  if (!section.pinned) {
    return (
      <div ref={section.ref} data-testid={`pinned-${name}`} data-pinned="false">
        {children}
      </div>
    )
  }

  return (
    <div
      ref={section.ref}
      data-testid={`pinned-${name}`}
      data-pinned="true"
      style={{ height: `${section.heightPx}px` }}
    >
      {/*
        flex-COL, not flex-row. As a row, the single child becomes a flex item
        and sizes to its content -- which rendered the full-bleed hero at about
        two thirds of the viewport width with white beside it. In a column the
        cross axis is horizontal, and the default `align-items: stretch` gives
        the child the full width it expects.

        `justify-center` rather than stretching the child to fill. An earlier
        attempt used `[&>*]:flex-1`, which gives the child a zero flex-basis --
        harmless for the hero, fatal for the carousel: Swiper measures its
        container on init, measured zero, left snapGrid empty, and then threw
        on snapGrid[0] the first time anything touched it. Centring gives the
        hero the same visual result without lying to a child about its height.
      */}
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        {children}
      </div>
    </div>
  )
}
