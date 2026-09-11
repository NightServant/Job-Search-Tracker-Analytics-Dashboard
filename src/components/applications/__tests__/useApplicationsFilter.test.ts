import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useApplicationsFilter, PAGE_SIZE } from '../useApplicationsFilter'
import type { Job, JobStatus } from '@/types'

/**
 * THE POINT OF THE EXTRACTION, demonstrated: none of this mounts the page.
 * Every assertion below previously required the whole /applications surface
 * rendered with nineteen props, which is most of why that file's test suite
 * runs to a thousand lines.
 */
function job(overrides: Partial<Job> = {}): Job {
  return {
    id: Math.random().toString(36).slice(2),
    company: 'Acme',
    role: 'Engineer',
    status: 'applied' as JobStatus,
    date_applied: '2026-01-01',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Job
}

const many = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    job({ id: `j${i}`, company: `Company ${i}`, date_applied: `2026-01-${String((i % 28) + 1).padStart(2, '0')}` })
  )

describe('useApplicationsFilter', () => {
  it('pages at PAGE_SIZE and reports how many pages there are', () => {
    const { result } = renderHook(() => useApplicationsFilter(many(25)))
    expect(result.current.paged).toHaveLength(PAGE_SIZE)
    expect(result.current.pageCount).toBe(3)
  })

  it('CLAMPS to a page that exists when the list shrinks under you', () => {
    // Deleting the last row of page 3, or narrowing a search, would otherwise
    // strand somebody on an empty page with no way back except paging
    // backwards through nothing.
    const { result, rerender } = renderHook(({ jobs }) => useApplicationsFilter(jobs), {
      initialProps: { jobs: many(25) },
    })
    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)

    rerender({ jobs: many(5) })
    expect(result.current.page).toBe(1)
    expect(result.current.paged).toHaveLength(5)
  })

  it('resets to page one when the result set changes', () => {
    const { result } = renderHook(() => useApplicationsFilter(many(25)))
    act(() => result.current.setPage(3))
    act(() => result.current.setSearch('Company 1'))
    expect(result.current.page).toBe(1)
  })

  it('searches company and role, case-insensitively', () => {
    const jobs = [
      job({ company: 'Stripe', role: 'Backend' }),
      job({ company: 'Acme', role: 'Frontend Engineer' }),
    ]
    const { result } = renderHook(() => useApplicationsFilter(jobs))
    act(() => result.current.setSearch('stripe'))
    expect(result.current.searched.map((j) => j.company)).toEqual(['Stripe'])

    act(() => result.current.setSearch('FRONTEND'))
    expect(result.current.searched.map((j) => j.company)).toEqual(['Acme'])
  })

  it('counts every tab from the SEARCHED set, not the whole list', () => {
    // Otherwise the tab badges describe a list the user is not looking at.
    const jobs = [
      job({ company: 'Stripe', status: 'offer' as JobStatus }),
      job({ company: 'Stripe', status: 'applied' as JobStatus }),
      job({ company: 'Other', status: 'offer' as JobStatus }),
    ]
    const { result } = renderHook(() => useApplicationsFilter(jobs))
    act(() => result.current.setSearch('stripe'))
    expect(result.current.counts.all).toBe(2)
    expect(result.current.counts.offer).toBe(1)
  })

  it('narrows to the active tab without changing the counts', () => {
    const jobs = [
      job({ status: 'offer' as JobStatus }),
      job({ status: 'applied' as JobStatus }),
    ]
    const { result } = renderHook(() => useApplicationsFilter(jobs))
    act(() => result.current.setTab('offer'))
    expect(result.current.listed).toHaveLength(1)
    expect(result.current.counts.all).toBe(2)
  })

  it('explains an empty TAB differently from an empty SEARCH', () => {
    // A status tab at zero is expected -- nobody has an offer on day one --
    // and saying "nothing matches these filters" would misname the cause.
    const { result } = renderHook(() => useApplicationsFilter([job()]))
    expect(result.current.emptyListMessage).toBeUndefined()

    act(() => result.current.setTab('offer'))
    expect(result.current.emptyListMessage).toBe('no offer applications yet.')

    act(() => result.current.setSearch('zzz'))
    expect(result.current.emptyListMessage).toBe('no offer applications match this search.')
  })

  it('never reports page zero, even with nothing to show', () => {
    const { result } = renderHook(() => useApplicationsFilter([]))
    expect(result.current.pageCount).toBe(1)
    expect(result.current.page).toBe(1)
    expect(result.current.paged).toEqual([])
  })
})
