import { cn } from '@/lib/utils'
import { Reveal } from '@/components/motion/Reveal'
import { AlertCircleIcon, ArrowRightIcon, icons } from '@/components/icons'
import { Section, SectionHeading } from './Section'
import { LANDING_TYPE } from './typography'
import { PROBLEM } from './content'

/**
 * Section 3. Three pains, each naming the feature that answers it, so section
 * 4 is already earned by the time the reader arrives at it.
 *
 * No statistic is invented here. Every claim is about how a job search goes
 * wrong, which is observable, rather than about how many people it happens to,
 * which would need a source this project does not have.
 *
 * THE PAIN AND ITS ANSWER SIT SIDE BY SIDE, one row each. This was three
 * columns until 2026-09-03, and the docblock it replaces already knew that was
 * wrong -- it said "three problems in sequence is an argument, and an argument
 * reads better as a list than as three boxes" while rendering `grid-cols-3`.
 * The layout had drifted from its own stated reasoning.
 *
 * Columns cost the section twice. Each pain got a third of the width, so the
 * copy had to stay short and the whole block collapsed to a couple of hundred
 * pixels in a section built for far more -- the same "looks empty because the
 * tiles are small" problem the proof section had. And the answer, separated
 * from its pain by a horizontal rule, read as a footnote to it rather than as
 * its resolution.
 *
 * Rows fix both. The problem is on the left, the answer on the right, and the
 * arrow between them is the argument made visible: this, therefore that. A
 * reader skimming only the right-hand column gets the product; one reading
 * only the left gets the case for it.
 */
export function ProblemStatement() {
  return (
    <Section name="problem" tone="surface">
      <SectionHeading
        eyebrow="the problem"
        title={PROBLEM.heading}
        icon={AlertCircleIcon}
      />

      {/*
        `border-t` on the list plus `border-b` per row: one hairline per
        boundary. The same separation the proof section uses, so two adjacent
        sections do not each invent their own way of dividing a list.
      */}
      <ol className="border-t border-border-default">
        {PROBLEM.pains.map((pain, i) => {
          const Glyph = icons[pain.icon]
          return (
            <Reveal key={pain.title} delay={i * 0.08}>
              <li className="grid grid-cols-1 items-start gap-x-10 gap-y-6 border-b border-border-default py-10 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:py-14">
                <div className="flex flex-col gap-3">
                  <span className={cn('tabular', LANDING_TYPE.meta)}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className={cn('flex items-center gap-2', LANDING_TYPE.itemTitle)}>
                    <Glyph size={18} aria-hidden className="shrink-0 text-text-muted" />
                    {pain.title}
                  </h3>
                  <p className={LANDING_TYPE.itemBody}>{pain.body}</p>
                </div>

                {/*
                  The turn in the argument. Horizontal on desktop where the
                  answer is to the right; rotated a quarter turn below md,
                  where the answer is underneath and an arrow pointing right
                  would point at nothing. aria-hidden -- it is punctuation.
                */}
                <span
                  aria-hidden
                  className="hidden self-center text-text-muted md:block"
                >
                  <ArrowRightIcon size={20} />
                </span>

                <p className={cn('md:self-center', LANDING_TYPE.itemAnswer)}>{pain.answer}</p>
              </li>
            </Reveal>
          )
        })}
      </ol>
    </Section>
  )
}
