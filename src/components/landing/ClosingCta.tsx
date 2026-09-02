import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { CLOSING_CTA } from './content'

/**
 * Section 6. Both routes out of the page, and one honest line about what the
 * demo is.
 *
 * Both are plain links. The demo is a URL space rather than a sign-in --
 * settled 2026-09-02 -- so nothing here touches auth, and a signed-in visitor
 * following it keeps their session. Task 6 owns the routes; this owns the door.
 */
export function ClosingCta() {
  return (
    <section data-landing-section="cta" className="px-5 py-20 md:px-16">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle className="text-heading-l">{CLOSING_CTA.heading}</CardTitle>
          <CardDescription className="text-body-l">{CLOSING_CTA.body}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-3">
            <Link
              href={CLOSING_CTA.primary.href}
              data-variant="primary"
              className={buttonVariants({ variant: 'primary', size: 'm' })}
            >
              {CLOSING_CTA.primary.label}
            </Link>
            <Link
              href={CLOSING_CTA.secondary.href}
              data-variant="secondary"
              className={buttonVariants({ variant: 'secondary', size: 'm' })}
            >
              {CLOSING_CTA.secondary.label}
            </Link>
          </div>
          <Alert>
            <AlertDescription>{CLOSING_CTA.demoNote}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </section>
  )
}
