import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Reveal } from '@/components/motion/Reveal'
import { CheckIcon, ExternalIcon, icons } from '@/components/icons'
import { Section, SectionHeading } from './Section'
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
    <Section name="social-proof">
      <SectionHeading
        eyebrow="verifiable"
        title={SOCIAL_PROOF.heading}
        icon={CheckIcon}
      />
      <div className="grid gap-px overflow-hidden rounded-md border border-border-subtle bg-border-subtle sm:grid-cols-2 lg:grid-cols-4">
        {SOCIAL_PROOF.tiles.map((tile, i) => (
          <Reveal key={tile.title} delay={i * 0.06} className="h-full">
            {/*
              A hairline grid rather than four floating cards: the gap-px on a
              border-coloured ground draws one-pixel rules between tiles, which
              is how this design system separates things. Four bordered boxes
              with gaps between them would be four islands.
            */}
            <Card className="h-full rounded-none border-0 bg-bg-canvas transition-colors hover:bg-bg-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-heading-s">
                  {/*
                    aria-hidden: the heading beside it already names the tile,
                    and announcing the glyph would say it twice.
                  */}
                  {(() => {
                    const Glyph = icons[tile.icon]
                    return <Glyph size={16} aria-hidden className="shrink-0 text-text-muted" />
                  })()}
                  {tile.title}
                </CardTitle>
                <CardDescription className="text-body-s">{tile.body}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  href={tile.href}
                  {...(tile.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                  className="group inline-flex items-center gap-1.5 text-body-s text-accent-default"
                >
                  <span className="underline underline-offset-4">{tile.linkLabel}</span>
                  <ExternalIcon size={14} aria-hidden />
                </Link>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
