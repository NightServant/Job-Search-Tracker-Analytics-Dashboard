import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DemoBanner } from '../DemoBanner'

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
