import { describe, it, expect } from 'vitest'
import { breakIndexes, spacerHeight } from '../pagination'

/**
 * The break rule, tested without a browser: the plugin measures and this
 * decides. A page is 1000 units here so the arithmetic reads clearly.
 */
const PAGE = 1000

describe('breakIndexes', () => {
  it('does not break a document that fits on one page', () => {
    expect(breakIndexes([300, 300, 300], PAGE)).toEqual([])
  })

  it('breaks before the block that would straddle the edge', () => {
    // 400 + 400 = 800, and the third would reach 1200, so it starts page two.
    expect(breakIndexes([400, 400, 400], PAGE)).toEqual([2])
  })

  it('breaks again on every page, not only the first', () => {
    expect(breakIndexes(Array(9).fill(400), PAGE)).toEqual([2, 4, 6, 8])
  })

  it('fills a page exactly without breaking', () => {
    // Exactly 1000 fits; the break belongs before the NEXT block.
    expect(breakIndexes([500, 500, 10], PAGE)).toEqual([2])
  })

  it('LEAVES A BLOCK TALLER THAN A PAGE ALONE, rather than looping', () => {
    // Moving it to the next page would not help -- it does not fit there
    // either -- and a rule that keeps moving it never terminates.
    expect(breakIndexes([2500], PAGE)).toEqual([])
    expect(breakIndexes([300, 2500, 300], PAGE)).toEqual([])
  })

  it('starts a fresh page after an oversized block', () => {
    // The overflowing block ends wherever it ends; what follows begins a page.
    expect(breakIndexes([2500, 400, 400, 400], PAGE)).toEqual([3])
  })

  it('handles an empty document and a nonsense page height', () => {
    expect(breakIndexes([], PAGE)).toEqual([])
    expect(breakIndexes([100, 200], 0)).toEqual([])
    expect(breakIndexes([100, 200], -5)).toEqual([])
  })
})

describe('spacerHeight', () => {
  it('fills the rest of the page, plus the gap between sheets', () => {
    // Two 400s used 800 of 1000, so 200 remain, plus a 24 gap.
    expect(spacerHeight([400, 400, 400], 2, PAGE, 24)).toBe(224)
  })

  it('is just the gap when the page was filled exactly', () => {
    expect(spacerHeight([500, 500, 10], 2, PAGE, 24)).toBe(24)
  })

  it('AGREES WITH breakIndexes, which is what makes this converge', () => {
    // The whole design rests on both walking the same accumulation, so a
    // second pass over the same heights gives the same answer whether or not
    // spacers are already in the document.
    const heights = [300, 450, 260, 380, 500, 120]
    for (const index of breakIndexes(heights, PAGE)) {
      const filled = spacerHeight(heights, index, PAGE, 0)
      expect(filled).toBeGreaterThanOrEqual(0)
      expect(filled).toBeLessThan(PAGE)
    }
  })

  it('never returns a negative height', () => {
    expect(spacerHeight([2500], 0, PAGE, 0)).toBeGreaterThanOrEqual(0)
  })
})
