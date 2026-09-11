import { describe, it, expect } from 'vitest'
import { layOut, type PanelSpec } from '../panelLayout'

/**
 * Untestable while it lived inside Analytics.tsx: asserting that a lone
 * half-width panel is promoted meant rendering the whole page with mocked
 * queries, so nobody had. It is a pure function over a list.
 */
const spec = (key: string, span: PanelSpec['span']): PanelSpec => ({ key, span, node: null })
const widths = (specs: PanelSpec[]) =>
  layOut(specs).map((p) => `${p.key}:${p.full ? 'full' : 'half'}`)

describe('layOut', () => {
  it('pairs two half-width panels into one row', () => {
    expect(widths([spec('a', 'half'), spec('b', 'half')])).toEqual(['a:half', 'b:half'])
  })

  it('PROMOTES a lone half-width panel rather than leaving a hole', () => {
    // The rule the whole function exists for: a card with no partner fills its
    // row instead of sitting beside empty space.
    expect(widths([spec('a', 'half')])).toEqual(['a:full'])
  })

  it('promotes the last panel when there is an odd number of halves', () => {
    expect(widths([spec('a', 'half'), spec('b', 'half'), spec('c', 'half')])).toEqual([
      'a:half',
      'b:half',
      'c:full',
    ])
  })

  it('lets a full-width panel take its own row and reset the pairing', () => {
    // `b` must not try to pair backwards with `a`, and `c` must still pair
    // with `d` after the interruption.
    expect(
      widths([spec('a', 'full'), spec('b', 'half'), spec('c', 'half'), spec('d', 'full')])
    ).toEqual(['a:full', 'b:half', 'c:half', 'd:full'])
  })

  it('does not pair a half with a full that follows it', () => {
    // A half followed by a full has no partner, so it is promoted.
    expect(widths([spec('a', 'half'), spec('b', 'full')])).toEqual(['a:full', 'b:full'])
  })

  it('never reorders: order is the author\'s, widths are this function\'s', () => {
    const specs = [spec('a', 'half'), spec('b', 'full'), spec('c', 'half')]
    expect(layOut(specs).map((p) => p.key)).toEqual(['a', 'b', 'c'])
  })

  it('handles an empty list without inventing a row', () => {
    expect(layOut([])).toEqual([])
  })

  it('does not mutate the specs it was handed', () => {
    const specs = [spec('a', 'half')]
    layOut(specs)
    expect(specs[0]).not.toHaveProperty('full')
  })
})
