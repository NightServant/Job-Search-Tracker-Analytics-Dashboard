'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Reveal } from '@/components/motion/Reveal'
import { LANDING_TYPE } from './typography'
import { LANDING_RHYTHM } from './rhythm'

/**
 * The landing page's layout grid, in one place.
 *
 * Before this existed every section set its own padding and its own width --
 * the cards ran to `px-16` while the FAQ was capped at `max-w-3xl` -- so
 * nothing lined up with anything and the FAQ read as a narrow column stranded
 * beside full-bleed content. One container fixes that: every heading, card
 * edge and accordion row now starts on the same vertical line, which is the
 * single thing that most separates a page that was designed from a page that
 * was assembled.
 *
 * `max-w-wide` -- 1440px, the app's OWN `--container-wide` token -- since
 * 2026-09-15 (Gabe: "expand the width of all sections in the homepage to the
 * desirable UI/UX standard"). It was 1200, and the note that stood here argued
 * for it: "past roughly 1200 a four-card row starts to look like four islands,
 * and body copy runs past a comfortable measure."
 *
 * HALF OF THAT ARGUMENT WAS ALREADY DEAD and the other half is answered
 * elsewhere. Body copy does not run to the container: every lede is
 * `max-w-2xl`, every proof body `max-w-[62ch]`, every FAQ answer `max-w-3xl`.
 * The measure is set per block and the container never governed it, so
 * widening the container cannot lengthen a line.
 *
 * What the extra 240px actually buys is the carousel. The screenshots under
 * public/screens are 1440px wide and were being rendered into a 1200px stage
 * minus two 40px arrows -- so the one section whose entire job is showing the
 * product was showing it at 78% scale and resampling every capture on the way.
 * At 1440 the stage is the capture's own size.
 *
 * THE TOKEN, NOT A LITERAL. `--container-wide` is what the signed-in shell
 * already caps its grid screens at, and index.css describes it as the width
 * "for the grid screens where a 1440 measure is columns rather than prose".
 * The landing page is columns and screenshots; it is the same answer to the
 * same question, so it should not be a second number that happens to agree.
 *
 * IT MOVED THE FIXED RAILS WITH IT. SectionRail and SectionIndex sit in the
 * margins this container leaves, so their thresholds are arithmetic on this
 * number -- widening it here without widening them there is how a rail ends up
 * printed over the last word of a paragraph. See SectionRail for the sums.
 *
 * `tone` alternates the ground rather than drawing boxes around sections. The
 * design system separates with hairlines and surface changes, never with
 * borders and shadows, and a full-bleed surface change is what gives a long
 * page rhythm without adding chrome.
 *
 * VERTICAL RHYTHM COMES FROM ./rhythm.ts, HORIZONTAL FROM `px-gutter`. Both
 * halves of the grid are now one decision each. The vertical half used to be a
 * hardcoded `py-20 md:py-28` here and a hardcoded `mb-12` on the heading below,
 * which is how the page ended up with ten spacing values doing three jobs; see
 * that file for the measurements and for why the token is spent as a multiple
 * rather than as a literal.
 *
 * EVERY SECTION GETS A REAL `id`, defaulting to its `name`. It used to be
 * optional and only two sections passed one, so the rail's `href="#problem"`
 * and `href="#cta"` pointed at nothing and the dots silently did nothing --
 * Gabe reported it on 2026-09-03. Defaulting rather than asking each section
 * to remember is what makes "the rail can link to any section" true by
 * construction instead of by six separate acts of discipline.
 */
export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Becomes `data-landing-section`, which the tests assert order against. */
  name: string
  /**
   * The DOM id. Defaults to `name`, so every section is linkable without each
   * one remembering to say so -- see below.
   */
  id?: string
  tone?: 'canvas' | 'surface'
  children: React.ReactNode
}

export function Section({
  name,
  id,
  tone = 'canvas',
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      id={id ?? name}
      data-landing-section={name}
      className={cn(
        // scroll-mt is the NO-JAVASCRIPT FALLBACK, at the navbar's own 60/80px
        // heights. Without it a native anchor jump puts the section's top at
        // y=0, underneath the fixed bar, so the heading is hidden and the
        // section looks like it starts at its first paragraph.
        //
        // It deliberately does NOT try to match lib/scrollToSection exactly.
        // That path scrolls to the section's CONTENT so the padding does not
        // become an empty band, which here would need a NEGATIVE scroll
        // margin -- 80 + 24 - 112 -- to express. A fallback that clears the
        // bar is the right amount of fidelity for a path that only runs when
        // the handler could not.
        'w-full scroll-mt-[60px] px-gutter md:scroll-mt-[80px]',
        LANDING_RHYTHM.section,
        tone === 'surface' ? 'bg-bg-surface' : 'bg-bg-canvas',
        className
      )}
      {...props}
    >
      <div className="mx-auto w-full max-w-wide">{children}</div>
    </section>
  )
}

/**
 * A section's heading, with its animated glyph.
 *
 * The icon sits AFTER the heading rather than before it. Leading icons turn a
 * heading into a list item and pull the eye off the first word, which is the
 * one doing the work; a trailing glyph reads as punctuation and leaves the
 * type to start the line. It is `aria-hidden` for the same reason -- it
 * decorates a heading that already says what the section is, and announcing it
 * would make a screen reader read the section name twice.
 *
 * These are the AnimateIcons components, which animate on hover. The whole
 * heading row is the hover target rather than the glyph itself, because a
 * micro-interaction nobody can find is not an interaction.
 *
 * Every size here comes from LANDING_TYPE. Nothing in this file picks a type
 * class directly -- see that file for why the roles are named rather than the
 * sizes chosen per section.
 */
export interface SectionHeadingProps {
  eyebrow?: string
  title: string
  lede?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
}

export function SectionHeading({ eyebrow, title, lede, icon: Icon }: SectionHeadingProps) {
  // A HEADER ARRIVES FROM THE LEADING EDGE, so it reads as the section opening
  // rather than as another block drifting up the page with everything else.
  return (
    <Reveal variant="slideLeft" className={cn('flex flex-col gap-3', LANDING_RHYTHM.headingGap)}>
      {eyebrow && (
        <p className={LANDING_TYPE.eyebrow}>{eyebrow}</p>
      )}
      <div className="group flex items-center gap-3">
        <h2 className={LANDING_TYPE.sectionTitle}>{title}</h2>
        {Icon && (
          <span aria-hidden className="text-text-muted transition-colors group-hover:text-accent-default">
            <Icon size={26} />
          </span>
        )}
      </div>
      {lede && <p className={cn('max-w-2xl', LANDING_TYPE.sectionLede)}>{lede}</p>}
    </Reveal>
  )
}
