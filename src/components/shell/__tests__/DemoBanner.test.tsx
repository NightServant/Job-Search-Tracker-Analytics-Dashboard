import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DemoBanner, DemoSidebarNotice } from '../DemoBanner'

describe('the demo banner', () => {
  it('says all three things a visitor needs to know', () => {
    // This is a demo; the data is invented; here is where to make a real
    // account. A visitor who scrolls past it and then wonders why nothing
    // saves is the failure it exists to prevent.
    render(<DemoBanner />)
    expect(screen.getByText(/demo/i)).toBeInTheDocument()
    expect(screen.getByText(/invented/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute(
      'href',
      '/signup'
    )
  })

  it('labels the mode with a Badge, the one place a Badge is correct here', () => {
    // Status is never a Badge in this app -- the Global Constraint forbids
    // pills and StatusMarker replaced them. This labels a MODE, not a status,
    // which is why it is the exception.
    const { container } = render(<DemoBanner />)
    expect(container.querySelector('[data-slot="badge"]')).not.toBeNull()
  })

  it('cannot be dismissed', () => {
    // Deliberate. A dismissible banner is one a visitor closes in the first
    // second and then spends the rest of the session confused about why
    // nothing persists.
    render(<DemoBanner />)
    expect(screen.queryByRole('button', { name: /dismiss|close/i })).toBeNull()
    // Positive companion: the banner really did render, so the absence above
    // is about the control and not about an empty component.
    expect(screen.getByRole('link', { name: /create an account/i })).toBeInTheDocument()
  })
})

describe('where the demo notice lives at each width', () => {
  it('is a band on a phone, a card on a tablet, and gone from lg', () => {
    // Gabe, 2026-09-06. From lg the sidebar carries it instead -- a wide screen
    // should not spend a full horizontal band on a sentence already read.
    const { container } = render(<DemoBanner />)
    const banner = container.querySelector('[data-demo-banner]')!

    // Phone: full-bleed, one bottom rule.
    expect(banner.className).toContain('rounded-none')
    expect(banner.className).toContain('border-x-0')
    expect(banner.className).toContain('border-t-0')

    // Tablet: margins, radius and the borders back -- a card.
    expect(banner.className).toContain('md:mx-gutter')
    expect(banner.className).toContain('md:rounded-md')
    expect(banner.className).toContain('md:border-x')

    // Desktop: not this component's job.
    expect(banner.className).toContain('lg:hidden')
  })
})

describe('the demo notice in the sidebar', () => {
  it('says the same three things the banner does', () => {
    // Two shapes, one claim. If these drift, one of them is lying about the
    // product -- which is why the sentence is a shared constant and this test
    // checks the rendered result rather than the constant.
    render(<DemoSidebarNotice />)
    expect(screen.getByText(/demo/i)).toBeInTheDocument()
    expect(screen.getByText(/invented/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute(
      'href',
      '/signup'
    )
  })

  it('cannot be dismissed either', () => {
    render(<DemoSidebarNotice />)
    expect(screen.queryByRole('button', { name: /dismiss|close/i })).toBeNull()
    expect(screen.getByRole('link', { name: /create an account/i })).toBeInTheDocument()
  })
})
