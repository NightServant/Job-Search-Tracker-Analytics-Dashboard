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
import { buttonVariants } from '@/components/ui/button-variants'
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
 * 8. THE ARROWS ARE REAL BUTTONS IN THIS DESIGN SYSTEM'S OWN CONTROL, AND
 *    THEY ARE NO LONGER SWIPER'S. This is the largest edit and it is the one
 *    Gabe asked for on 2026-09-14 -- "carousel navigation must follow the
 *    design system standards, it looks like that section implements its own
 *    design system and contradicts ours". He was more right than the complaint
 *    sounds. Measured in the browser, the arrows were `<div>`s rendering at
 *    `color: rgb(0, 122, 255)` -- Swiper's `--swiper-theme-color`, iOS blue --
 *    on a page whose only chroma is a single orange. The reconciliation rule
 *    in index.css that was supposed to paint them `text-secondary` was losing
 *    the cascade outright, because a component-level `import 'swiper/css'` is
 *    injected AFTER the global stylesheet and the two selectors tie on
 *    specificity. So the vendor's taste was not partly showing through; it was
 *    winning, and had been for as long as the file existed.
 *
 *    They were also `<div>`s with no `type`, no `role` and no label: not
 *    reachable by keyboard, announced as nothing, and disabled only by a 0.35
 *    opacity class. In the scroll-driven mode touch is off and the arrows are
 *    documented as "the only control there is -- and the keyboard affordance",
 *    which they could not have been.
 *
 *    The fix is to stop using Swiper's element names at all. `navigation` now
 *    points at `.landing-carousel-prev` / `.landing-carousel-next`, which no
 *    vendor selector matches, so every rule in swiper/css/navigation -- the
 *    44px box, the absolute inset, `color`, the disabled opacity -- simply
 *    never applies and there is no override to maintain. What paints them
 *    instead is `buttonVariants({ variant: 'secondary' })`, the same recipe
 *    the closing CTA's "create an account" button uses two sections down: the
 *    app's hairline border, its `bg-inset` hover, its accent focus ring and
 *    its press animation. Rendering a real `<button>` is also load-bearing
 *    rather than pedantic -- Swiper's Navigation module sets `el.disabled` on
 *    a BUTTON and only adds a class otherwise, so the native disabled state,
 *    and with it `disabled:opacity-50 disabled:pointer-events-none`, comes for
 *    free at the end of the carousel.
 *
 *    `rounded-md` and not the `rounded-full` src/components/ui/carousel.tsx
 *    uses for the same control in the /documents gallery. That file is
 *    allowlisted for circles; this page draws 4px corners on everything
 *    including the slides themselves, and one circular control on it would be
 *    the only round thing on the page.
 *
 * 9. THE CONTROLS MOVED OUT OF THE STAGE, into one row beneath it: dots at the
 *    leading edge, arrows at the trailing edge. Swiper floats both over the
 *    media -- arrows inset 4px from the sides, dots 8px off the bottom -- which
 *    is right for the sample photography it ships with and wrong for
 *    screenshots, where an arrow at the left edge sits exactly on top of the
 *    application's own sidebar. It is also what this repo already decided:
 *    TemplateGallery pulls the same controls out of the card strip "rather
 *    than floating over the first and last cards". The row is the full width
 *    of the stage, so both controls land on the page's 1200px grid lines
 *    rather than on the image's.
 *
 *    The dots come with it. `el`, `bulletClass`, `bulletActiveClass` and
 *    `modifierClass` are all renamed to ours for the same reason the arrows
 *    were, and `renderBullet` emits a real `<button>` carrying an sr-only
 *    label -- they were `clickable` spans, which is the identical defect the
 *    arrows had, on the same control. `horizontalClass` is deliberately left
 *    alone: every vendor rule that reads it is compounded with
 *    `.swiper-pagination-bullets`, which `modifierClass` has already renamed,
 *    so the one class that still lands on our element cannot select anything.
 *
 * The vendor's inline <style> block was also removed. Its rules now live in
 * one commented block in src/index.css, so the whole Swiper reconciliation can
 * be read in one place rather than half here and half there.
 */

/**
 * The control element names, in one place because they are written twice each
 * -- once as the class React renders and once as the selector Swiper is told
 * to query for. A typo between the two halves is a control that renders and
 * does nothing, which is exactly the failure edit 4 above describes.
 */
const PREV_CLASS = 'landing-carousel-prev'
const NEXT_CLASS = 'landing-carousel-next'
const DOTS_CLASS = 'landing-carousel-dots'
const DOT_CLASS = 'landing-carousel-dot'
const DOT_ACTIVE_CLASS = 'landing-carousel-dot-active'

