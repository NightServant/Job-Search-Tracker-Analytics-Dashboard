import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SiteFooter } from '../SiteFooter'
import { SKIPER_ATTRIBUTION } from '@/lib/attribution'

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}))

describe('the site footer', () => {
  it('renders every Skiper credit sentence verbatim', () => {
    // The licence obligation is on what ships, and the page ships. These are
    // the same strings attribution.test.ts asserts against README.md, so one
    // edit keeps both honest and neither can drift alone.
    render(<SiteFooter />)
    for (const entry of SKIPER_ATTRIBUTION) {
      expect(screen.getByText(entry.credit)).toBeInTheDocument()
    }
  })

  it('carries no theme toggle', () => {
    // Removed by Gabe 2026-09-02. Asserted rather than merely deleted, because
    // the previous test claimed the opposite and a reader finding neither
    // would not know which way the decision went.
    //
    // CONSEQUENCE, recorded here too: the navbar hides its toggle below md, so
    // there is now no theme control anywhere on this page at phone widths.
    const { container } = render(<SiteFooter />)
    expect(container.querySelector('[data-theme-toggle]')).toBeNull()
    // Positive companion: the footer still rendered, so this is about the
    // toggle and not about an empty component.
    expect(screen.getByRole('link', { name: 'privacy' })).toBeInTheDocument()
  })

  it('links to the privacy page the milestone actually builds', () => {
    render(<SiteFooter />)
    expect(screen.getByRole('link', { name: 'privacy' })).toHaveAttribute('href', '/privacy')
  })

  it('keeps the lineage credit to the original author', () => {
    // A standing obligation carried from the README, not a stylistic choice.
    render(<SiteFooter />)
    expect(screen.getByText(/Ensues/)).toBeInTheDocument()
  })
})
