'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { HeroMedia } from './HeroMedia'
import { HERO } from './content'

/**
 * Section 1. Dark in both themes, because HeroMedia lays a scrim over the
 * background -- which is why every colour here is a literal rather than a
 * token, and why the eyebrow is accent-400 (#fb923c) and not accent-default:
 * accent-700 on near-black fails contrast, and the frame already made that
 * choice. Transcribed from Figma 39:369.
 *
 * Three calls to action, not two. The plan said "the CTA pair" before the
 * frame was read; the frame draws demo, create account AND read the source.
 * The third costs nothing and is the same claim social proof is built on.
 *
 * The padding leaves room for the fixed navbar overhead: the frame's own
 * pt-[120px] already accounts for a bar sitting over it.
 */
export interface HeroProps {
  posterSrc: string
  videoSrc?: string
  /** True once the hero has unpinned. Pauses the background video. */
  unpinned?: boolean
}

export function Hero({ posterSrc, videoSrc, unpinned = false }: HeroProps) {
  return (
    <section
      data-landing-section="hero"
      className="relative isolate flex min-h-[600px] flex-col justify-center gap-7 overflow-hidden px-5 pb-24 pt-32 md:px-16 md:pb-24 md:pt-[120px]"
    >
      <HeroMedia posterSrc={posterSrc} videoSrc={videoSrc} paused={unpinned} />

      <p className="text-label-caps uppercase text-accent-400">{HERO.eyebrow}</p>

      <h1 className="max-w-4xl text-display-xl text-[#fafafa]">{HERO.headline}</h1>

      <p className="max-w-[800px] text-body-l text-[rgba(250,250,250,0.82)]">{HERO.body}</p>

      <ButtonGroup className="flex-wrap gap-3">
        <Link
          href={HERO.primaryCta.href}
          data-variant="primary"
          className={buttonVariants({ variant: 'primary', size: 'm' })}
        >
          {HERO.primaryCta.label}
        </Link>
        <Link
          href={HERO.secondaryCta.href}
          data-variant="secondary"
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'm' }),
            'border-[rgba(250,250,250,0.5)] bg-transparent text-[#fafafa] hover:bg-[rgba(250,250,250,0.12)]'
          )}
        >
          {HERO.secondaryCta.label}
        </Link>
        <Link
          href={HERO.tertiaryCta.href}
          target="_blank"
          rel="noreferrer noopener"
          data-variant="secondary"
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'm' }),
            'border-[rgba(250,250,250,0.5)] bg-transparent text-[#fafafa] hover:bg-[rgba(250,250,250,0.12)]'
          )}
        >
          {HERO.tertiaryCta.label}
        </Link>
      </ButtonGroup>

      <p className="text-data-s text-[rgba(250,250,250,0.62)]">{HERO.note}</p>
    </section>
  )
}
