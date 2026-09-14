'use client'

import { AnalyzingDocument } from '@/components/ui/analyzing-document'
import { Reveal } from '@/components/motion/Reveal'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * The motion layer, reviewable both ways.
 *
 * The banner reports the live preference rather than describing it, because the
 * reduced-motion path is the one nobody checks -- flip the OS setting with this
 * page open and everything below should stop moving without a reload.
 */
export function Motion() {
  const reduced = usePrefersReducedMotion()

  return (
    <section className="space-y-4">
      <h2 className="text-heading-l">motion</h2>

      <div
        className="rounded-md border border-border-subtle p-4"
        data-motion-state={reduced ? 'reduced' : 'full'}
      >
        <p className="text-body-m text-text-primary">
          reduced motion is <strong>{reduced ? 'ON' : 'OFF'}</strong>.
        </p>
        <p className="text-body-s text-text-muted">
          Change it in your OS settings with this page open. Everything below reacts live -- no
          reload. Under reduced motion the reveals appear instantly and the theme wipe is skipped
          while the theme still changes.
        </p>
      </div>

      <div className="rounded-md border border-border-subtle p-4">
        <h3 className="text-heading-s text-text-primary">theme wipe</h3>
        <p className="mb-3 text-body-s text-text-muted">
          A circle grows from the button. Where View Transitions are unsupported the theme flips
          instantly -- the animation is decoration, the state change is the feature.
        </p>
        <ThemeToggle size={44} />
      </div>

      {/* THE ONE PIECE OF MOTION IN THIS APP THAT NOBODY CAN REACH TO LOOK AT.
          It renders on step three of the add-application wizard, which needs a
          session, a posting URL and a running extractor before it appears for
          the few seconds a fetch takes -- so the catalogue is the only place it
          can actually be reviewed, and reviewing motion is what this page is
          for. It is also the component whose reduced-motion path is easiest to
          get wrong: an infinite sweep is exactly what somebody who asked for
          less motion asked to be spared. Flip the OS setting with this open and
          the scan bar should vanish while the glyph stays whole. */}
      <div className="rounded-md border border-border-subtle p-4">
        <h3 className="text-heading-s text-text-primary">analysing a document</h3>
        <p className="mb-3 text-body-s text-text-muted">
          A scan line crosses the page and leaves its text behind it. Shown while the model reads
          a job posting. Under reduced motion it settles as the finished document.
        </p>
        <div className="flex items-center gap-8">
          <AnalyzingDocument className="size-12 text-text-muted" />
          <AnalyzingDocument className="size-20 text-accent-default" />
        </div>
      </div>

      <div className="rounded-md border border-border-subtle p-4">
        <h3 className="text-heading-s text-text-primary">reveal</h3>
        <p className="mb-3 text-body-s text-text-muted">
          Fades in on first intersection, once. Scroll it out and back -- it does not replay.
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          {[0, 0.08, 0.16].map((delay, i) => (
            <Reveal key={i} delay={delay} className="rounded-md bg-bg-inset p-6">
              <span className="text-body-m text-text-primary">Panel {i + 1}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
