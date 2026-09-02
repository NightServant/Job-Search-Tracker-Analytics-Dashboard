import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Reveal } from '@/components/motion/Reveal'
import { CheckIcon, ExternalIcon, icons } from '@/components/icons'
import { Section, SectionHeading } from './Section'
import { LANDING_TYPE } from './typography'
import { SOCIAL_PROOF } from './content'

/**
 * Section 2. LOCKED: this project has one author and no users.
 *
 * There are no testimonials here, no invented user counts and no logo walls,
 * and there will not be -- not because they are hard, but because they are
 * false, they are the first thing a technical interviewer checks, and a
 * portfolio piece that lies about traction argues against its own author.
 * Every entry is something a visitor verifies in under a minute.
 *
 * No <img> and no quoted text anywhere in this subtree: Landing.test.tsx fails
 * the moment either appears, which is the guard, not the intent.
 *
 * AN EDITORIAL INDEX, NOT CARDS. This was four Card components in a hairline
 * grid until 2026-09-03, when Gabe asked for the cards gone and the section
 * expanded without dead space. Both halves of that are one problem, and the
 * card was causing it: four boxes across a 1200px container gives each claim
 * roughly 290px, so every body had to be one short line, and four short lines
 * side by side occupy about 200px of a section built for far more. The section
 * looked empty BECAUSE the tiles were small, and the tiles were small because
 * they were side by side.
 *
 * Turning the row of four into a column of four inverts that. Each entry now
 * has the full measure, the numeral gives the eye something to land on, and
 * the rows breathe into the height the section always had -- the space is
 * filled by making the content bigger rather than by padding it out.
 *
 * A <dl> RATHER THAN A GENERIC STACK, and that is not pedantry: a term with a
 * definition is exactly what each entry is, and it is what makes a screen
 * reader announce "open source" as the thing being described rather than as
 * another line of prose. <dt> and <dd> also have to be wrapped in a <div> per
 * pair to be grid children, which is valid HTML and required here.
 *
 * THE LEFT RAIL IS THE GLYPH, NOT AN ORDINAL, and that is a guard doing its
 * job rather than a preference. The first draft numbered the entries 01-04 to
 * give the eye something to land on. Landing.test.tsx failed it instantly:
 * this section must contain NO DIGIT AT ALL, because the locked decision was
 * qualitative claims only and "931 tests" is the same lie as a fabricated
 * testimonial, only slower. The ordinals were decoration and could not go
 * stale -- and the guard is deliberately blunter than its reason, which is
 * what makes it hold. Loosening a locked guard to fit an ornament is the
 * wrong trade, so the ornament went. Promoting the icon into the left column
 * does the same work: four marks on one axis is a rail, which is what makes
 * this read as an index rather than four stacked paragraphs.
 *
 * The entries are the same shape a testimonial is. If there are ever real
 * users, they go here and nothing about the layout has to change.
 */
export function SocialProof() {
  return (
    <Section name="social-proof">
      <SectionHeading
        eyebrow="verifiable"
        title={SOCIAL_PROOF.heading}
        icon={CheckIcon}
      />

      {/*
        `border-t` on every row and on the list itself draws the top rule of
        the first row: one hairline per boundary, five rules for four rows,
        which is how this design system separates things. Cards would have
        drawn sixteen borders to say the same thing.
      */}
      <dl className="border-t border-border-subtle">
        {SOCIAL_PROOF.tiles.map((tile, i) => {
          const Glyph = icons[tile.icon]
          return (
            <Reveal key={tile.title} delay={i * 0.06}>
              <div
                data-proof-entry={tile.title}
                className="group grid grid-cols-1 gap-x-8 gap-y-4 border-b border-border-subtle py-8 transition-colors hover:bg-bg-surface md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-baseline md:py-10"
              >
                {/*
                  aria-hidden: the term beside it already names the entry, and
                  announcing the glyph would say it twice.
                */}
                <span
                  aria-hidden
                  className="text-text-muted transition-colors group-hover:text-accent-default md:w-10"
                >
                  <Glyph size={24} />
                </span>

                <div className="flex flex-col gap-2">
                  <dt className={LANDING_TYPE.itemTitle}>{tile.title}</dt>
                  <dd className={cn('max-w-[62ch]', LANDING_TYPE.itemBody)}>{tile.body}</dd>
                </div>

                {/*
                  The link is a third grid column on desktop so all four sit on
                  one right-hand axis -- the thing that makes this read as an
                  index rather than four paragraphs. It wraps under the body
                  below md, where there is no room for a third column.
                */}
                <Link
                  href={tile.href}
                  {...(tile.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 md:justify-self-end',
                    LANDING_TYPE.itemLink
                  )}
                >
                  <span className="underline underline-offset-4">{tile.linkLabel}</span>
                  <ExternalIcon size={14} aria-hidden />
                </Link>
              </div>
            </Reveal>
          )
        })}
      </dl>
    </Section>
  )
}
