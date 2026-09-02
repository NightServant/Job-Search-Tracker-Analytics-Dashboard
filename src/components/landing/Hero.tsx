'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { HeroMedia } from './HeroMedia'
import { HERO } from './content'

/**
 * Section 1. Dark in both themes, because HeroMedia lays a scrim over the
 * background -- which is why every colour here is a literal rather than a
 * token, and why the eyebrow is accent-400 (#fb923c) and not accent-default:
 * accent-700 on near-black fails contrast, and the frame already made that
 * choice. Transcribed from Figma 39:369.
 *
 * ONE call to action: "read the source". Gabe removed the demo and
 * create-account buttons on 2026-09-02, and the frame's three-button group
 * with them.
 *
 * The hero therefore makes an argument rather than asking for a decision. Both
 * removed routes are still one click away -- `sign in` and `sign up` are in the
 * navbar directly above, and the closing CTA carries the demo and the signup
 * together with the sentence that says what the demo is. A hero that competes
 * with its own closing CTA splits the reader's attention at the point they
 * have the least reason to act.
 *
 * ButtonGroup went with them: it exists to bind a row of related buttons, and
 * a group of one is a div.
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

      <div>
        <Link
          href={HERO.sourceCta.href}
          target="_blank"
          rel="noreferrer noopener"
          data-variant="secondary"
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'm' }),
            'border-[rgba(250,250,250,0.5)] bg-transparent text-[#fafafa] hover:bg-[rgba(250,250,250,0.12)]'
          )}
        >
          {HERO.sourceCta.label}
        </Link>
      </div>
    </section>
  )
}
