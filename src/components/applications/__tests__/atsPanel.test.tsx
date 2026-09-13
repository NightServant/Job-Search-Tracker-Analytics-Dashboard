import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { RecordAts } from '../record/RecordAts'
import type { KeywordMatch } from '@/services/atsMatch'

afterEach(() => cleanup())

/** Thirty terms either side: enough that a fold would have hidden most of them. */
const MATCH: KeywordMatch = {
  score: 41,
  matched: Array.from({ length: 30 }, (_, i) => `hit${i}`),
  missing: Array.from({ length: 30 }, (_, i) => `gap${i}`),
}

/** Longer than the default cap either side, so the fold has to engage. */
const SHORT: KeywordMatch = {
  score: 41,
  matched: Array.from({ length: 41 }, (_, i) => `hit${i}`),
  missing: Array.from({ length: 41 }, (_, i) => `gap${i}`),
}

describe('the ATS panel', () => {
  it('folds each list, and says how many it is holding back', async () => {
    // The lists were briefly unfolded, which was right for the fixture and
    // wrong for a real 130-term posting: 53 + 77 tags ran the right column far
    // past the left one, which is the space Gabe reported. The cap is measured
    // against the left column's fixed height -- see RecordAts. The count in the
    // heading and the number on the button are what stop a fold being a lie
    // about length.
    render(<RecordAts match={SHORT} />)

    expect(await screen.findByText('weak match')).toBeTruthy()
    expect(screen.getByText('hit0')).toBeTruthy()
    expect(screen.queryByText('hit40')).toBeNull()
    expect(screen.getAllByRole('button', { name: /show \d+ more/ })).toHaveLength(2)
    // The headings still report the real totals, folded or not.
    expect(screen.getAllByText('(41)')).toHaveLength(2)
  })

  it('takes a tighter limit for a narrower surface', () => {
    // The CV editor draws this vocabulary in a 320px rail and passes its own
    // limit for exactly that reason. The prop has to keep overriding.
    render(<RecordAts match={MATCH} termLimit={12} />)
    // One per list: the fold is per-inventory, not per-panel.
    expect(screen.getAllByRole('button', { name: 'show 18 more' })).toHaveLength(2)
  })

  it('is a headline band over two equal inventories, not a column of each', () => {
    // THE STRUCTURE IS THE CHANGE, and a regression that re-stacked these
    // would still render every element -- so the arrangement is what has to be
    // asserted rather than the presence of the parts.
    //
    // The previous layout put the ring in one column and the tags in the
    // other, which made the panel as tall as its longest child and left a hole
    // under the shorter one. Two rounds of tuning a tag cap went into
    // balancing those columns; the band does not have to balance against
    // anything, because it is a fixed amount of content whatever the posting
    // says.
    const { container } = render(<RecordAts match={MATCH} />)
    const matched = container.querySelector('[data-ats-terms="matched"]')!
    const missing = container.querySelector('[data-ats-terms="missing"]')!
    const inventory = matched.parentElement!

    // The two lists are siblings in one two-column region...
    expect(inventory.contains(missing)).toBe(true)
    expect(inventory.className).toContain('@2xl/ats-panel:grid-cols-2')
    // ...the verdict is not among them...
    expect(within(inventory as HTMLElement).queryByText('weak match')).toBeNull()
    // ...and that region takes the leftover height rather than the panel
    // growing, which is what lets the record's second column stop scrolling.
    expect(inventory.className).toContain('min-h-0')
    expect(inventory.className).toContain('flex-1')
  })
})
