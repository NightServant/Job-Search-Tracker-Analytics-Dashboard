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
    // The way home is the header button now, matching /privacy: it is the one
    // destination every visitor can use whether or not they have an account.
    expect(screen.getByRole('link', { name: /Back to the home page/i })).toHaveAttribute(
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

  it('carries no site footer, which would be a second navigation', () => {
    // Gabe's call, applied here after /privacy. The footer is the marketing
    // page's own navigation plus the attribution block -- a strange thing to
    // read at the bottom of a broken link.
    render(<NotFound />)
    expect(screen.queryByRole('link', { name: /^source$/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /^privacy$/i })).toBeNull()
  })

  it('offers exactly one primary route out', () => {
    // Equally-weighted primary buttons would be several decisions at the
    // moment the visitor is already lost. The overview is the one most people
    // want; everything else is secondary.
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
