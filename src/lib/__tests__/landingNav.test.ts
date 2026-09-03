import { describe, it, expect } from 'vitest'
import { navOverHero, landingNavHeightPx, LANDING_NAV_HEIGHT_PX } from '../landingNav'
import { MD_BREAKPOINT_PX } from '../breakpoints'

const { base, md } = LANDING_NAV_HEIGHT_PX

describe('LANDING_NAV_HEIGHT_PX', () => {
  it('carries the two heights the bar is actually drawn at', () => {
    // Figma 64:1020 is 375x60; 39:355 is 1440x80. Asserted because the whole
    // point of the pair is that one number would be wrong on one breakpoint.
    expect(base).toBe(60)
    expect(md).toBe(80)
  })
})

describe('navOverHero', () => {
  const heroBottom = 1600

  it('is over the hero at the top of the page', () => {
    expect(navOverHero(0, heroBottom, md)).toBe(true)
  })

  it('is still over the hero one pixel before the band clears it', () => {
    expect(navOverHero(heroBottom - md - 1, heroBottom, md)).toBe(true)
  })

  it('leaves the hero exactly when the band reaches its bottom edge', () => {
    // The boundary itself, asserted rather than approached from one side. A
    // >= / > slip here is a one-pixel bug nobody finds by looking.
    expect(navOverHero(heroBottom - md, heroBottom, md)).toBe(false)
  })

  it('stays off the hero all the way down the page', () => {
    expect(navOverHero(heroBottom, heroBottom, md)).toBe(false)
    expect(navOverHero(99_999, heroBottom, md)).toBe(false)
  })

  it('moves the boundary with the bar height', () => {
    // The reason navHeightPx is a required parameter. At 375 the bar is 60px,
    // so it clears the hero 20px LATER than the desktop bar would -- passing
    // the desktop 80 on a phone flips the treatment early, mid-transition.
    const justInsideOnMobile = heroBottom - base - 1
    expect(navOverHero(justInsideOnMobile, heroBottom, base)).toBe(true)
    // Positive companion: the same scroll position with the desktop height has
    // already left the hero, which is exactly the bug this guards.
    expect(navOverHero(justInsideOnMobile, heroBottom, md)).toBe(false)
  })

  it('is not over the hero before the hero has been measured', () => {
    // heroBottomPx is 0 on the first render, before the ref effect runs.
    // Defaulting to the blended treatment there paints light-on-light text on
    // a themed page for a frame.
    expect(navOverHero(0, 0, md)).toBe(false)
  })
})

describe('landingNavHeightPx', () => {
  it('uses the 60px bar below the md breakpoint', () => {
    expect(landingNavHeightPx(375)).toBe(base)
    expect(landingNavHeightPx(MD_BREAKPOINT_PX - 1)).toBe(base)
  })

  it('uses the 80px bar at and above it', () => {
    expect(landingNavHeightPx(MD_BREAKPOINT_PX)).toBe(md)
    expect(landingNavHeightPx(1440)).toBe(md)
  })

  it('uses the mobile bar before the width is known', () => {
    // Width is 0 on the first render. The smaller bar is the safe default:
    // it makes the swap happen slightly late rather than slightly early, and
    // late is invisible where early lands mid-transition.
    expect(landingNavHeightPx(0)).toBe(base)
  })
})
