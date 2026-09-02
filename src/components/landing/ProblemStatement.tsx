import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PROBLEM } from './content'

/**
 * Section 3. Three pains, each naming the feature that answers it, so section
 * 4 is already earned by the time the reader arrives at it.
 *
 * No statistic is invented here. Every claim is about how a job search goes
 * wrong, which is observable, rather than about how many people it happens to,
 * which would need a source this project does not have.
 */
export function ProblemStatement() {
  return (
    <section
      data-landing-section="problem"
      className="bg-bg-surface px-5 py-20 md:px-16"
    >
      <h2 className="mb-10 text-heading-l text-text-primary">{PROBLEM.heading}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {PROBLEM.pains.map((pain) => (
          <Card key={pain.title}>
            <CardHeader>
              <CardTitle className="text-heading-s">{pain.title}</CardTitle>
              <CardDescription className="text-body-s">{pain.body}</CardDescription>
            </CardHeader>
            <CardContent>
              <Separator className="mb-4" />
              <p className="text-body-s text-text-secondary">{pain.answer}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
