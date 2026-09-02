import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SOCIAL_PROOF } from './content'

/**
 * Section 2. LOCKED: this project has one author and no users.
 *
 * There are no testimonials here, no invented user counts and no logo walls,
 * and there will not be -- not because they are hard, but because they are
 * false, they are the first thing a technical interviewer checks, and a
 * portfolio piece that lies about traction argues against its own author.
 * Every tile is something a visitor verifies in under a minute.
 *
 * No <img> and no quoted text anywhere in this subtree: Landing.test.tsx fails
 * the moment either appears, which is the guard, not the intent.
 *
 * The tiles are the same shape a testimonial is. If there are ever real users,
 * they go here and nothing about the layout has to change.
 */
export function SocialProof() {
  return (
    <section
      data-landing-section="social-proof"
      className="px-5 py-20 md:px-16"
    >
      <h2 className="mb-10 text-heading-l text-text-primary">{SOCIAL_PROOF.heading}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SOCIAL_PROOF.tiles.map((tile) => (
          <Card key={tile.title}>
            <CardHeader>
              <CardTitle className="text-heading-s">{tile.title}</CardTitle>
              <CardDescription className="text-body-s">{tile.body}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={tile.href}
                {...(tile.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                className="text-body-s text-accent-default underline underline-offset-4"
              >
                {tile.linkLabel}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
