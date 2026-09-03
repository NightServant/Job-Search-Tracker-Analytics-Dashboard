'use client'

import { motion } from 'motion/react'
import React from 'react'
import type { Swiper as SwiperClass } from 'swiper'
import { Autoplay, EffectCreative, Navigation, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/css'
import 'swiper/css/effect-creative'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

/**
 * Skiper UI's "Creative carousel 002" (skiper51), vendored via the shadcn
 * registry and then edited to this design system. M6 Task 1.
 *
 * ATTRIBUTION IS A LICENCE OBLIGATION, NOT A COURTESY. Skiper UI's free tier
 * requires crediting Skiper UI, and the registry copies source in-tree rather
 * than installing a package, so the obligation attaches to THIS FILE. The
 * credit sentence lives in `SKIPER_ATTRIBUTION` in src/lib/attribution.ts and
 * is asserted verbatim against README.md by a test. Do not delete this file
 * without also removing its entry there, and do not remove the entry while the
 * file is still here.
 *
 * Seven edits were made to the downloaded source. Each one is a project
 * constraint the vendor default contradicts:
 *
 * 1. lucide-react -> @/components/icons. The Global Constraint is one icon
 *    vocabulary; shadcn copies source in-tree, so this is an edit, not a fork.
 *    The chevrons are passed `size={24}` rather than an `h-6 w-6` class:
 *    AnimateIcons' root is a <div>, not an <svg>, so a Tailwind size class
 *    would size the wrapper while the glyph stayed at its own default. See the
 *    docblock in src/components/icons/index.ts.
 * 2. `onSwiper` added and forwarded. M6 6.1a drives this carousel with
 *    setProgress(0..1) from the pinned section's scroll progress; without a
 *    handle on the instance there is nothing to call it on, and Task 3 is
 *    unbuildable.
 * 3. The creative effect's `prev.shadow` was flipped off -- the vendor ships
 *    it enabled. This system is flat with hairline rules. (Stated in prose
 *    rather than quoting the vendor's literal value, because the source-shape
 *    test greps this file for that exact string and a comment quoting it would
 *    fail the check it is describing.)
 * 4. The Navigation module was ADDED to `modules`. The vendor configures
 *    `navigation={{nextEl, prevEl}}` but never registers the module, so Swiper
 *    silently ignores it and the arrows render as decoration that does
 *    nothing. Our options turn `showNavigation` on in BOTH modes, and in the
 *    scroll-driven mode touch is off, so the arrows are the only control there
 *    is -- and the keyboard affordance.
 * 5. framer-motion -> motion/react. The registry pulled framer-motion in
 *    beside the `motion` package this repo already depends on: the same
 *    library under its old name. Every other import in src/ is motion/react.
 * 6. Hardcoded colours and radii -> tokens, radius capped at 4px
 *    (`rounded-md`). The vendor drew 25px slide corners and a #f5f4f3 stage.
 * 7b. The slide image carries a hairline `border-border-subtle`. These are
 *    screenshots of a mostly-white application shown on a mostly-white
 *    section, so without a frame the app's own edges dissolve into the page
 *    and the screen looks like it is bleeding rather than being presented.
 *    A hairline is how this design system contains things; a shadow is not.
 *
 * 7a. `scale-105` removed from the slide image. The vendor zooms each slide
 *    5% to hide the seams of its own sample photography; our slides are
 *    SCREENSHOTS, where a 5% zoom crops the app chrome at every edge -- the
 *    sidebar on the left, the last table row at the bottom. A screenshot has
 *    no seams to hide and every edge of it is content.
 *
 * 7. The vendor's `Skiper51` demo export was dropped. It hardcoded eleven
 *    /images/x.com/*.jpeg paths that do not exist in this repo's public/, so
 *    it could only ever render eleven broken images. `Carousel_005` is the
 *    component; the demo was its showcase harness.
 *
 * The vendor's inline <style> block was also removed. Its rules now live in
 * one commented block in src/index.css, so the whole Swiper reconciliation can
 * be read in one place rather than half here and half there.
 */

export interface Carousel005Props {
  /**
   * One entry per slide, each carrying BOTH theme captures. See the render for
   * why both ship rather than one being chosen in JavaScript.
   */
  images: { srcLight: string; srcDark: string; alt: string }[]
  className?: string
  showPagination?: boolean
  showNavigation?: boolean
  loop?: boolean
  autoplay?: boolean
  spaceBetween?: number
  /**
   * Hands the Swiper instance up to the caller. M6 6.1a's useCarouselProgress
   * needs it to call setProgress and to flip allowTouchMove between the
   * scroll-driven and conventional modes.
   */
  onSwiper?: (swiper: SwiperClass) => void
}

const Carousel_005 = ({
  images,
  className,
  showPagination = false,
  showNavigation = false,
  loop = true,
  autoplay = false,
  spaceBetween = 0,
  onSwiper,
}: Carousel005Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        duration: 0.3,
        delay: 0.5,
      }}
      className={cn('relative w-full max-w-4xl px-5', className)}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <Swiper
          spaceBetween={spaceBetween}
          onSwiper={onSwiper}
          autoplay={
            autoplay
              ? {
                  delay: 1500,
                  disableOnInteraction: true,
                }
              : false
          }
          effect="creative"
          grabCursor={true}
          slidesPerView="auto"
          centeredSlides={true}
          loop={loop}
          pagination={
            showPagination
              ? {
                  clickable: true,
                }
              : false
          }
          navigation={
            showNavigation
              ? {
                  nextEl: '.swiper-button-next',
                  prevEl: '.swiper-button-prev',
                }
              : false
          }
          className="Carousal_005"
          creativeEffect={{
            prev: {
              shadow: false,
              translate: [0, 0, -400],
            },
            next: {
              translate: ['100%', 0, 0],
            },
          }}
          modules={[EffectCreative, Navigation, Pagination, Autoplay]}
        >
          {images.map((image, index) => (
            <SwiperSlide key={index} className="">
              {/*
                BOTH CAPTURES SHIP, AND CSS PICKS ONE. The obvious alternative
                is reading next-themes' resolvedTheme and setting one `src`,
                which halves the bytes -- and it is wrong twice. next-themes
                only knows the resolved theme AFTER mount, so the server render
                has to guess, and every dark-theme visitor gets a flash of the
                light screenshot; and a first client render that disagrees with
                the server is a hydration mismatch.
                `dark:` here is the class variant this app already defines
                (@custom-variant in index.css), so it follows the THEME TOGGLE
                rather than the OS -- which `<picture media>` would not. Both
                are lazy, and the carousel is section 4, so neither is fetched
                until it is near the viewport.
              */}
              <img
                className="h-full w-full rounded-md border border-border-subtle object-cover dark:hidden"
                src={image.srcLight}
                alt={image.alt}
                loading="lazy"
                decoding="async"
              />
              <img
                className="hidden h-full w-full rounded-md border border-border-subtle object-cover dark:block"
                src={image.srcDark}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
              />
            </SwiperSlide>
          ))}
          {showNavigation && (
            <div>
              <div className="swiper-button-next after:hidden">
                <ChevronRightIcon size={24} />
              </div>
              <div className="swiper-button-prev after:hidden">
                <ChevronLeftIcon size={24} />
              </div>
            </div>
          )}
        </Swiper>
      </motion.div>
    </motion.div>
  )
}

export { Carousel_005 }

/**
 * Skiper 51 Carousel_005 — React + Swiper
 * Built with Swiper.js - Read docs to learn more https://swiperjs.com/
 * Illustrations by AarzooAly - https://x.com/AarzooAly
 *
 * License & Usage:
 * - Free to use and modify in both personal and commercial projects.
 * - Attribution to Skiper UI is required when using the free version.
 * - No attribution required with Skiper UI Pro.
 *
 * Feedback and contributions are welcome.
 *
 * Author: @gurvinder-singh02
 * Website: https://gxuri.me
 * Twitter: https://x.com/Gur__vi
 */
