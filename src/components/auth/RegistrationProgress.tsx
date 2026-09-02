'use client'

import { cn } from '@/lib/utils'

/**
 * The horizontal progress bar across registration.
 *
 * Three steps, named rather than numbered alone: a bar that says "2 of 3" tells
 * someone how much is left but not what is coming, and "verify" arriving as a
 * surprise after a password form is the moment people abandon a sign-up.
 *
 * `aria-hidden` on the decorative track, with the real state carried by an
 * ordered list and aria-current -- a progress indicator that only exists as
 * colour is not a progress indicator for everyone.
 */
export interface RegistrationProgressProps {
  steps: string[]
  /** Zero-based index of the step being worked on. */
  current: number
}

export function RegistrationProgress({ steps, current }: RegistrationProgressProps) {
  if (steps.length === 0) return null

  // Complete at the LAST step, not one past it: the bar reaches full when the
  // final screen is on show, which is the thank-you.
  const fraction = steps.length <= 1 ? 1 : current / (steps.length - 1)

  return (
    <div data-registration-progress className="flex flex-col gap-3">
      <div
        aria-hidden
        className="relative h-px w-full bg-border-default"
      >
        <div
          data-progress-fill
          style={{ width: `${Math.round(fraction * 100)}%` }}
          className="absolute inset-y-0 left-0 bg-accent-default transition-[width] duration-300 ease-out motion-reduce:transition-none"
        />
      </div>

      <ol className="flex items-center justify-between">
        {steps.map((label, i) => {
          const done = i < current
          const active = i === current
          return (
            <li
              key={label}
              data-step={label}
              data-state={done ? 'done' : active ? 'current' : 'todo'}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'text-label-caps uppercase transition-colors motion-reduce:transition-none',
                active && 'text-accent-default',
                done && 'text-text-secondary',
                !active && !done && 'text-text-muted'
              )}
            >
              <span className="sr-only">
                {done ? 'Completed: ' : active ? 'Current step: ' : 'Upcoming: '}
              </span>
              {label}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
