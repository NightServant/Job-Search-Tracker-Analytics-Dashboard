'use client'

import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'

/**
 * The horizontal progress bar across registration.
 *
 * Three steps, named rather than numbered alone: a bar that says "2 of 3" tells
 * someone how much is left but not what is coming, and "verify" arriving as a
 * surprise after a password form is the moment people abandon a sign-up.
 *
 * EACH STEP CARRIES AN ICON, ABOVE THE TRACK. Gabe asked for it on 2026-09-02,
 * and the position is the useful part: icons over the rule, labels under it,
 * so the row reads as three destinations with a line drawn between them rather
 * than as a line with words underneath. The glyph is also what survives at a
 * glance -- a person scanning the top of the form sees person / shield / tick
 * and knows the shape of what they are agreeing to before reading a word of it.
 *
 * The icons are DECORATIVE and marked aria-hidden. They restate the label
 * beside them, and a screen reader announcing "user icon, your details" is
 * reading the same step twice. The `sr-only` prefix on each label -- completed
 * / current / upcoming -- is what actually carries state to a listener, since
 * the visual state is colour, and colour is not available to everyone.
 *
 * `aria-hidden` on the decorative track too, with the real state carried by an
 * ordered list and aria-current -- a progress indicator that only exists as
 * colour is not a progress indicator for everyone.
 */
export interface RegistrationStep {
  label: string
  /** Decorative; announced through the label, never on its own. */
  icon: ComponentType<{ size?: number; className?: string }>
}

export interface RegistrationProgressProps {
  steps: RegistrationStep[]
  /** Zero-based index of the step being worked on. */
  current: number
}

/** done | current | todo, in one place so the icon row and the label row cannot disagree. */
function stateOf(index: number, current: number) {
  if (index < current) return 'done' as const
  if (index === current) return 'current' as const
  return 'todo' as const
}

const TONE = {
  done: 'text-text-secondary',
  current: 'text-accent-default',
  todo: 'text-text-muted',
} as const

export function RegistrationProgress({ steps, current }: RegistrationProgressProps) {
  if (steps.length === 0) return null

  // Complete at the LAST step, not one past it: the bar reaches full when the
  // final screen is on show, which is the thank-you.
  const fraction = steps.length <= 1 ? 1 : current / (steps.length - 1)

  return (
    <div data-registration-progress className="flex flex-col gap-3">
      {/*
        EQUAL COLUMNS, CENTRED CONTENT -- the same grid as the label row below,
        so an icon sits over the middle of its own label at every width without
        either row measuring the other.
        `justify-between` was wrong for this and Gabe caught it: it aligns the
        first item to the left edge and the last to the right, which is fine
        for three wide labels and wrong for three 18px glyphs. "your details"
        is roughly six times the width of its icon, so the icon hugged the
        label's left edge rather than sitting over its centre, and the row read
        as drifting rather than as a stepper.
        minmax(0,1fr) rather than a bare 1fr: a long label in one step would
        otherwise widen its own column and shift every glyph off centre.
      */}
      <div
        data-progress-icons
        aria-hidden
        className="grid items-center"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step, i) => {
          const state = stateOf(i, current)
          const Icon = step.icon
          return (
            <span
              key={step.label}
              data-step-icon={step.label}
              data-state={state}
              className={cn(
                'flex justify-center transition-colors motion-reduce:transition-none',
                TONE[state]
              )}
            >
              <Icon size={18} />
            </span>
          )
        })}
      </div>

      <div aria-hidden className="relative h-px w-full bg-border-default">
        <div
          data-progress-fill
          style={{ width: `${Math.round(fraction * 100)}%` }}
          className="absolute inset-y-0 left-0 bg-accent-default transition-[width] duration-300 ease-out motion-reduce:transition-none"
        />
      </div>

      <ol
        className="grid items-center"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step, i) => {
          const state = stateOf(i, current)
          return (
            <li
              key={step.label}
              data-step={step.label}
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
              className={cn(
                'text-center text-label-caps uppercase transition-colors',
                'motion-reduce:transition-none',
                TONE[state]
              )}
            >
              <span className="sr-only">
                {state === 'done'
                  ? 'Completed: '
                  : state === 'current'
                    ? 'Current step: '
                    : 'Upcoming: '}
              </span>
              {step.label}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