/**
 * One arrow, as this app draws a square icon control.
 *
 * `size: 'm'` is the 40px every button on the landing page is, and `w-10 px-0`
 * squares it -- `buttonVariants` sizes for a label, so height comes from the
 * variant and width has to be said.
 *
 * 40px rather than the 28px `IconButton` would have given. That control is
 * sized to fit in the gutter of a 44px list row without pushing the row's
 * content, which is a real constraint and not one that applies here; at 28px
 * under a 1200px stage it would read as a leftover from a denser screen. 40px
 * is 4px under the 44px touch guideline and matched to the page's own buttons,
 * which is the trade this page already makes everywhere else -- and below md
 * the carousel is not scroll-driven, so touch drag is on and the arrows are a
 * second way in rather than the only one.
 */
const ARROW_CLASS = cn(buttonVariants({ variant: 'secondary', size: 'm' }), 'w-10 px-0')

export interface Carousel005Props {
  /**
   * One entry per slide, each carrying BOTH theme captures. See the render for
   * why both ship rather than one being chosen in JavaScript.
   */
  images: {
    srcLight: string
    srcDark: string
    /** Optional narrow-viewport variants, as a `srcset` string. */
    srcSetLight?: string
    srcSetDark?: string
    /** The slot's rendered width, for the browser to pick against. */
    sizes?: string
    alt: string
  }[]
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
                  // See edit 9 in the docblock: our element, our class names,
                  // our markup. Nothing here is a Swiper default, so nothing
                  // in swiper/css/pagination can reach the dots.
                  el: `.${DOTS_CLASS}`,
                  bulletClass: DOT_CLASS,
                  bulletActiveClass: DOT_ACTIVE_CLASS,
                  modifierClass: `${DOTS_CLASS}-`,
                  // Static markup, no interpolated content: `index` is a
                  // number Swiper counts and `className` is the constant
                  // above. `renderBullet` sets innerHTML, so it is worth
                  // saying that nothing user-supplied can reach it.
                  renderBullet: (index: number, className: string) =>
                    `<button type="button" class="${className}">` +
                    `<span class="sr-only">Screen ${index + 1}</span>` +
                    `</button>`,
                }
              : false
          }
          navigation={
            showNavigation
              ? {
                  nextEl: `.${NEXT_CLASS}`,
                  prevEl: `.${PREV_CLASS}`,
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
                `object-contain`, not `object-cover`. Cover fills the slide and
                crops whatever does not fit, which is invisible when the ratios
                agree and silent when they drift -- and they did drift: a 2.05
                screenshot in a 1.60 slide lost 28% of its height with nothing
                on screen to say so. Contain shows the whole image always, so
                the same mistake shows up as letterboxing, which somebody
                notices. The slide ratio is matched to the captures in
                index.css and asserted by a test, so there is nothing to
                letterbox in practice.

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
                className="h-full w-full rounded-md border border-border-subtle object-contain dark:hidden"
                src={image.srcLight}
                srcSet={image.srcSetLight}
                sizes={image.sizes}
                alt={image.alt}
                loading="lazy"
                decoding="async"
              />
              <img
                className="hidden h-full w-full rounded-md border border-border-subtle object-contain dark:block"
                src={image.srcDark}
                srcSet={image.srcSetDark}
                sizes={image.sizes}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {/*
          THE CONTROL ROW, and it is a SIBLING of <Swiper> rather than a child.
          Swiper renders any non-SwiperSlide child inside `.swiper`, which is
          `overflow: hidden` and is the stage the screenshots fill -- putting
          the controls there is what made them float over the image. Out here
          they are ordinary flow content one `--spacing-section` below it.

          Swiper finds them by selector, not by tree position, so the move
          costs nothing: the module resolves `nextEl` through
          `document.querySelectorAll` and binds the click itself. The whole
          tree is committed before Swiper's mount effect runs, so the elements
          exist by the time it looks.

          `justify-between` with the dots first: the dots say where you are and
          the arrows are what you press, so they take the reading order and the
          two ends of the row respectively. The row renders whenever either
          control is on; a missing dots element leaves the arrows to be pushed
          right by `justify-between` on their own.
        */}
        {(showNavigation || showPagination) && (
          <div className="mt-[var(--spacing-section)] flex items-center justify-between gap-4">
            {showPagination && <div className={cn(DOTS_CLASS, 'flex items-center gap-2')} />}

            {showNavigation && (
              <div className="ml-auto flex items-center gap-2">
                {/*
                  `type="button"` is not boilerplate here. Swiper's Navigation
                  module disables a control by setting `el.disabled` when the
                  tag is BUTTON, and a <button> with no type submits the form
                  it might one day find itself inside.

                  The label is an sr-only span rather than an aria-label, which
                  is how src/components/ui/carousel.tsx labels the same pair.
                */}
                <button type="button" className={cn(PREV_CLASS, ARROW_CLASS)}>
                  <ChevronLeftIcon size={16} />
                  <span className="sr-only">Previous screen</span>
                </button>
                <button type="button" className={cn(NEXT_CLASS, ARROW_CLASS)}>
                  <ChevronRightIcon size={16} />
                  <span className="sr-only">Next screen</span>
                </button>
              </div>
            )}
          </div>
        )}
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
