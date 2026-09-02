'use client'

import type { Swiper as SwiperClass } from 'swiper'
import { Carousel_005 } from '@/components/v1/skiper51'
import { carouselOptionsFor } from './carouselOptions'
import type { LandingScreen } from './screens'

/**
 * The product screens, shown through skiper51 (Swiper.js).
 *
 * NOT shadcn's Carousel, which is the one named exception to "new pages are
 * built from the installed catalogue". skiper51 is not hand-rolled -- Task 1
 * vendored and credited it, and the credit is a build gate -- and 6.1a's
 * pinning is written against Swiper's instance API. Swapping in embla would
 * strip Task 1 of most of its reason to exist and rewrite Task 3. shadcn's
 * Carousel still applies everywhere else, including the /documents gallery.
 *
 * `scrollDriven` is a PROP and is not computed here. Three conditions turn
 * driving off -- reduced motion, a viewport below 768px, and simply not being
 * inside the pin yet -- and the carousel behaves identically under all three,
 * so it only ever asks "am I being driven?". Landing decides once; this
 * component must not call usePrefersReducedMotion or read a width itself.
 *
 * The Swiper instance goes UP via onSwiper rather than being driven from in
 * here, because Task 3's useCarouselProgress lives in Landing beside the
 * progress value it needs.
 */
export interface ScreenCarouselProps {
  screens: LandingScreen[]
  scrollDriven?: boolean
  onSwiper?: (swiper: SwiperClass) => void
}

export function ScreenCarousel({
  screens,
  scrollDriven = false,
  onSwiper,
}: ScreenCarouselProps) {
  const options = carouselOptionsFor(scrollDriven)

  return (
    <div data-testid="screen-carousel" data-scroll-driven={scrollDriven ? 'true' : 'false'}>
      <Carousel_005
        images={screens.map((s) => ({ src: s.src, alt: s.alt }))}
        loop={options.loop}
        autoplay={options.autoplay}
        showNavigation={options.showNavigation}
        showPagination
        onSwiper={onSwiper}
        className="mx-auto"
      />
    </div>
  )
}
