import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NotFound } from '../NotFound'

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}))

describe('the 404 page', () => {
  it('says what happened without pretending it is an error the visitor caused', () => {
    render(<NotFound />)
    expect(
      screen.getByRole('heading', { name: 'That page does not exist' })
    ).toBeInTheDocument()
  })

  it('offers a real way back to each main surface', () => {
    // "Recovery links". A 404 whose only control is "go home" makes a
    // signed-in visitor start over from the marketing page.
    render(<NotFound />)
    expect(screen.getByRole('link', { name: 'Go to the overview' })).toHaveAttribute(
      'href',
      '/dashboard'
    )
    expect(screen.getByRole('link', { name: 'Go to your applications' })).toHaveAttribute(
      'href',
      '/applications'
    )
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute(
      'href',
      '/'
    )
  })

  it('uses the design system button rather than styling its own', () => {
    render(<NotFound />)
    expect(screen.getByRole('link', { name: 'Go to the overview' })).toHaveAttribute(
      'data-variant',
      'primary'
    )
  })

  it('offers exactly one primary route out', () => {
    // Three equally-weighted primary buttons is three decisions. The overview
    // is the one most people want; the others are secondary.
    render(<NotFound />)
    const primaries = document.querySelectorAll('a[data-variant="primary"]')
    expect(primaries).toHaveLength(1)
  })

  it('does not guess what the visitor was looking for', () => {
    // A 404 that says "the page you requested" and then names a path is
    // reflecting unsanitised URL input back into the document. Nothing here
    // reads the URL at all, which is why there is no path in the copy.
    render(<NotFound />)
    expect(document.body.textContent).not.toMatch(/\/[a-z-]+\?|localhost|http/i)
  })
})
