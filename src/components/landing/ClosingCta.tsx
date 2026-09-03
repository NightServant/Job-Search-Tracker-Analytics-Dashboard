import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button-variants'
import { Reveal } from '@/components/motion/Reveal'
import { ArrowRightIcon, InfoIcon } from '@/components/icons'
import { Section } from './Section'
import { LANDING_TYPE } from './typography'
import { CLOSING_CTA } from './content'

/**
 * Section 6. Every route out of the page, and one honest line about what the
 * demo is.
 *
 * THREE ROUTES SINCE 2026-09-03, not two: the demo, the signup, and sign-in,
 * which moved up from the footer. This is now the only place on the landing
 * page where any of the three can be reached -- the hero and the navbar each
 * gave theirs up on 2026-09-02 -- so it is also the section whose links are
 * worth a guard rather than an eyeball.
 *
 * All three are plain links, and this component runs no auth logic. The demo
 * is a URL space rather than a sign-in -- settled 2026-09-02 -- so a signed-in
 * visitor following it keeps their session, and the sign-in link is a
 * destination like any other. Task 6 owns the routes; this owns the doors.
 *
 * Card-less. It is the last thing on the page and the only section asking for
 * a decision, so it gets no competing chrome -- a bordered box here would make
 * the final ask look like one more item in a list of items.
 *
 * IT IS NO LONGER A CENTRED 2xl COLUMN. That capped the closing ask at 672px
 * inside a 1200px container, so the page's most important section was also its
 * narrowest -- an ask that visibly shrinks from the argument preceding it, with
 * a quarter of the container empty on either side. It now runs the full
 * container and splits: the ask on the left, the demo's caveat on the right.
 *
 * THE HEADING NO LONGER PICKS ITS OWN SIZE. It was `display-m` while every
 * other section title was `heading-l`, which was the drift that started the
 * 2026-09-03 type pass -- and it turned out to be the one that was RIGHT, so
 * the contract moved to meet it rather than the other way round. See
 * ./typography. This section keeps its own <h2> rather than using
 * SectionHeading because it has no eyebrow and no lede, and a heading
 * component whose two optional halves are both omitted is indirection for its
 * own sake.
 *
 * IT IS THE ONLY SECTION WITH A TOP RULE. Going full-width fixed the section
 * horizontally but cost it height -- a stacked column of heading, lede,
 * buttons and note is taller than the same content in two columns, so the
 * closing ask ended up the shortest block on a page it is supposed to finish.
 * The rule and the generous gaps under it buy that height back without
 * padding empty space: the line says "this is the end of the argument", which
 * is a job worth doing, and it is one hairline rather than the bordered box
 * the paragraph above rules out.
 *
 * The caveat is a plain bordered aside rather than an Alert. Alert is for
 * something that has gone wrong or needs attention; this is a standing fact
 * about the demo, and dressing it as a notice would make a calm sentence look
 * like a warning at the exact moment the page is asking for trust.
 */
export function ClosingCta() {
  return (
    <Section name="cta">
      <Reveal className="grid grid-cols-1 items-start gap-x-16 gap-y-12 border-t border-border-default pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:pt-20">
        <div className="flex flex-col gap-8">
          <h2 className={LANDING_TYPE.sectionTitle}>{CLOSING_CTA.heading}</h2>
          <p className={cn('max-w-2xl', LANDING_TYPE.sectionLede)}>{CLOSING_CTA.body}</p>

          {/*
            TWO ROWS, NOT ONE WRAPPING ROW -- Gabe, 2026-09-03. The two ways in
            for somebody new sit together on top; the way back for somebody
            who already has an account sits under them.

            `items-start` is what keeps this from becoming three full-width
            bars. The buttons are in a flex COLUMN, and a column stretches its
            children by default -- inside a grid track that runs to ~46rem on
            desktop, that would have given a quiet tertiary link the widest
            hit area on the page.

            The top row still wraps, so at 375px this degrades to three stacked
            buttons rather than two squeezed ones. The row/column split is the
            grouping; wrapping is what happens when the group will not fit.
          */}
          <div className="flex flex-col items-start gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={CLOSING_CTA.primary.href}
                data-variant="primary"
                className={`${buttonVariants({ variant: 'primary', size: 'm' })} group`}
              >
                {CLOSING_CTA.primary.label}
                <ArrowRightIcon size={16} aria-hidden />
              </Link>
              <Link
                href={CLOSING_CTA.secondary.href}
                data-variant="secondary"
                className={buttonVariants({ variant: 'secondary', size: 'm' })}
              >
                {CLOSING_CTA.secondary.label}
              </Link>
              {/*
                SECONDARY, NOT GHOST -- and this was built ghost first, then
                changed after looking at it.

                Ghost is the textbook variant for a tertiary action, and on the
                hierarchy argument it was right: filled, outlined, bare, falling
                off as the audience narrows. But `ghost` here is `text-secondary`
                on the canvas with no fill and no border, and alone on its own
                row with nothing to sit beside, it rendered as a stray text link
                rather than a control. Gabe asked for a BUTTON.

                The row split is already carrying the hierarchy -- new visitors
                above, returning visitors below -- and one hierarchy device
                stated clearly beats two stated weakly. The filled primary still
                takes the eye; this just has to be unmistakably clickable.

                It carries no icon. The arrow on the primary marks the one action
                that opens something immediately; repeating it here would spend
                the distinction.
              */}
              <Link
                href={CLOSING_CTA.tertiary.href}
                data-variant="secondary"
                className={buttonVariants({ variant: 'secondary', size: 'm' })}
              >
                {CLOSING_CTA.tertiary.label}
              </Link>
            </div>
          </div>
        </div>

        {/*
          Beside the buttons on desktop, under them on mobile -- it explains
          what the primary button opens, so it should be readable without
          having to leave the button behind.
        */}
        <aside className="flex gap-3 border-l-2 border-border-default pl-5 lg:mt-2">
          <span aria-hidden className="mt-0.5 shrink-0 text-text-muted">
            <InfoIcon size={18} />
          </span>
          <p className={LANDING_TYPE.itemBody}>{CLOSING_CTA.demoNote}</p>
        </aside>
      </Reveal>
    </Section>
  )
}
