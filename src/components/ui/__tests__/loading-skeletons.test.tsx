import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { DelayedSkeleton, RouteSkeleton, PanelSkeleton } from '../loading-skeletons'

describe('DelayedSkeleton', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders nothing for the first 200ms', () => {
    // The Figma motion spec (node 43:523) states the rule outright: "Shows
    // after 200ms, so fast loads never flash." A skeleton that appears
    // instantly is worse than a spinner -- it paints a whole fake page for one
    // frame and then replaces it, which reads as a bug.
    render(
      <DelayedSkeleton>
        <div data-testid="body" />
      </DelayedSkeleton>
    )
    expect(screen.queryByTestId('body')).toBeNull()
    // Positive companion, so this cannot pass by rendering nothing forever:
    act(() => { vi.advanceTimersByTime(200) })
    expect(screen.getByTestId('body')).toBeTruthy()
  })

  it('honours a custom delay', () => {
    render(
      <DelayedSkeleton delayMs={500}>
        <div data-testid="body" />
      </DelayedSkeleton>
    )
    // Advance in a separate act block from the assertion below it -- a single
    // combined advance fired two M5 timers before any microtask flush and hid
    // a feature that had never once worked.
    act(() => { vi.advanceTimersByTime(200) })
    expect(screen.queryByTestId('body')).toBeNull()
    act(() => { vi.advanceTimersByTime(300) })
    expect(screen.getByTestId('body')).toBeTruthy()
  })
})

describe('RouteSkeleton', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function show(ui: React.ReactElement) {
    const result = render(ui)
    // RouteSkeleton wraps itself in the 200ms gate, so nothing is in the DOM
    // until the delay elapses. Every assertion below is about what it draws
    // once it is visible, not about the gate -- DelayedSkeleton owns that.
    act(() => { vi.advanceTimersByTime(200) })
    return result
  }

  it('is announced as busy, not silently blank', () => {
    show(<RouteSkeleton variant="dashboard" />)
    const region = screen.getByRole('status')
    expect(region.getAttribute('aria-busy')).toBe('true')
    expect(region.textContent).toContain('Loading')
  })

  it('draws a different shape per variant', () => {
    // A single generic skeleton reused everywhere is a grey rectangle, which
    // is the thing skeletons exist to not be.
    const { container: dash, unmount } = show(<RouteSkeleton variant="dashboard" />)
    const dashCount = dash.querySelectorAll('[data-skeleton]').length
    unmount()
    const { container: table } = show(<RouteSkeleton variant="table" />)
    const tableCount = table.querySelectorAll('[data-skeleton]').length
    expect(dashCount).toBeGreaterThan(0)
    expect(tableCount).toBeGreaterThan(0)
    expect(dashCount).not.toBe(tableCount)
  })
})

describe('PanelSkeleton', () => {
  it('draws the number of rows it was asked for', () => {
    const { container } = render(<PanelSkeleton rows={4} />)
    expect(container.querySelectorAll('[data-skeleton]')).toHaveLength(4)
  })
})
