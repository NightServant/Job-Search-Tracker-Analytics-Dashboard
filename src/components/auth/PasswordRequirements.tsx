'use client'

import { cn } from '@/lib/utils'
import { CheckIcon } from '@/components/icons'
import { passwordRequirements } from '@/lib/credentials'

/**
 * The live checklist under the password field.
 *
 * Every rule is shown from the START, unmet, rather than appearing as it is
 * broken. Someone choosing a password can then satisfy all of them in one go;
 * revealing rules one at a time turns a single decision into a guessing game,
 * and guessing is what produces Password1!.
 *
 * A met rule turns green AND gains a tick. Colour alone would carry the whole
 * signal, which fails for the eight percent of men with a red-green deficiency
 * -- and green-on-grey is exactly the pair that goes.
 *
 * The list is `aria-live="polite"` so a screen reader hears rules being met as
 * they are typed, rather than only discovering them on a rejected submit.
 *
 * IT IS ALWAYS ON THE FORM. It used to hide until the password field was
 * touched, on the reasoning that an untouched form should not open as a wall
 * of red -- Gabe overruled that on 2026-09-02, and the reasoning was wrong on
 * its own terms anyway: unmet rules render MUTED GREY, not red, so there was
 * never a wall of red to prevent. What hiding them actually cost was the one
 * moment they are worth most. Someone decides what to type BEFORE they reach
 * the field; rules that appear only once they have started have arrived after
 * the decision, and the second attempt at a password is the one people
 * abandon over.
 *
 * That is also why there is no `show` prop any more rather than a `show`
 * defaulted to true: a prop that must always be passed the same value is a
 * way for one caller to quietly disagree.
 */
export interface PasswordRequirementsProps {
  password: string
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const reqs = passwordRequirements(password)

  return (
    <ul
      data-password-requirements
      aria-live="polite"
      className="flex flex-col gap-1.5"
    >
      {reqs.map((req) => (
        <li
          key={req.id}
          data-requirement={req.id}
          data-met={req.met ? 'true' : 'false'}
          className={cn(
            'flex items-center gap-2 text-body-s transition-colors motion-reduce:transition-none',
            req.met ? 'text-status-offer-mark' : 'text-text-muted'
          )}
        >
          <span
            aria-hidden
            className={cn(
              'grid h-4 w-4 shrink-0 place-items-center rounded-sm border',
              req.met
                ? 'border-status-offer-mark bg-status-offer-mark/10'
                : 'border-border-default'
            )}
          >
            {req.met && <CheckIcon size={11} />}
          </span>
          <span>{req.label}</span>
          {/* The tick is decorative; this is what a screen reader hears. */}
          <span className="sr-only">{req.met ? ' — met' : ' — not yet met'}</span>
        </li>
      ))}
    </ul>
  )
}
