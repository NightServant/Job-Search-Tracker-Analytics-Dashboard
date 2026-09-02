import { Reveal } from '@/components/motion/Reveal'
import { Separator } from '@/components/ui/separator'
import { AlertCircleIcon } from '@/components/icons'
import { Section, SectionHeading } from './Section'
import { PROBLEM } from './content'

/**
 * Section 3. Three pains, each naming the feature that answers it, so section
 * 4 is already earned by the time the reader arrives at it.
 *
 * No statistic is invented here. Every claim is about how a job search goes
 * wrong, which is observable, rather than about how many people it happens to,
 * which would need a source this project does not have.
 *
 * Numbered rather than carded. Three problems in sequence is an argument, and
 * an argument reads better as a list than as three boxes competing for the eye
 * -- which is also what lets the answer sit visibly beneath each pain instead
 * of being squeezed into a card footer.
 */
export function ProblemStatement() {
  return (
    <Section name="problem" tone="surface">
      <SectionHeading
        eyebrow="the problem"
        title={PROBLEM.heading}
        icon={AlertCircleIcon}
      />
      <ol className="grid gap-10 md:grid-cols-3 md:gap-8">
        {PROBLEM.pains.map((pain, i) => (
          <Reveal key={pain.title} delay={i * 0.08}>
            <li className="flex flex-col gap-3">
              <span className="text-data-s tabular text-text-muted">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="text-heading-s text-text-primary">{pain.title}</h3>
              <p className="text-body-s text-text-secondary">{pain.body}</p>
              <Separator className="my-1" />
              <p className="text-body-s text-text-primary">{pain.answer}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </Section>
  )
}
