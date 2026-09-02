import { describe, it, expect } from 'vitest'
import { pageProgress, activeSectionId } from '../sectionProgress'

describe('pageProgress', () => {
  it('runs 0 to 1 across the scrollable distance', () => {
    // 3000 tall document in an 1000 tall viewport = 2000 scrollable.
    expect(pageProgress(0, 3000, 1000)).toBe(0)
    expect(pageProgress(1000, 3000, 1000)).toBe(0.5)
    expect(pageProgress(2000, 3000, 1000)).toBe(1)
  })

  it('divides by the SCROLLABLE distance, not the document height', () => {
    // The bug this guards: dividing by 3000 would put the bottom of the page
    // at 0.67 and the rail could never fill.
    expect(pageProgress(2000, 3000, 1000)).toBe(1)
  })

  it('is 0 on a page with nowhere to scroll', () => {
    // No division by zero, no Infinity, no NaN in a style attribute.
    expect(pageProgress(0, 800, 800)).toBe(0)
    expect(pageProgress(0, 500, 800)).toBe(0)
  })

  it('clamps rubber-band overscroll rather than exceeding the track', () => {
    expect(pageProgress(-200, 3000, 1000)).toBe(0)
    expect(pageProgress(9999, 3000, 1000)).toBe(1)
  })
})

describe('activeSectionId', () => {
  const sections = [
    { id: 'hero', top: 0 },
    { id: 'proof', top: 1000 },
    { id: 'problem', top: 2000 },
  ]

  it('keys on the viewport midpoint, not its top edge', () => {
    // At scrollY 600 with a 1000 viewport the midpoint is 1100, so `proof` is
    // the one being read -- even though `problem` is not yet in view and
    // `proof` only entered the viewport at 0. Keying on the top edge would
    // flip the rail forward while the reader is still on the previous section.
    expect(activeSectionId(600, 1000, sections)).toBe('proof')
  })

  it('stays on a section until the next one reaches the midpoint', () => {
    expect(activeSectionId(400, 1000, sections)).toBe('hero')
    expect(activeSectionId(499, 1000, sections)).toBe('hero')
    expect(activeSectionId(500, 1000, sections)).toBe('proof')
  })

  it('reports the last section at the bottom of the page', () => {
    expect(activeSectionId(5000, 1000, sections)).toBe('problem')
  })

  it('falls back to the first section at the very top', () => {
    // Returning nothing here would leave the rail with no active dot on the
    // first paint, which reads as broken rather than as "not scrolled yet".
    expect(activeSectionId(0, 1000, sections)).toBe('hero')
  })

  it('returns null only when there are no sections at all', () => {
    expect(activeSectionId(0, 1000, [])).toBeNull()
  })
})
