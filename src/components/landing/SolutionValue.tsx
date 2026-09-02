import * as React from 'react'
import { Reveal } from '@/components/motion/Reveal'
import { AnalyticsIcon, icons } from '@/components/icons'
import { Section, SectionHeading } from './Section'
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
    <Section name="solution" id="how-it-works">
      <SectionHeading
        eyebrow="the product"
        title={SOLUTION.heading}
        lede={SOLUTION.lede}
        icon={AnalyticsIcon}
      />

      <div className="grid gap-px overflow-hidden rounded-md border border-border-subtle bg-border-subtle md:grid-cols-3">
        {SOLUTION.claims.map((claim, i) => (
          <Reveal key={claim.title} delay={i * 0.08} className="h-full">
            <div className="flex h-full flex-col gap-2 bg-bg-canvas p-6">
              <h3 className="flex items-center gap-2 text-heading-s text-text-primary">
                {(() => {
                  const Glyph = icons[claim.icon]
                  return <Glyph size={16} aria-hidden className="shrink-0 text-text-muted" />
                })()}
                {claim.title}
              </h3>
              <p className="text-body-s text-text-secondary">{claim.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {children && <div className="mt-16">{children}</div>}
    </Section>
  )
}
