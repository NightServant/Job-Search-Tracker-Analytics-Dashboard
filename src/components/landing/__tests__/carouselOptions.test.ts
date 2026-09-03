import { describe, it, expect } from 'vitest'
import {
  SCROLL_DRIVEN_OPTIONS,
  REDUCED_MOTION_OPTIONS,
  carouselOptionsFor,
} from '../carouselOptions'

describe('carousel options', () => {
  it('never loops, in either mode', () => {
    // Scroll progress maps 1:1 onto the slides so the pin releases on the last
    // one. A looping carousel has no last slide and the section never ends.
    expect(SCROLL_DRIVEN_OPTIONS.loop).toBe(false)
    expect(REDUCED_MOTION_OPTIONS.loop).toBe(false)
  })

  it('never autoplays, in either mode', () => {
    // WCAG 2.2.2: an auto-advancing carousel with no pause control fails.
    expect(SCROLL_DRIVEN_OPTIONS.autoplay).toBe(false)
    expect(REDUCED_MOTION_OPTIONS.autoplay).toBe(false)
  })

  it('keeps arrows on in both modes, not only the reduced one', () => {
    // They are the keyboard affordance, and with touch off the scroll-driven
    // mode has no other control at all.
    expect(SCROLL_DRIVEN_OPTIONS.showNavigation).toBe(true)
    expect(REDUCED_MOTION_OPTIONS.showNavigation).toBe(true)
  })

  it('turns touch off when scroll drives the slides', () => {
    expect(SCROLL_DRIVEN_OPTIONS.allowTouchMove).toBe(false)
    expect(SCROLL_DRIVEN_OPTIONS.simulateTouch).toBe(false)
  })

  it('restores touch under reduced motion', () => {
    // Without this the carousel is frozen on slide one for exactly the users
    // who opted out of motion.
    expect(REDUCED_MOTION_OPTIONS.allowTouchMove).toBe(true)
    expect(REDUCED_MOTION_OPTIONS.simulateTouch).toBe(true)
  })

  it('picks the mode from whether scroll is driving, not from the preference', () => {
    // Three things turn scroll-driving off -- reduced motion, a viewport below
    // the pin breakpoint, and no pin at all -- and they must not each grow
    // their own branch here. The carousel only ever asks "am I being driven?"
    expect(carouselOptionsFor(true)).toEqual(SCROLL_DRIVEN_OPTIONS)
    expect(carouselOptionsFor(false)).toEqual(REDUCED_MOTION_OPTIONS)
  })

  it('never ships the creative effect shadow', () => {
    expect(SCROLL_DRIVEN_OPTIONS.shadow).toBe(false)
    expect(REDUCED_MOTION_OPTIONS.shadow).toBe(false)
  })
})
