import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

// The route owns all five analytics reads and the auth read that supplies
// their userId. Mocking both modules drives every combination directly,
// without standing up AuthProvider or QueryClientProvider -- same technique
// dashboard/__tests__/page.test.tsx and calendar/__tests__/page.test.tsx use
// for their own hooks.
const useAuthMock = vi.hoisted(() => vi.fn())
const useTimeInStageMock = vi.hoisted(() => vi.fn())
const useConversionFunnelMock = vi.hoisted(() => vi.fn())
const useSourceConversionTrendsMock = vi.hoisted(() => vi.fn())
const useCohortAnalysisMock = vi.hoisted(() => vi.fn())
const useConversionMetricsMock = vi.hoisted(() => vi.fn())

vi.mock('@/contexts/AuthContext', () => ({ useAuth: useAuthMock }))
vi.mock('@/hooks/useAnalytics', () => ({
  useTimeInStage: useTimeInStageMock,
  useConversionFunnel: useConversionFunnelMock,
  useSourceConversionTrends: useSourceConversionTrendsMock,
  useCohortAnalysis: useCohortAnalysisMock,
  useConversionMetrics: useConversionMetricsMock,
}))

import Page from '../page'

afterEach(cleanup)

const LOADING = { data: undefined, isLoading: true, error: null }
const EMPTY_OK = { data: [], isLoading: false, error: null }
const METRICS_OK = {
  data: { totalJobs: 0, timeToFirstInterview: null, timeToOffer: null, conversionRate: 0, conversionBySource: {} },
  isLoading: false,
  error: null,
}
const FAILED = { data: undefined, isLoading: false, error: new Error('network down') }

function mockAll(state: typeof LOADING | typeof EMPTY_OK | typeof FAILED) {
  useTimeInStageMock.mockReturnValue(state)
  useConversionFunnelMock.mockReturnValue(state)
  useSourceConversionTrendsMock.mockReturnValue(state)
  useCohortAnalysisMock.mockReturnValue(state)
  useConversionMetricsMock.mockReturnValue(state === EMPTY_OK ? METRICS_OK : state)
}

describe('Analytics route wrapper', () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ user: { id: 'user-1' } })
  })

  it('shows a spinner while every metric is still loading, not an empty screen', () => {
    mockAll(LOADING)
    const { container } = render(<Page />)
    expect(container.querySelector('[role="status"]')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Analytics' })).toBeNull()
  })

  it('surfaces a total failure rather than rendering five empty panels', () => {
    mockAll(FAILED)
    render(<Page />)
    expect(screen.getByText(/network down/)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Analytics' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('does not blank the page when only one of five metrics is still loading', () => {
    useTimeInStageMock.mockReturnValue(LOADING)
    useConversionFunnelMock.mockReturnValue(EMPTY_OK)
    useSourceConversionTrendsMock.mockReturnValue(EMPTY_OK)
    useCohortAnalysisMock.mockReturnValue(EMPTY_OK)
    useConversionMetricsMock.mockReturnValue(METRICS_OK)
    render(<Page />)
    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeTruthy()
  })

  it('does not blank the page when only one of five metrics has failed', () => {
    // This is the ruling B defect Task 5 already fixed once: the
    // useAnalytics() aggregator's error is the first non-null of five, which
    // would have turned this into the same RouteError as a total failure.
    useTimeInStageMock.mockReturnValue(EMPTY_OK)
    useConversionFunnelMock.mockReturnValue(EMPTY_OK)
    useSourceConversionTrendsMock.mockReturnValue(EMPTY_OK)
    useCohortAnalysisMock.mockReturnValue(FAILED)
    useConversionMetricsMock.mockReturnValue(METRICS_OK)
    render(<Page />)
    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeTruthy()
    expect(screen.getByText(/network down/)).toBeTruthy()
  })
})
