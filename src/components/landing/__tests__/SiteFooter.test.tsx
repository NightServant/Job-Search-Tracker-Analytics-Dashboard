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

  it('carries the theme toggle, which is the mobile theme control', () => {
    // The navbar drops its toggle below md (Figma 64:1020 has none), so on a
    // phone this is the ONLY theme control on the page. 6.1 asks for navbar
    // and footer; losing this one loses mobile entirely.
    const { container } = render(<SiteFooter />)
    expect(container.querySelector('[data-theme-toggle]')).not.toBeNull()
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
