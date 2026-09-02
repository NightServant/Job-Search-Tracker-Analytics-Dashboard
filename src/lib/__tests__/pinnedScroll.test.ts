import { describe, it, expect } from 'vitest'
import {
  clamp01,
  shouldPin,
  heroPinHeightPx,
  carouselPinHeightPx,
  carouselProgressFrom,
  CAROUSEL_HOLD_VIEWPORTS_PER_SLIDE,
  PIN_MIN_WIDTH_PX,
} from '../pinnedScroll'

describe('clamp01', () => {
  it('passes values inside the range through untouched', () => {
    expect(clamp01(0)).toBe(0)
    expect(clamp01(0.37)).toBe(0.37)
    expect(clamp01(1)).toBe(1)
  })

  it('clamps outside the range instead of extrapolating', () => {
    expect(clamp01(-3)).toBe(0)
    expect(clamp01(4)).toBe(1)
  })
})

describe('shouldPin', () => {
  it('pins a desktop viewport when motion is allowed', () => {
    expect(shouldPin(false, 1440)).toBe(true)
    expect(shouldPin(false, PIN_MIN_WIDTH_PX)).toBe(true)
  })

  it('never pins below the md breakpoint, whatever the motion preference', () => {
    // Settled 2026-08-28: mobile does not pin. Pinning costs a full viewport
    // on a 375x812 screen and is jankier under touch. Asserted rather than
    // left untested -- an untested behavioural claim rots.
    expect(shouldPin(false, 375)).toBe(false)
    expect(shouldPin(true, 375)).toBe(false)
    expect(shouldPin(false, PIN_MIN_WIDTH_PX - 1)).toBe(false)
  })

  it('never pins under reduced motion, whatever the viewport', () => {
    // Scroll-jacking is a vestibular trigger. This is a hard requirement, and
    // it must not be reachable around by resizing.
    expect(shouldPin(true, 1440)).toBe(false)
    expect(shouldPin(true, 3840)).toBe(false)
  })

  it('does not pin before the viewport width is known', () => {
    // The width is 0 on the first render, before the measuring effect runs.
    // Defaulting to pinned there would flash a pinned layout on a phone.
    expect(shouldPin(false, 0)).toBe(false)
  })
})

describe('pin heights', () => {
  it('gives the hero one viewport of hold on top of its own viewport', () => {
    // The Figma frame height is NOT the scroll height: a pinned section needs
    // scroll distance allocated for its hold, so the real page is materially
    // taller than the 3102px desktop mockup.
    expect(heroPinHeightPx(800)).toBe(1600)
  })

  it('scales the carousel pin with the slide count', () => {
    expect(carouselPinHeightPx(5, 800)).toBe(800 + 5 * CAROUSEL_HOLD_VIEWPORTS_PER_SLIDE * 800)
    expect(carouselPinHeightPx(3, 800)).toBe(800 + 3 * CAROUSEL_HOLD_VIEWPORTS_PER_SLIDE * 800)
  })

  it('keeps the per-slide pace constant when a screen is added or removed', () => {
    // The invariant the roadmap actually asks for, asserted as an invariant
    // rather than as two hand-written numbers that would both need editing if
    // the constant changed.
    const pace = (n: number) => (carouselPinHeightPx(n, 800) - 800) / n
    expect(pace(3)).toBeCloseTo(pace(6), 10)
    expect(pace(1)).toBeCloseTo(pace(12), 10)
  })

  it('still allocates a viewport when there are no slides at all', () => {
    expect(carouselPinHeightPx(0, 800)).toBe(800)
  })
})

describe('carouselProgressFrom', () => {
  it('maps the pinned section progress one-to-one onto the slides', () => {
    // setProgress(0..1), not slideNext() on thresholds -- progress mapping is
    // what makes the movement track the scrollbar instead of snapping.
    expect(carouselProgressFrom(0)).toBe(0)
    expect(carouselProgressFrom(0.5)).toBe(0.5)
    expect(carouselProgressFrom(1)).toBe(1)
  })

  it('never returns a value Swiper would reject', () => {
    expect(carouselProgressFrom(-0.2)).toBe(0)
    expect(carouselProgressFrom(1.4)).toBe(1)
  })
})
