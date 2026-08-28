import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { RouteLoading, RouteError } from '../route-states'

afterEach(() => cleanup())

describe('RouteLoading', () => {
  it('centers a size-24 spinner the same way all three routes used to', () => {
    const { container } = render(<RouteLoading />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper.className).toContain('flex')
    expect(wrapper.className).toContain('justify-center')
    expect(wrapper.className).toContain('py-24')
    expect(wrapper.querySelector('[role="status"]')).toBeTruthy()
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
