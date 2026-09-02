/**
 * The two Swiper configurations the landing carousel runs in.
 *
 * Touch is the only thing that differs, and the selector is a single question:
 * is scroll driving this carousel right now? When it is, the section is pinned
 * and page scroll advances the slides, so direct manipulation is off and would
 * only fight the scroll. When it is not -- under prefers-reduced-motion, or
 * below the pin breakpoint, where mobile never pins at all -- nothing drives
 * setProgress, so touch is the only way through and must come back.
 *
 * Keyed on `scrollDriven` rather than on `reduced` deliberately. Two separate
 * conditions turn pinning off and a third could be added later; each one
 * growing its own branch here is how the reduced-motion path and the mobile
 * path drift into disagreeing about the same carousel.
 *
 * loop is false in both. The scroll-driven path needs a last slide so the pin
 * can release deterministically; a conventional carousel does not benefit
 * enough from looping to justify keeping two configurations in step.
 *
 * Arrows are on in both. They are the keyboard affordance, and with touch off
 * the scroll-driven mode would otherwise have no control at all.
 *
 * UNRECONCILED: these names are taken from the M6 plan's description of
 * skiper51, NOT from the vendored source -- `src/components/v1/skiper51.tsx`
 * does not exist yet, because `shadcn add @skiper-ui/skiper51` has not been
 * run. When it lands, read its props and reconcile this interface against
 * them; the plan's own Step 2 is explicit that the prop list was written from
 * the website rather than from the file.
 */
export interface SwiperCarouselOptions {
  loop: false
  autoplay: false
  allowTouchMove: boolean
  simulateTouch: boolean
  showNavigation: true
  shadow: false
}

export const SCROLL_DRIVEN_OPTIONS: SwiperCarouselOptions = {
  loop: false,
  autoplay: false,
  allowTouchMove: false,
  simulateTouch: false,
  showNavigation: true,
  shadow: false,
}

export const REDUCED_MOTION_OPTIONS: SwiperCarouselOptions = {
  loop: false,
  autoplay: false,
  allowTouchMove: true,
  simulateTouch: true,
  showNavigation: true,
  shadow: false,
}

export function carouselOptionsFor(scrollDriven: boolean): SwiperCarouselOptions {
  return scrollDriven ? SCROLL_DRIVEN_OPTIONS : REDUCED_MOTION_OPTIONS
}
