import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { RouteLoading, RouteError } from '../route-states'

afterEach(() => cleanup())

describe('RouteLoading', () => {
  it('sketches the page shape rather than centring a spinner', () => {
    // Replaces "centers a size-24 spinner". A spinner says something is
    // happening somewhere; a skeleton says a heading, a row of figures and
    // content are arriving HERE, so the layout does not jump when data lands.
    const { container } = render(<RouteLoading />)
    const region = container.firstElementChild as HTMLElement
    expect(region.getAttribute('role')).toBe('status')
    expect(region.getAttribute('aria-busy')).toBe('true')
    // More than one block, or it is a spinner wearing a rectangle.
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(1)
  })

  it('names the wait for a screen reader rather than leaving unlabelled boxes', () => {
    render(<RouteLoading />)
    expect(screen.getByText('loading')).toBeTruthy()
  })
})

describe('RouteError', () => {
  it('renders the title and message with the shared icon and layout', () => {
    const { container } = render(
      <RouteError title="Could not load your dashboard." message="network down" />
    )
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('flex-col')
    expect(wrapper.className).toContain('items-center')
    expect(wrapper.className).toContain('gap-3')
    expect(wrapper.className).toContain('py-24')
    expect(wrapper.className).toContain('text-center')

    expect(screen.getByText('Could not load your dashboard.')).toBeTruthy()
    expect(screen.getByText('network down')).toBeTruthy()
  })

  it('defaults to a Retry button that reloads the page', () => {
    const reload = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload },
    })

    render(<RouteError title="Could not load your applications." message="network down" />)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(reload).toHaveBeenCalledTimes(1)

    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('lets a caller override the default retry action, as the detail route does', () => {
    render(
      <RouteError
        title="Could not find that application."
        message="It may have been deleted, or the link may be wrong."
        action={<a href="/applications">Back to applications</a>}
      />
    )
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Back to applications' })).toBeTruthy()
  })
})
