'use client'

import { useEffect } from 'react'
import { carouselProgressFrom } from '@/lib/pinnedScroll'

/**
 * Drives the PINNED carousel from the section's scroll progress, and switches
 * the whole component between its two modes.
 *
 * `scrollDriven` is the single question, not `reduced`. Three conditions turn
 * driving off -- prefers-reduced-motion, a viewport below 768px (mobile does
 * not pin, settled 2026-08-28), and simply not being inside the pin yet -- and
 * the carousel behaves identically under all three. Branching on each would be
 * three chances for the mobile path and the reduced-motion path to drift into
 * disagreeing about the same component.
 *
 * Driven: page scroll advances the slides while the section is pinned, so
 * direct manipulation is off -- a drag and a scroll are the same gesture on
 * touch and they would fight. setProgress(0..1) rather than slideNext() on
 * thresholds, because progress mapping is what makes the movement track the
 * scrollbar instead of snapping between slides.
 *
 * Not driven: the section is in normal flow, nothing drives progress, and touch
 * comes back. Without that restoration the carousel would be frozen on slide
 * one for everyone who asked for less motion AND every mobile visitor, which
 * is most of them.
 *
 * The value ultimately derives from usePrefersReducedMotion() and a measured
 * viewport width, both of which are subscribed rather than read once -- so
 * changing the OS setting or crossing 768px with the page open re-runs both
 * effects here.
 *
 * Swiper exposes allowTouchMove as an instance property that shadows
 * params.allowTouchMove; setting only the params object does not take effect
 * until the next update, so both are written -- when params exists. It does
 * not always, so the write to it is guarded; see DrivableSwiper.
 */
export interface DrivableSwiper {
  setProgress(progress: number, speed?: number): void
  allowTouchMove: boolean
  /**
   * OPTIONAL, because a real Swiper instance does not always have it when
   * onSwiper fires.
   *
   * This was typed as required and the hook wrote through it unguarded, which
   * threw "Cannot set properties of undefined (setting 'allowTouchMove')" the
   * moment Landing handed it a real instance instead of a test double -- a
   * type that promised something the production object could not deliver, and
   * a fixture that had been satisfying it all along. The instance property is
   * the one that actually takes effect anyway; params is the fallback Swiper
   * reads on its next update.
   */
  params?: { allowTouchMove: boolean; simulateTouch: boolean }
  /**
   * Swiper's own readiness flag, and the reason this hook does not simply
   * drive whatever it is handed.
   *
   * `onSwiper` fires with a PARTIALLY BUILT instance: measured live, both
   * `initialized` and `snapGrid` are `undefined` at that moment. setProgress
   * reads snapGrid[0], so driving straight away throws -- which is what put
   * "Cannot read properties of undefined (reading '0')" on the landing page.
   *
   * Undefined is treated as not-ready. The flag flips to true on the same
   * object without React re-rendering, so nothing re-runs on that transition;
   * the next scroll changes `progress`, the effect runs again, and by then the
   * instance is real. The only cost is that the very first progress value is
   * not applied -- and that value is 0, which is where a fresh carousel
   * already sits.
   */
  initialized?: boolean
}

export function useCarouselProgress(
  swiper: DrivableSwiper | null,
  progress: number,
  scrollDriven: boolean
): void {
  useEffect(() => {
    if (!swiper) return
    swiper.allowTouchMove = !scrollDriven
    if (swiper.params) {
      swiper.params.allowTouchMove = !scrollDriven
      swiper.params.simulateTouch = !scrollDriven
    }
  }, [swiper, scrollDriven])

  useEffect(() => {
    if (!swiper || !scrollDriven) return
    // Swiper's own flag. See DrivableSwiper.initialized: onSwiper hands over
    // an instance that is not finished being built.
    if (!swiper.initialized) return
    try {
      // speed 0. setProgress(progress, speed) animates over `speed` ms, and a
      // non-zero speed makes the slides lag the scrollbar -- the snapping the
      // roadmap rules out.
      swiper.setProgress(carouselProgressFrom(progress), 0)
    } catch {
      // A BACKSTOP, not the fix. The `initialized` check above is what stops
      // the known case; this catches whatever else a vendor method might
      // demand of a state we cannot see from out here.
      //
      // Narrow on purpose -- this is the only vendor call in the file. A throw
      // inside a passive effect unmounts the React tree, so the cost of not
      // catching is a blank landing page, while the cost of catching is a
      // carousel one frame behind. The carousel is an enhancement over a list
      // of screenshots; the page has to survive it failing.
    }
  }, [swiper, progress, scrollDriven])
}
