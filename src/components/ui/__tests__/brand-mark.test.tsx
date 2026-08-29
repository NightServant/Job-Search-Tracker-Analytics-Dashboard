import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrandMark, BrandLockup } from '../brand-mark'

describe('BrandMark', () => {
  it('is decorative when it appears beside the wordmark', () => {
    // The lockup already says "worktrack" in text. A second accessible name on
    // the mark would make a screen reader announce the brand twice.
    const { container } = render(<BrandLockup />)
    expect(screen.getByText('worktrack')).toBeTruthy()
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })

  it('carries its own accessible name when it stands alone', () => {
    // The Figma component description: "the mark stands alone at small sizes."
    render(<BrandMark />)
    expect(screen.getByRole('img', { name: 'Worktrack' })).toBeTruthy()
  })

  it('paints exactly one cell in the accent colour', () => {
    // The mark is a 2x2 grid with one active cell -- a literal reference to
    // the status pipeline. Three accent cells, or none, is a different mark.
    const { container } = render(<BrandMark />)
    const cells = [...container.querySelectorAll('[data-cell]')]
    expect(cells).toHaveLength(4)
    expect(cells.filter((c) => c.getAttribute('data-cell') === 'active')).toHaveLength(1)
  })

  it('inherits the theme rather than hard-coding a hex', () => {
    // Both themes render this on bg/canvas, and text/primary inverts between
    // them. A literal #18181b would vanish on the dark canvas.
    const { container } = render(<BrandMark />)
    expect(container.innerHTML).not.toMatch(/#18181b|#c2410c|#fb923c/i)
  })

  it('scales from a single size prop', () => {
    const { container } = render(<BrandMark size={48} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('48')
    expect(svg.getAttribute('height')).toBe('48')
  })
})
