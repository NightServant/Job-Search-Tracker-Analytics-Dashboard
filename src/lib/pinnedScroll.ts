import { MD_BREAKPOINT_PX } from './breakpoints'

/**
 * The scroll maths behind M6 6.1a's PINNED sequence.
 *
 * Pinning, not parallax. Parallax moves layers at different speeds; this holds
 * two stacked sections in the viewport while scroll advances them, then
 * releases each one. Say pinning in code and comments so nobody builds
 * depth-layer parallax by mistake.
 *
 * These are pure functions for the same reason lib/calendar.ts and
 * lib/analyticsRange.ts are: jsdom has no layout engine, so a test cannot
 * scroll a real sticky section. Keeping the boundary maths out here means the
 * hard part is unit-tested and the React layer only has to wire it up.
 *
 * The Figma frame height is not the scroll height. A pinned section needs
 * scroll distance allocated for its hold, so the page is materially taller
 * than the 3102px desktop mockup. Do not derive scroll maths from the frame.
 *
 * This file deliberately knows nothing about the navbar. It used to export
 * `navbarRevealed(scrollY, heroPinHeightPx, carouselPinHeightPx)`, because the
 * navbar appeared at the carousel's end -- Figma puts it at y=1414 on desktop,
 * which is exactly hero (607) + carousel (807). Under the six-section order the
 * carousel is section 4, so that position means "after two thirds of the page"
 * rather than "after the intro", and Gabe's 2026-09-02 decision replaced it:
 * the navbar is in the hero from the start and swaps colour at the hero's
 * bottom. That boundary has nothing to do with pin heights, so it lives in
 * src/lib/landingNav.ts and not here.
 */

/** The hero holds for one full viewport before releasing. */
export const HERO_HOLD_VIEWPORTS = 1

/**
 * Scroll distance allocated per slide, in viewports. Pin length scales with
 * slide count so the pace stays constant if a screen is added or removed.
 */
export const CAROUSEL_HOLD_VIEWPORTS_PER_SLIDE = 0.8

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(1, Math.max(0, n))
}

/**
 * The md breakpoint, and the only width this file knows about.
 *
 * Not a landing-page-specific number: it is what hides the sidebar
 * (`hidden md:flex`) and where M5's "no kanban below 768px" constraint sits.
 * A second responsive vocabulary for one page is how two parts of the same
 * app disagree about what "mobile" means -- which is why it is IMPORTED from
 * lib/breakpoints rather than declared here. A test in that module fails if
 * either consumer re-declares its own 768.
 */
export const PIN_MIN_WIDTH_PX = MD_BREAKPOINT_PX

/**
 * Whether the sequence pins at all.
 *
 * Two independent vetoes, and both are hard. prefers-reduced-motion is a
 * vestibular accommodation and must not be reachable around by resizing. The
 * width veto is a product decision settled 2026-08-28: mobile does not pin,
 * because a hold costs a full viewport on a 375x812 screen and reads as jank
 * under touch. It also removes the scroll-versus-gesture conflict outright --
 * on mobile the carousel is simply conventional and touchable.
 *
 * A zero width means the measuring effect has not run yet. That resolves to
 * NOT pinned, so the first paint on a phone is never a pinned layout that then
 * collapses; the reverse default would flash exactly the wrong thing on the
 * device this decision exists to protect.
 */
export function shouldPin(reduced: boolean, viewportWidthPx: number): boolean {
  if (reduced) return false
  return viewportWidthPx >= PIN_MIN_WIDTH_PX
}

/**
 * Both heights are rounded to whole pixels.
 *
 * Not cosmetic. 0.8 is not representable in binary, so
 * `800 * (1 + 3 * 0.8)` is 2720.0000000000005 -- a value that goes straight
 * into a CSS height, reads back out of getBoundingClientRect with its own
 * rounding, and makes every downstream equality comparison a guessing game.
 * A pinned section's hold has no meaningful sub-pixel component, so the noise
 * buys nothing and costs test brittleness.
 */
export function heroPinHeightPx(viewportHeightPx: number): number {
  return Math.round(viewportHeightPx * (1 + HERO_HOLD_VIEWPORTS))
}

export function carouselPinHeightPx(slideCount: number, viewportHeightPx: number): number {
  return Math.round(viewportHeightPx * (1 + slideCount * CAROUSEL_HOLD_VIEWPORTS_PER_SLIDE))
}

/**
 * The pinned section's own 0..1 progress, mapped onto Swiper's setProgress.
 *
 * One to one, and clamped. motion/react's useScroll can report slightly
 * outside 0..1 at the boundaries depending on layout rounding, and Swiper
 * treats an out-of-range progress as a request to translate past the last
 * slide.
 */
export function carouselProgressFrom(sectionProgress: number): number {
  return clamp01(sectionProgress)
}
