import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { buttonVariants } from '@/components/ui/button'
import { Reveal } from '@/components/motion/Reveal'
import { ArrowRightIcon } from '@/components/icons'
import { Section } from './Section'
import { CLOSING_CTA } from './content'

/**
 * Section 6. Both routes out of the page, and one honest line about what the
 * demo is.
 *
 * Both are plain links. The demo is a URL space rather than a sign-in --
 * settled 2026-09-02 -- so nothing here touches auth, and a signed-in visitor
 * following it keeps their session. Task 6 owns the routes; this owns the door.
 *
 * Centred and card-less. It is the last thing on the page and the only section
 * asking for a decision, so it gets the page's full width and no competing
 * chrome -- a bordered box here would make the final ask look like one more
 * item in a list of items.
 */
export function ClosingCta() {
  return (
    <Section name="cta">
      <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <h2 className="text-display-m text-text-primary">{CLOSING_CTA.heading}</h2>
        <p className="text-body-l text-text-secondary">{CLOSING_CTA.body}</p>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={CLOSING_CTA.primary.href}
            data-variant="primary"
            className={`${buttonVariants({ variant: 'primary', size: 'm' })} group`}
          >
            {CLOSING_CTA.primary.label}
            <ArrowRightIcon size={16} aria-hidden />
          </Link>
          <Link
            href={CLOSING_CTA.secondary.href}
            data-variant="secondary"
            className={buttonVariants({ variant: 'secondary', size: 'm' })}
          >
            {CLOSING_CTA.secondary.label}
          </Link>
        </div>

        <Alert className="mt-4 text-left">
          <AlertDescription>{CLOSING_CTA.demoNote}</AlertDescription>
        </Alert>
      </Reveal>
    </Section>
  )
}
