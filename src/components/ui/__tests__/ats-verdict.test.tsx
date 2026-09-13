import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { AtsTermChips, AtsVerdict } from '../ats-verdict'
import { verdictFor } from '../ats-verdict-copy'

afterEach(() => cleanup())

describe('the shared ATS verdict', () => {
  it('names the band rather than leaving the percentage to speak for itself', () => {
    // 57% means nothing without the scale beside it. The thresholds are 80 and
    // 50, and both surfaces that draw this score read them from here -- which
    // is the whole reason the file exists.
    expect(verdictFor(92)).toBe('pass')
    expect(verdictFor(57)).toBe('review')
    expect(verdictFor(41)).toBe('fail')

    render(<AtsVerdict score={41} />)
    expect(screen.getByText('weak match')).toBeTruthy()
  })

  it('does not put a glyph inside a paragraph', () => {
    // THE BUG THIS PINS shipped invisibly for weeks. Every icon in this app
    // renders a `motion` DIV, and a div inside a `<p>` makes the browser close
    // the paragraph early -- React reports a hydration error and the label and
    // the count end up outside the heading they belong to. It stayed hidden
    // because the only surface drawing these chips was a dialog no test opened
    // with a match that had terms in it.
    const { container } = render(
      <AtsTermChips label="matched" tone="matched" terms={['react', 'typescript']} emptyText="none" />
    )
    expect(container.querySelector('p div')).toBeNull()
    expect(screen.getByText('react')).toBeTruthy()
  })

  it('folds a long list and says exactly how many it is hiding', () => {
    // A fold that lied about its length would be worse than no fold: the
    // count in the heading is what makes the hidden half trustworthy.
    const terms = Array.from({ length: 30 }, (_, i) => `term${i}`)
    render(<AtsTermChips label="missing" tone="missing" terms={terms} emptyText="none" limit={12} />)
    expect(screen.getByText('(30)')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'show 18 more' })).toBeTruthy()
    expect(screen.queryByText('term12')).toBeNull()
  })
})
