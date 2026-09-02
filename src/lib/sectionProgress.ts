/**
 * How far down the page the reader is, and which section they are in.
 *
 * Pure, for the same reason lib/pinnedScroll.ts and lib/calendar.ts are: jsdom
 * has no layout engine, so a test cannot scroll a real page. The measuring
 * lives in the hook; the decisions live here and are unit-tested at their
 * boundaries.
 *
 * Written so M6 Task 3 can drive the rail from a PINNED section's own progress
 * instead of raw scrollY -- neither function reads the DOM or the clock, so
 * whatever computes the numbers can substitute for the page-scroll version.
 */

export interface SectionTop {
  id: string
  /** Document-space offset of the section's top edge. */
  top: number
}

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(1, Math.max(0, n))
}

/**
 * Overall page progress, 0 at the top and 1 at the bottom.
 *
 * The denominator is the SCROLLABLE distance, not the document height: a page
 * one viewport tall has nowhere to scroll, and dividing by its height would
 * peg the rail at some fraction it can never leave. Zero scrollable distance
 * resolves to 0 rather than NaN or Infinity.
 */
export function pageProgress(
  scrollYPx: number,
  documentHeightPx: number,
  viewportHeightPx: number
): number {
  const scrollable = documentHeightPx - viewportHeightPx
  if (scrollable <= 0) return 0
  return clamp01(scrollYPx / scrollable)
}

/**
 * Which section the reader is looking at.
 *
 * Keyed on the viewport's MIDPOINT rather than its top edge. With the top
 * edge, a section becomes "active" the instant its first pixel appears, so the
 * rail flips to the next label while the reader is still reading the previous
 * section's last line. The midpoint is where attention actually is.
 *
 * Falls back to the first section: before any section's top has crossed the
 * midpoint the reader is in the first one, and returning nothing there would
 * leave the rail with no active dot on first paint.
 */
export function activeSectionId(
  scrollYPx: number,
  viewportHeightPx: number,
  sections: SectionTop[]
): string | null {
  if (sections.length === 0) return null
  const midpoint = scrollYPx + viewportHeightPx / 2
  let active = sections[0]
  for (const section of sections) {
    if (section.top <= midpoint) active = section
  }
  return active.id
}
