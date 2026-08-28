import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// The route wrapper must read the same react-query cache every other screen
// reads (ApplicationsPage, ApplicationForm, useJobStats) rather than
// fetching on its own -- a second, cache-independent fetch here is exactly
// the stale-KPI bug this hook exists to prevent. Mocking the hook module
// lets these tests drive its isLoading/error/data states directly without
// standing up AuthProvider or QueryClientProvider.
const useJobsMock = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/useJobs', () => ({ useJobs: useJobsMock }))

import Page from '../page'

describe('Dashboard route wrapper', () => {
  it('shows a spinner while jobs are loading, not an empty dashboard', () => {
    useJobsMock.mockReturnValue({ data: undefined, isLoading: true, error: null })
    const { container } = render(<Page />)
    expect(container.querySelector('[role="status"]')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull()
  })

  it('surfaces a fetch error instead of rendering a zeroed-out KPI strip', () => {
    // A KPI strip of zeros is indistinguishable from a real empty account,
    // so a failed fetch has to say so rather than rendering the dashboard
    // body with an empty jobs array.
    useJobsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('network down'),
    })
    render(<Page />)
    expect(screen.getByText(/network down/)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  })

  it('renders the dashboard body from the shared jobs cache once loaded', () => {
    useJobsMock.mockReturnValue({ data: [], isLoading: false, error: null })
    render(<Page />)
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeTruthy()
    expect(useJobsMock).toHaveBeenCalled()
  })
})
