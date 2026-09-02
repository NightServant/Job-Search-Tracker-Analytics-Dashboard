import * as React from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SOLUTION } from './content'

/**
 * Section 4. The product in two halves: the value claims, then the screens.
 *
 * The carousel is passed in as `children` rather than rendered here, because
 * 6.1a wraps it in a PinnedBlock that Landing places -- this section is the
 * fourth on the page and the carousel is the second thing pinned, four
 * sections after the hero. Keeping the wrapper outside means this component
 * knows nothing about pinning.
 *
 * `id="how-it-works"` is the nav anchor. It is on the SECTION rather than the
 * heading so a jump lands at the top of the block, which is where the hold
 * begins once Task 3 pins the carousel inside it.
 */
export interface SolutionValueProps {
  children?: React.ReactNode
}

export function SolutionValue({ children }: SolutionValueProps) {
  return (
    <section
      id="how-it-works"
      data-landing-section="solution"
      className="px-5 py-20 md:px-16"
    >
      <h2 className="text-heading-l text-text-primary">{SOLUTION.heading}</h2>
      <p className="mt-3 max-w-2xl text-body-l text-text-secondary">{SOLUTION.lede}</p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {SOLUTION.claims.map((claim) => (
          <Card key={claim.title}>
            <CardHeader>
              <CardTitle className="text-heading-s">{claim.title}</CardTitle>
              <CardDescription className="text-body-s">{claim.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="mt-12">{children}</div>
    </section>
  )
}
