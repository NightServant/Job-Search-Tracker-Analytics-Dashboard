import * as React from 'react'
import { cn } from '@/lib/utils'
import { Reveal } from '@/components/motion/Reveal'
import { AnalyticsIcon, icons } from '@/components/icons'
import { Section, SectionHeading } from './Section'
import { LANDING_TYPE } from './typography'
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
 *
 * THE THREE CLAIMS KEEP THEIR COLUMNS, unlike the problem and proof sections
 * which both became rows on 2026-09-03. That is not an inconsistency, it is
 * the distinction the layouts are for: those two are ARGUMENTS, read in
 * sequence, where each step earns the next. These three are a SET -- the
 * pipeline, the analytics, the editor are peers, and no one of them follows
 * from another. Stacking peers implies a ranking that does not exist.
 *
 * What they gained instead is room. The cells were `p-6` with 13px copy, which
 * is the density of a dashboard panel rather than a landing page; they are now
 * `p-10` with the shared item type, and each cell has a `min-h` so three
 * claims of unequal length do not leave one column short. The section fills
 * its space by making the tiles bigger, not by padding around them.
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
        {SOLUTION.claims.map((claim, i) => {
          const Glyph = icons[claim.icon]
          return (
            <Reveal key={claim.title} delay={i * 0.08} className="h-full">
              <div className="flex h-full min-h-[260px] flex-col gap-4 bg-bg-canvas p-8 transition-colors hover:bg-bg-surface md:p-10">
                {/*
                  The glyph leads on its own line here rather than sitting
                  inline with the title, which is the opposite of the problem
                  section. A tile has vertical room and no neighbouring text to
                  align to, so the mark can anchor the top-left corner; a row
                  does not, so there it stays on the title's baseline.
                */}
                <span aria-hidden className="text-text-muted">
                  <Glyph size={24} />
                </span>
                <h3 className={LANDING_TYPE.itemTitle}>{claim.title}</h3>
                <p className={cn('flex-1', LANDING_TYPE.itemBody)}>{claim.body}</p>
              </div>
            </Reveal>
          )
        })}
      </div>

      {children && <div className="mt-16">{children}</div>}
    </Section>
  )
}
