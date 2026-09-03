import { landingNavHeightPx } from './landingNav'

/**
 * Scrolling the landing page to one of its sections.
 *
 * WHY THIS IS NOT JUST AN ANCHOR. The rail's dots were already `<a href="#id">`
 * and five of the six went nowhere, which is the bug Gabe reported on
 * 2026-09-03. The ids came from RAIL_SECTIONS -- `hero`, `social-proof`,
 * `problem`, `solution`, `faq`, `cta` -- but the only element carrying any of
 * them as a DOM `id` was the FAQ. Every other section identified itself with
 * `data-landing-section` and nothing else, so the browser had nothing to jump
 * to and quietly did nothing. The one dot that worked worked by accident.
 *
 * ONE VOCABULARY. This resolves the target through `data-landing-section`, the
 * same attribute useSectionProgress uses to decide which dot is lit. That is
 * the point: if the click used `id` and the highlight used the data attribute,
 * they could disagree about what "the problem section" is -- which is exactly
 * the class of bug that cost a fix round in M5 when the sidebar and the bottom
 * nav each derived their own active route. Sections still get a real `id` too,
 * so the href remains a working fallback with JavaScript off.
 *
 * PINNED SECTIONS RESOLVE TO THEIR WRAPPER, and this is the part a naive
 * scrollIntoView gets wrong. The hero lives inside a PinnedBlock: a tall outer
 * div that provides scroll distance, wrapping a `sticky top-0` child that
 * holds the viewport while it passes. `[data-landing-section="hero"]` is that
 * STICKY child, so its position is wherever the pin has currently parked it --
 * scrolling to it means scrolling to where you already are, and the page does
 * not move. Walking up to `[data-pinned="true"]` finds the element whose top
 * is the real start of the section. It is written as an ancestor walk rather
 * than a hero special-case so a second pinned section needs no new code.
 *
 * The navbar is `position: fixed`, so a target scrolled exactly to y=0 sits
 * UNDER it. Every offset here subtracts the bar's height plus a little air.
 *
 * IT SCROLLS TO THE SECTION'S CONTENT, NOT ITS BOX, and that is the second
 * thing Gabe reported: the jump worked but left a large empty band at the top.
 * Sections carry `py-28` -- 112px -- which is right for READING, because it is
 * the rhythm between one section and the next while scrolling continuously. It
 * is wrong for ARRIVING: land on the section's box top and the heading sits
 * 112px further down, so a jump measured as correct still looked like it had
 * overshot into blank space. Measured before the fix, every dot put the
 * heading 163px below the navbar; the closing section, which adds its own
 * `pt-14 lg:pt-20`, put it 299px down.
 *
 * So the target is the section's inner container -- the same `mx-auto` wrapper
 * every Section renders -- whose top already excludes the padding. Reading the
 * child's rect rather than the parent's computed `padding-top` means the fix
 * holds for any section that adds its own top spacing, without this file
 * knowing which ones do.
 *
 * A PINNED SECTION IS THE EXCEPTION. Its wrapper's top IS the start of the
 * section, and the sticky child inside is a full-viewport composition rather
 * than a heading with padding above it -- consuming padding there would scroll
 * past the start of the pin. So the content-top rule applies only when the
 * resolved target is the section itself.
 */

/** Breathing room between the fixed navbar and the section heading. */
const SCROLL_GUTTER_PX = 24

/**
 * The element whose top is the true start of a section: the pin wrapper if the
 * section is inside one, otherwise the section itself.
 */
export function resolveScrollTarget(el: Element): Element {
  return el.closest('[data-pinned="true"]') ?? el
}

/**
 * The element whose top should end up under the navbar.
 *
 * For an ordinary section that is its content wrapper, so the section's own
 * top padding is scrolled past instead of being left as an empty band. For a
 * pinned section it is the wrapper itself -- see the docblock.
 */
export function scrollAnchorFor(section: Element, target: Element): Element {
  if (target !== section) return target
  return section.firstElementChild ?? section
}

/**
 * Absolute document Y to scroll to so `el` sits just below the fixed navbar.
 *
 * Clamped at 0 -- a negative scrollTo is silently treated as 0 by browsers,
 * but returning one would make this function's output untestable against the
 * value that is actually applied.
 */
export function sectionScrollTop(
  rectTop: number,
  currentScrollY: number,
  viewportWidthPx: number
): number {
  const offset = landingNavHeightPx(viewportWidthPx) + SCROLL_GUTTER_PX
  return Math.max(0, Math.round(rectTop + currentScrollY - offset))
}

export interface ScrollToSectionOptions {
  /** Skips the animation. Callers pass usePrefersReducedMotion(). */
  reducedMotion?: boolean
}

/**
 * Scroll to the landing section with this `data-landing-section` value.
 *
 * Returns false when there is no such section, so a caller can fall back to
 * the browser's own anchor handling rather than swallowing the click.
 */
export function scrollToSection(
  id: string,
  { reducedMotion = false }: ScrollToSectionOptions = {}
): boolean {
  if (typeof document === 'undefined') return false

  const section = document.querySelector(`[data-landing-section="${id}"]`)
  if (!section) return false

  const target = resolveScrollTarget(section)
  const anchor = scrollAnchorFor(section, target)
  const top = sectionScrollTop(
    anchor.getBoundingClientRect().top,
    window.scrollY,
    window.innerWidth
  )

  window.scrollTo({
    top,
    // 'auto' is the browser's instant jump. Under reduced motion a page that
    // slides for a second is the exact thing being opted out of -- the reader
    // still arrives, just without the journey.
    behavior: reducedMotion ? 'auto' : 'smooth',
  })
  return true
}
