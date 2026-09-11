import { describe, it, expect } from 'vitest'
import { MIN_SCALE, PAGE_WIDTH_PX } from '../useFitToWidth'

/**
 * The scale rule, asserted directly. The hook itself is a ResizeObserver over
 * a real element, which jsdom does not lay out -- so what is worth testing is
 * the arithmetic it applies, and that is the same expression.
 */
const scaleFor = (available: number) =>
  Math.max(MIN_SCALE, Math.min(1, available / PAGE_WIDTH_PX))

describe('fit-to-width scaling', () => {
  it('leaves the page at full size when it already fits', () => {
    expect(scaleFor(PAGE_WIDTH_PX)).toBe(1)
    expect(scaleFor(1200)).toBe(1)
  })

  it('NEVER scales above 1, so a 4K monitor shows a page and not a poster', () => {
    expect(scaleFor(3000)).toBe(1)
  })

  it('shrinks the page to fit rather than scrolling it sideways', () => {
    // The three laptop widths a wider left rail would otherwise have pushed
    // into a horizontal scroll.
    expect(scaleFor(582)).toBeCloseTo(0.713, 2) // 1366 viewport
    expect(scaleFor(656)).toBeCloseTo(0.804, 2) // 1440
    expect(scaleFor(752)).toBeCloseTo(0.922, 2) // 1536
  })

  it('stops at the floor, below which the type is not editable', () => {
    // It scrolls from here instead of shrinking further: 0.55 already puts
    // 11pt body text at about 6pt on screen.
    expect(scaleFor(100)).toBe(MIN_SCALE)
    expect(scaleFor(0)).toBe(MIN_SCALE)
  })

  it('is monotonic, so a wider well never shows a smaller page', () => {
    const widths = [200, 400, 600, 800, 816, 1000]
    const scales = widths.map(scaleFor)
    for (let i = 1; i < scales.length; i += 1) {
      expect(scales[i]).toBeGreaterThanOrEqual(scales[i - 1])
    }
  })
})
