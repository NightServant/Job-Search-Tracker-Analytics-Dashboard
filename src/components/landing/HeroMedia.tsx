'use client'

import * as React from 'react'
import { AspectRatio } from '@/components/ui/aspect-ratio'

/**
 * The hero's background: a poster image, or a video when one exists.
 *
 * Figma (39:369) draws a background video on desktop and annotates it
 * "muted, autoplay, loop, playsinline · 8-15s seamless · 1280px wide · H.264 +
 * WebM · poster image only below 768px · paused under prefers-reduced-motion".
 * No such asset exists in this repo and none can be produced by writing code,
 * so this ships POSTER-ONLY with the video path built and gated behind a src.
 * Dropping a file in later is a one-line change rather than a rework.
 *
 * `paused` is wired now, not later, because 6.1a needs it: the hero holds the
 * viewport and then releases, and once it has released the video is invisible
 * and decoding it costs battery for nothing. Task 3 passes `hero.released`
 * down to it. Playback resumes if the reader scrolls back up -- a video that
 * stays dead for the rest of the session is the bug the resume path prevents.
 *
 * AspectRatio wraps the media so the page does not reflow as the poster loads.
 */
export interface HeroMediaProps {
  posterSrc: string
  /** Empty or absent ships the poster. A path ships a <video>. */
  videoSrc?: string
  /** True once the hero has unpinned, or under reduced motion. */
  paused?: boolean
}

export function HeroMedia({ posterSrc, videoSrc, paused = false }: HeroMediaProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (paused) {
      el.pause()
      return
    }
    // play() rejects if the browser blocks autoplay; that is not an error we
    // can act on, and an unhandled rejection would surface as a console error
    // on every load in Safari.
    void el.play().catch(() => {})
  }, [paused, videoSrc])

  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      <AspectRatio ratio={16 / 9} className="h-full w-full">
        {videoSrc ? (
          <video
            ref={videoRef}
            data-testid="hero-video"
            className="h-full w-full object-cover"
            poster={posterSrc}
            src={videoSrc}
            muted
            loop
            playsInline
            autoPlay={!paused}
          />
        ) : (
          <img
            data-testid="hero-poster"
            className="h-full w-full object-cover"
            src={posterSrc}
            alt=""
          />
        )}
      </AspectRatio>
      {/*
        The scrim, transcribed from the frame: a left-to-right gradient from
        rgba(5,5,7,0.92) through 0.72 at 45% to 0.3. It is what makes the hero
        dark in BOTH themes, and therefore what forces the navbar's two
        treatments -- see LandingNavbar.
      */}
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(5,5,7,0.92)] via-[rgba(5,5,7,0.72)] via-[45%] to-[rgba(5,5,7,0.3)]" />
    </div>
  )
}
