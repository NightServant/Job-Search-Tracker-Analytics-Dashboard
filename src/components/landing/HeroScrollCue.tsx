'use client'

import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { scrollToSection } from '@/lib/scrollToSection'
import { ChevronDownIcon } from '@/components/icons'

/**
 * The hero's "there is more below this" control (Gabe, 2026-09-15: "should
 * have an indicator to scroll down -- make sure it hooks users' attention").
 *
 * IT IS A BUTTON, NOT A DECORATION, and that is the whole reason it earns its
 * pixels. A bouncing chevron that does nothing when pressed is the worst of
 * both worlds: it looks like an affordance, so somebody taps it, and then the
 * page ignores them. This one calls the same `scrollToSection` the navbar's
 * links and the rail's dots call, so the hero's exit is reachable by click, by
 * Enter and by Tab like every other destination on the page.
 *
 * IT MOVES, AND THE MOVEMENT IS THE POINT. The hero holds the viewport under
 * a pin, so on a desktop the page LOOKS static for the first turn of the
 * wheel -- which is exactly when a reader decides whether anything is under
 * it. A 24px capsule with a chevron travelling down it is the only thing on a
 * deliberately still composition that is in motion, which is what makes the
 * eye go there.
 *
 * `animate-bounce` IS NOT USED, and that is a judgement rather than an
 * oversight. Tailwind's bounce is a ball hitting a floor -- a fast fall, a hard
 * stop and a squash -- which is a cartoon gesture on a Swiss page whose only
 * other motion is a 150ms colour fade. The chevron travels the inside of the
 * capsule on a linear-ish ease instead, fading at both ends, which reads as
 * "keep going" rather than as a toy.
 *
 * THE MOUSE-SHAPED CAPSULE IS DRAWN IN CSS, not imported. It is a rounded
 * rectangle with a hairline border, which this design system already owns;
 * adding a `mouse` glyph to `@/components/icons` for one landing-page cue
 * would put a drawing in the shared vocabulary that nothing else can use.
 *
 * REDUCED MOTION KEEPS THE CONTROL AND DROPS THE TRAVEL. The chevron parks in
 * the capsule's upper third rather than being removed: without it the capsule
 * is an empty rounded rectangle that says nothing, and the person who asked
 * for less motion still needs to know the page continues.
 *
 * WHERE IT SITS IS LOAD-BEARING, AND THE FIRST PLACEMENT WAS WRONG. It shipped
 * at `bottom-6`, 24px off the section's bottom edge, and Gabe reported it
 * invisible in light mode within the hour. The cause is not the cue's colour:
 * HeroMedia lays a SECOND gradient over the bottom of the hero -- `from-
 * transparent to-bg-canvas` -- which carries the dark hero into the ordinary
 * page below it so the boundary is a fade rather than a hard edge. In dark
 * mode `bg-canvas` is near-black and a near-white cue over it is fine. In
 * light mode it is near-white, so a near-white cue in that band is near-white
 * on near-white. Measured at 1440x900: the fade occupied y 772-900 and the cue
 * sat at 828-876, entirely inside it.
 *
 * So the cue moved UP, out of the fade (Gabe: "my suggestion a little bit
 * higher in the hero section"), and the fade was shortened from 128px to 96px
 * to leave clearance rather than a touching edge. `bottom-28` puts the cue's
 * box at 112-160px above the section's bottom, which is 16px clear of the
 * fade's top at every viewport, because both are measured from the same edge.
 *
 * IT CANNOT COLLIDE WITH THE CTA, and that is by construction rather than by
 * luck. The hero centres its content between `pt-32` and `pb-40` (`md:pt-40`
 * and `md:pb-48`), so the content can never come closer to the bottom than the
 * bottom padding -- and that padding was raised to 160/192px precisely so it
 * is never LESS than this cue's 160px reach. Somebody lowering the hero's
 * padding without lowering this is how the two end up printed on top of each
 * other on a short laptop, which is the failure the arithmetic here is written
 * down to prevent.
 *
 * IT FADES WHEN THE HERO RELEASES. `hidden` is the same `unpinned` boolean the
 * background video's pause reads, so once the reader has started moving the
 * cue stops asking them to. It stays in the DOM and becomes `invisible` +
 * `pointer-events-none` rather than unmounting, so returning to the top brings
 * it back without a layout change, and it cannot be tabbed to while invisible.
 */
export interface HeroScrollCueProps {
  /**
   * Where the cue sends the reader: a `data-landing-section` value.
   *
   * A prop with a default rather than a constant, because the section under
   * the hero is Landing's decision -- it has moved once already, when the
   * six-section order was settled, and a hard-coded `social-proof` in here
   * would be the second place that had to be found and changed.
   */
  targetSection?: string
  /** True once the hero has released the viewport. Fades the cue out. */
  hidden?: boolean
}

export function HeroScrollCue({
  targetSection = 'social-proof',
  hidden = false,
}: HeroScrollCueProps) {
  const reduced = usePrefersReducedMotion()

  return (
    <button
      type="button"
      data-hero-scroll-cue
      data-hidden={hidden ? 'true' : 'false'}
      aria-label="Scroll to the next section"
      tabIndex={hidden ? -1 : 0}
      onClick={() => scrollToSection(targetSection, { reducedMotion: reduced })}
      className={cn(
        // Centred on the hero's own bottom edge rather than inside the content
        // column: it belongs to the section, not to the sentence above it.
        // `bottom-28`, not `bottom-6`: above HeroMedia's fade-to-canvas band,
        // which is what made this invisible in light mode. See the docblock.
        'group/cue absolute inset-x-0 bottom-28 z-10 mx-auto flex w-fit flex-col items-center gap-2',
        'text-ink-50/70 transition-[opacity,visibility,color] duration-(--duration-fast)',
        'hover:text-ink-50 focus-visible:outline-none focus-visible:text-ink-50',
        'motion-reduce:transition-none',
        hidden ? 'invisible opacity-0' : 'visible opacity-100'
      )}
    >
      <span className="text-label-caps uppercase tracking-[0.18em]">scroll</span>

      {/* The capsule. `rounded-full` on a 16x26 box resolves to an 8px radius,
          which is over the 4px cap -- and the cap governs corners on
          rectangles that HOLD CONTENT, which this does not: it is a drawing of
          a mouse, the same exemption css-spinner and the slider handle take.
          `shadcnHouseRules.test.ts` scans `src/components/ui` only, so there is
          no allowlist entry to add for a file in `landing/`; the reasoning is
          written down here instead so a later reader does not have to infer it
          from the absence of a failing test. */}
      <span
        aria-hidden
        className={cn(
          'relative flex h-[26px] w-4 justify-center overflow-hidden rounded-full border',
          'border-ink-50/45 transition-colors duration-(--duration-fast)',
          'group-hover/cue:border-ink-50/80 group-focus-visible/cue:border-ink-50/80'
        )}
      >
        <ChevronDownIcon
          size={12}
          isAnimated={false}
          className={cn(
            'absolute top-1',
            // The travel. Not rendered under the preference -- the class is
            // simply absent, so there is no animation to pause and nothing
            // that can resume if the media query is re-evaluated.
            !reduced && 'animate-hero-cue'
          )}
        />
      </span>
    </button>
  )
}
