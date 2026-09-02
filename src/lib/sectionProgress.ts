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
/**
 * How far the rail's fill should reach, expressed as a fraction of the track.
 *
 * NOT page-scroll progress, and that distinction is the whole point. The dots
 * are spaced EVENLY down the track -- one per section, regardless of how tall
 * each section is -- while page progress is linear in pixels. The sections are
 * nowhere near equal: the pinned carousel block alone is 4840px against a
 * social-proof section of about 460px. So a fill driven by pixels sits at
 * roughly a third of the track while the active dot is two thirds down it, and
 * it never catches up until the very bottom of the page.
 *
 * Driving the fill from the same model as the dots makes them agree by
 * construction: the fill reaches dot `i` exactly when dot `i` becomes active,
 * and interpolates between dots by how far through the current section the
 * reader is.
 *
 * The denominator is `count - 1` because the fill spans from the FIRST dot to
 * the LAST one, not across a phantom slot after the last. A single section has
 * nothing to span, and resolves to 0 rather than dividing by zero.
 */
export function railFillFraction(
  activeIndex: number,
  sectionCount: number,
  withinSection: number
): number {
  if (sectionCount <= 1) return 0
  const i = Math.min(Math.max(activeIndex, 0), sectionCount - 1)
  return clamp01((i + clamp01(withinSection)) / (sectionCount - 1))
}

/**
 * How far the reader is through one section, 0..1.
 *
 * Measured from the same viewport midpoint `activeSectionId` uses, so the two
 * cannot disagree about which section is current and how far into it we are.
 * A section with no successor (the last one) is measured against the document
 * end instead.
 */
export function withinSectionFraction(
  scrollYPx: number,
  viewportHeightPx: number,
  sectionTop: number,
  nextTop: number
): number {
  const span = nextTop - sectionTop
  if (span <= 0) return 0
  const midpoint = scrollYPx + viewportHeightPx / 2
  return clamp01((midpoint - sectionTop) / span)
}

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
