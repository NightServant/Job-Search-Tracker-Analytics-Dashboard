'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button-variants'
import { ExternalIcon } from '@/components/icons'
import { ICON_MOTION_GROUP, iconMotion } from '@/components/icons/motion'
import { HeroMedia } from './HeroMedia'
import { HERO } from './content'

/**
 * Section 1. Dark in both themes, because HeroMedia lays a scrim over the
 * background -- which is why every colour here is a literal rather than a
 * token, and why the eyebrow is accent-400 (#fb923c) and not accent-default:
 * accent-700 on near-black fails contrast, and the frame already made that
 * choice. Transcribed from Figma 39:369.
 *
 * ONE call to action: "read the source", and it is PRIMARY. Gabe removed the
 * demo and create-account buttons on 2026-09-02 and promoted the survivor.
 *
 * Filled accent rather than the hairline-on-dark treatment it had while it was
 * the third of three: a lone secondary button reads as a button someone forgot
 * to finish. With nothing to be secondary to, the only honest weight is
 * primary -- and the accent fill is the one element that carries colour on an
 * otherwise desaturated hero, so it is also where the eye lands. The hero therefore makes an argument rather than asking for a
 * decision. Both removed routes are still one click away, though NOT in the
 * navbar -- that bar's auth controls were removed the same day these were, so
 * the sentence that used to point there was describing buttons that no longer
 * existed. They are in the closing CTA, which carries the demo, the signup and
 * sign-in together with the sentence that says what the demo is.
 *
 * HEIGHT IS VIEWPORT-RELATIVE, AND THE CONTENT IS CENTRED IN IT. `min-h` with
 * `justify-center` means a taller hero grows the MEDIA, not the gap under the
 * text -- the extra height goes to the image, and the copy stays optically
 * centred at any viewport. Padding-based height does the opposite: it pushes
 * the text up and leaves dead space beneath it, which is exactly what a taller
 * fixed-padding hero looked like.
 *
 * `svh` rather than `vh`: on mobile Safari `100vh` is the height WITHOUT the
 * browser chrome, so a vh-sized hero is taller than the visible viewport and
 * the CTA sits under the address bar on first paint. `svh` is the small
 * viewport height, which is the one actually on screen.
 *
 * `h-full` ALONGSIDE the min-height, because this section renders in two
 * containers. Unpinned its parent has auto height, `h-full` resolves to auto,
 * and min-h-[88svh] governs -- the standalone behaviour. Inside 6.1a's pin the
 * parent is exactly one viewport tall, and 88svh is SHORTER than that: without
 * h-full the hero letterboxed itself, leaving a ~39px band of page background
 * above and below the dark media on every pinned frame.
 *
 * Content sits in the same 1200px container as every section below it, so the
 * headline starts on the same vertical line as every heading on the page.
 * Before that it used its own `px-16` and lined up with nothing.
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
      id="hero"
      data-landing-section="hero"
      className="relative isolate flex h-full min-h-[88svh] flex-col justify-center overflow-hidden px-gutter pb-24 pt-32 md:pb-32 md:pt-40 lg:min-h-[92svh]"
    >
      <HeroMedia posterSrc={posterSrc} videoSrc={videoSrc} paused={unpinned} />

      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-7">
        <p className="text-label-caps uppercase text-accent-400">{HERO.eyebrow}</p>

        <h1 className="max-w-4xl text-display-xl text-[#fafafa]">{HERO.headline}</h1>

        <p className="max-w-[720px] text-body-l text-[rgba(250,250,250,0.82)]">{HERO.body}</p>

        <div>
          {/*
            THE ONE BUTTON ON THIS PAGE THAT LEAVES THE SITE, and until
            2026-09-05 it was also the only CTA with no glyph at all. The
            outbound arrow is not decoration here: every other control on the
            landing page keeps you on it, and this one opens GitHub in a new
            tab -- which `target="_blank"` does silently unless something on
            the button says so.
          */}
          <Link
            href={HERO.sourceCta.href}
            target="_blank"
            rel="noreferrer noopener"
            data-variant="primary"
            className={cn(
              buttonVariants({ variant: 'primary', size: 'm' }),
              ICON_MOTION_GROUP,
              // Full width below 640 (Gabe, 2026-09-05), matching the closing
              // CTA. The wrapping <div> is a block, so the button only needs
              // permission to fill it -- there is no flex row here holding it
              // to its content width.
              'w-full sm:w-auto'
            )}
          >
            <ExternalIcon size={16} aria-hidden className={iconMotion('forward')} />
            {HERO.sourceCta.label}
          </Link>
        </div>
      </div>
    </section>
  )
}
