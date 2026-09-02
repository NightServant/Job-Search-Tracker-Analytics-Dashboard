'use client'

import { cn } from '@/lib/utils'
import { CheckIcon, CloseIcon } from '@/components/icons'
import { passwordRequirements } from '@/lib/credentials'

/**
 * The live checklist under the password field.
 *
 * Every rule is shown from the START, unmet, rather than appearing as it is
 * broken. Someone choosing a password can then satisfy all of them in one go;
 * revealing rules one at a time turns a single decision into a guessing game,
 * and guessing is what produces Password1!.
 *
 * A met rule turns green AND gains a tick; an unmet one turns red AND gains a
 * cross. Colour alone would carry the whole signal, which fails for the eight
 * percent of men with a red-green deficiency -- and red-green is exactly the
 * pair that goes, so the glyph is not decoration here, it is the fallback.
 *
 * THREE STATES, NOT TWO, and the third is the one worth explaining. `pristine`
 * -- nothing typed yet -- draws every rule muted grey with an empty box, and
 * only once a single character exists does an unfulfilled rule turn red. Gabe
 * asked for red crosses on 2026-09-03; this is that, with one exception, and
 * the exception is not a hedge. The list is now permanently on the form, so
 * without it the signup screen would OPEN as six red failures against a
 * visitor who has done nothing wrong yet. Red means "you got this wrong", and
 * nobody can be wrong before they have typed. The moment they do, every rule
 * they have not met is red, which is what was asked for and is when it starts
 * being true.
 *
 * The list is `aria-live="polite"` so a screen reader hears rules being met as
 * they are typed, rather than only discovering them on a rejected submit.
 */
export interface PasswordRequirementsProps {
  password: string
}

type RequirementState = 'met' | 'unmet' | 'pristine'

const TEXT_TONE: Record<RequirementState, string> = {
  met: 'text-status-offer-mark',
  unmet: 'text-status-rejected-mark',
  pristine: 'text-text-muted',
}

const BOX_TONE: Record<RequirementState, string> = {
  met: 'border-status-offer-mark bg-status-offer-mark/10',
  unmet: 'border-status-rejected-mark bg-status-rejected-mark/10',
  pristine: 'border-border-default',
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const reqs = passwordRequirements(password)
  const pristine = password.length === 0

  return (
    <ul
      data-password-requirements
      aria-live="polite"
      className="flex flex-col gap-1.5"
    >
      {reqs.map((req) => {
        const state: RequirementState = req.met ? 'met' : pristine ? 'pristine' : 'unmet'
        return (
          <li
            key={req.id}
            data-requirement={req.id}
            data-met={req.met ? 'true' : 'false'}
            // `data-met` stays a strict boolean for the validation logic and
            // the tests that read it; `data-state` is the presentational
            // three-way. One attribute doing both jobs is how "pristine"
            // would end up meaning "met" somewhere downstream.
            data-state={state}
            className={cn(
              'flex items-center gap-2 text-body-s transition-colors motion-reduce:transition-none',
              TEXT_TONE[state]
            )}
          >
            <span
              aria-hidden
              className={cn(
                'grid h-4 w-4 shrink-0 place-items-center rounded-sm border transition-colors',
                'motion-reduce:transition-none',
                BOX_TONE[state]
              )}
            >
              {state === 'met' && <CheckIcon size={11} />}
              {state === 'unmet' && <CloseIcon size={11} />}
            </span>
            <span>{req.label}</span>
            {/* The glyph is decorative; this is what a screen reader hears. */}
            <span className="sr-only">{req.met ? ' — met' : ' — not yet met'}</span>
          </li>
        )
      })}
    </ul>
  )
}
