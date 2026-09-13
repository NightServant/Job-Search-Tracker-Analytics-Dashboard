import { describe, it, expect } from 'vitest'
import { MAX_SCALE, MIN_SCALE, PAGE_WIDTH_PX, scaleFor } from '../useFitToWidth'

/**
 * The scale rule, asserted directly. The hook itself is a ResizeObserver over
 * a real element, which jsdom does not lay out -- so what is worth testing is
 * the arithmetic it applies.
 *
 * IMPORTED, NOT RETYPED. This file used to declare its own copy of the
 * expression, which meant it went on asserting a ceiling of 1 after the hook
 * had stopped having one -- green, and testing nothing.
 */

describe('fit-to-width scaling', () => {
  it('draws the page at full size in a well exactly its own width', () => {
    expect(scaleFor(PAGE_WIDTH_PX)).toBe(1)
  })

  it('grows the page into a wider well, up to its own size', () => {
    // Gabe, 2026-09-13: "allow the document to shrink and grow depending on
    // desktop and laptop screen size (just like Microsoft Word)". 700 is a
    // well between the clamps, where the rule is the raw ratio.
    expect(scaleFor(700)).toBeCloseTo(0.858, 3)
  })

  it('NEVER scales above 1, so a wide screen shows a page and not a poster', () => {
    // Tried at three ceilings on 2026-09-13 -- fit-the-well ("document is too
    // big"), 1.2 ("too aggressive for sizing") and 1.1 ("aggressive sizing in
    // desktop and laptop screens") -- and settled at 100%. 1332 is a 1440
    // laptop with the rail drawer shut; 3000 is a 4K monitor.
    expect(MAX_SCALE).toBe(1)
    expect(scaleFor(1332)).toBe(1)
    expect(scaleFor(3000)).toBe(1)
  })

  it('fits a phone canvas in print view, which is what lets it be centred', () => {
    // Gabe, 2026-09-13: "mobile and tablet screens print view must center the
    // document regardless of width". The old 0.55 floor drew a 449px page in a
    // 390px canvas -- 59px of overflow, and a box wider than its container has
    // no free space for `margin: auto` to split, so it sat flush left.
    expect(scaleFor(390) * PAGE_WIDTH_PX).toBeLessThanOrEqual(390)
    expect(scaleFor(320) * PAGE_WIDTH_PX).toBeLessThanOrEqual(320)
  })

  it('shrinks the page to fit rather than scrolling it sideways', () => {
    // The three laptop widths a wider left rail would otherwise have pushed
    // into a horizontal scroll.
    expect(scaleFor(582)).toBeCloseTo(0.713, 2) // 1366 viewport
    expect(scaleFor(656)).toBeCloseTo(0.804, 2) // 1440
    expect(scaleFor(752)).toBeCloseTo(0.922, 2) // 1536
  })

  it('stops at the floor, which exists only so nothing asks for zoom 0', () => {
    expect(scaleFor(100)).toBe(MIN_SCALE)
    expect(scaleFor(0)).toBe(MIN_SCALE)
  })

  it('is monotonic, so a wider well never shows a smaller page', () => {
    const widths = [200, 400, 600, 800, 816, 1000, 1332, 3000]
    const scales = widths.map(scaleFor)
    for (let i = 1; i < scales.length; i += 1) {
      expect(scales[i]).toBeGreaterThanOrEqual(scales[i - 1])
    }
  })
})
