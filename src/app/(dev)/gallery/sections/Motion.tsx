'use client'

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
