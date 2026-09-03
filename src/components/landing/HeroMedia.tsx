'use client'

import * as React from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { MD_BREAKPOINT_PX } from '@/lib/breakpoints'
import { useViewportSize } from './useViewportSize'

/**
 * The hero's background: a video on desktop, a poster everywhere else.
 *
 * This implements the annotation on Figma 39:369 literally -- "muted, autoplay,
 * loop, playsinline · 1280px wide · poster image only below 768px · paused
 * under prefers-reduced-motion".
 *
 * THE POSTER-ONLY RULE BELOW 768px IS A WEIGHT DECISION, NOT A LAYOUT ONE. The
 * clip is 2.5 MB; the poster is 65 KB. Rendering the <video> element at all on
 * a phone starts that download over whatever connection the phone is on, for a
 * background behind a scrim. So the element is not rendered below the
 * breakpoint -- `poster` alone would still fetch the source.
 *
 * It is also not rendered under prefers-reduced-motion, for the obvious
 * reason: an autoplaying loop is the thing that setting asks not to happen.
 * That check is the shared hook, not a second matchMedia call.
 *
 * `paused` is separate from both, and is what 6.1a drives: the hero holds the
 * viewport and then releases, and once it has released the video is invisible
 * and decoding it costs battery for nothing. Playback resumes if the reader
 * scrolls back up -- a video that stays dead for the rest of the session is
 * the bug the resume path prevents.
 *
 * THE CLIP IS 15s, WHICH IS THE FRAME'S SPEC. It was 40s, recorded here as a
 * known deviation from Figma 39:369's "8-15s seamless loop" because trimming
 * was thought to need ffmpeg. macOS ships `avconvert`, which trims without
 * re-encoding the picture: same 1280x720, same encode, 6.8 MB down to 2.5 MB.
 *
 * The window was chosen by MEASUREMENT rather than taste. Nine candidate
 * windows were scored on the mean luminance difference between their first and
 * last frame -- the size of the jump a viewer sees when the loop restarts --
 * after the same grayscale the page applies. They all landed within about one
 * point of each other, so the footage drifts continuously and no cut is truly
 * seamless. What settled it is that the ORIGINAL 40s loop scored 11.97 and
 * 0-15s scores 10.08: the shorter clip's seam is not a compromise for the
 * smaller file, it is slightly less visible than the one being replaced.
 */
export interface HeroMediaProps {
  posterSrc: string
  /** Empty or absent ships the poster. A path ships a <video> at md and up. */
  videoSrc?: string
  /** True once the hero has unpinned, or while it is off screen. */
  paused?: boolean
}

export function HeroMedia({ posterSrc, videoSrc, paused = false }: HeroMediaProps) {
  const reduced = usePrefersReducedMotion()
  const { widthPx } = useViewportSize()
  const videoRef = React.useRef<HTMLVideoElement>(null)

  // widthPx is 0 until the measuring effect runs, so the first paint is the
  // poster on every device. Starting with the video and swapping down would
  // begin the 6.8 MB fetch on a phone before we know it is a phone.
  const wantsVideo = Boolean(videoSrc) && !reduced && widthPx >= MD_BREAKPOINT_PX

  React.useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (paused) {
      el.pause()
      return
    }
    // Two hazards in one line. play() REJECTS when the browser blocks
    // autoplay -- not an error we can act on, and an unhandled rejection is a
    // console error on every load. And it does not always RETURN a promise:
    // the spec added that in 2016 and older Safari still returns undefined,
    // as does jsdom. `Promise.resolve(...)` normalises both.
    void Promise.resolve(el.play()).catch(() => {})
  }, [paused, wantsVideo])

  return (
    // `grayscale` on the media, not on this wrapper: the scrim below is a
    // token-coloured gradient and must not be desaturated with it.
    //
    // The clip is teal. This design system is Swiss with a single orange
    // accent, and status colour is reserved and semantic -- so a second
    // saturated hue behind the headline introduces a third colour language and
    // makes the accent eyebrow read as one of several colours rather than as
    // THE colour. Desaturating leaves the footage doing what footage should do
    // here (texture and depth) and leaves orange as the only chroma on the
    // page. It is also why the eyebrow reads at all against it.
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-[#050507]">
      {wantsVideo ? (
        <video
          ref={videoRef}
          data-testid="hero-video"
          className="h-full w-full object-cover grayscale"
          poster={posterSrc}
          src={videoSrc}
          muted
          loop
          playsInline
          autoPlay
        />
      ) : (
        <img
          data-testid="hero-poster"
          className="h-full w-full object-cover grayscale"
          src={posterSrc}
          alt=""
        />
      )}
      {/*
        The scrim, transcribed from the frame: a left-to-right gradient from
        rgba(5,5,7,0.92) through 0.72 at 45% to 0.3. It is what makes the hero
        dark in BOTH themes, and therefore what forces the navbar's two
        treatments -- see LandingNavbar.

        The second, vertical gradient is not in the frame. It carries the hero
        into the section below it so the boundary is a fade rather than a hard
        horizontal edge against bg-canvas, which at this height reads as two
        stacked blocks rather than one page.
      */}
      <div className="absolute inset-0 bg-gradient-to-r from-[rgba(5,5,7,0.92)] via-[rgba(5,5,7,0.72)] via-[45%] to-[rgba(5,5,7,0.3)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-bg-canvas" />
    </div>
  )
}
