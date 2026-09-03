/**
 * Where the landing navbar stops being part of the hero.
 *
 * The navbar is inside the hero from the first paint and blended into it --
 * transparent, light-on-dark -- and swaps to the themed treatment when the
 * reader scrolls into social proof. Gabe settled that on 2026-09-02, which
 * overturned the Figma frame (39:355, "hidden over the hero, slides down after
 * the carousel"): that annotation was drawn when the carousel was section 2,
 * and under the six-section order it is section 4, so following it would leave
 * three sections scrolling past with no navigation at all.
 *
 * The hero is DARK IN BOTH THEMES -- a background video under a scrim from
 * rgba(5,5,7,0.92) to rgba(5,5,7,0.3) -- while social proof is an ordinary
 * bg/canvas surface. So this is not decoration: one bar has to sit on two
 * grounds, and the swap is the only thing that keeps it legible on both.
 *
 * Pure, and keyed on a MEASURED hero bottom rather than on a computed pin
 * height, because the hero is pinned on desktop and in normal flow on mobile
 * and under prefers-reduced-motion -- a computed value would have to know
 * which, and would be wrong in two of the three cases. Same reason
 * lib/pinnedScroll.ts is pure: jsdom has no layout engine, so the maths is
 * testable here and the measuring lives in the component.
 */

import { MD_BREAKPOINT_PX } from './breakpoints'

/**
 * The bar's height at each breakpoint, read from the frames: 60px at 375
 * (Figma 64:1020) and 80px on desktop (39:355).
 *
 * Two numbers rather than one because the switch point is
 * `scrollY + navHeight < heroBottom` -- a single hard-coded 80 flips the
 * treatment 20px early on every phone, which is small enough to survive review
 * and plainly visible in use.
 */
export const LANDING_NAV_HEIGHT_PX = { base: 60, md: 80 } as const

/**
 * Picks the bar height for a viewport width.
 *
 * Keyed on the shared MD_BREAKPOINT_PX so the navbar and the pin cannot
 * disagree about what "mobile" means -- they are the same 768 and it is
 * declared once, in lib/breakpoints.ts.
 */
export function landingNavHeightPx(viewportWidthPx: number): number {
  return viewportWidthPx >= MD_BREAKPOINT_PX
    ? LANDING_NAV_HEIGHT_PX.md
    : LANDING_NAV_HEIGHT_PX.base
}

/**
 * True while the hero still covers the band the navbar occupies.
 *
 * `navHeightPx` is REQUIRED, deliberately. A default is exactly what would let
 * a caller forget the responsive case and still compile, and the desktop
 * height is the wrong one on the breakpoint where the error is visible.
 *
 * A `heroBottomPx` of 0 -- what the ref reports before its effect runs --
 * resolves to false, so the first paint is the themed treatment rather than
 * light-on-light text on a themed page.
 */
export function navOverHero(
  scrollYPx: number,
  heroBottomPx: number,
  navHeightPx: number
): boolean {
  return scrollYPx + navHeightPx < heroBottomPx
}
