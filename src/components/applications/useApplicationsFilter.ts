'use client'

import * as React from 'react'
import { sortJobs, type JobSort } from '@/lib/jobSort'
import { STATUS_TABS, type StatusTabValue } from './StatusTabs'
import type { Job } from '@/types'

/**
 * Everything between the full list of applications and the ten rows on screen.
 *
 * PULLED OUT OF `ApplicationsPage` ON 2026-09-11, which had grown to 701 lines
 * and twenty hook calls in one function body. The split follows the seams the
 * STATE already marked rather than a line count: search, sort, tab and page
 * only ever talk to each other and to `jobs`, so they were a self-contained
 * slice sharing a scope with CSV import, dialog lifecycles and deep-link
 * reconciliation for no reason except that they were typed into the same file.
 *
 * THE POINT IS BLAST RADIUS, NOT TIDINESS. In one scope nothing stopped a new
 * effect reaching for `page`, or the import flow reading `searched`. Here the
 * inputs are a list and the outputs are a view of it, and anything else that
 * wants to participate has to be passed in deliberately.
 *
 * IT IS ALSO NOW TESTABLE WITHOUT RENDERING THE PAGE. Every assertion about
 * paging, clamping or tab counts previously needed the whole surface mounted
 * with nineteen props, which is most of why the page's test file is a thousand
 * lines.
 *
 * ORDERING IS `date_applied`, NEWEST FIRST by default -- not `created_at`,
 * which is when the row was typed into Worktrack rather than when the
 * application went out. The column the table prints is `applied on`, so
 * sorting on the other one made the table disagree with itself on screen. See
 * `lib/jobSort` for where a wishlist row with no applied date is placed.
 */

/** Rows per page. Ten fits the table's own height cap without scrolling it. */
export const PAGE_SIZE = 10

export interface ApplicationsFilter {
  search: string
  setSearch: (value: string) => void
  sort: JobSort
  setSort: (value: JobSort) => void
  tab: StatusTabValue
  setTab: (value: StatusTabValue) => void

  /** 1-based, already clamped to a page that exists. */
  page: number
  /**
   * React's own setter type, not `(value: number) => void`.
   *
   * The pagination controls step with `setPage((p) => p + 1)`, and narrowing
   * this to a plain value would have forced those call sites to read `page`
   * and compute the next one themselves -- reintroducing exactly the stale
   * closure that the functional form exists to avoid.
   */
  setPage: React.Dispatch<React.SetStateAction<number>>
  pageCount: number

  /** Matching the search, sorted. Every tab count is computed from this. */
  searched: Job[]
  /** `searched`, narrowed to the active tab. */
  listed: Job[]
  /** The rows actually rendered. */
  paged: Job[]
  counts: Record<StatusTabValue, number>
  /** Set only when an empty list needs a reason other than "no matches". */
  emptyListMessage: string | undefined
}

export function useApplicationsFilter(jobs: Job[]): ApplicationsFilter {
  const [search, setSearch] = React.useState('')
  // DEFAULT `applied`: both tables ordered by the date the application
  // actually went out, newest first. See the docblock.
  const [sort, setSort] = React.useState<JobSort>('applied')
  const [tab, setTab] = React.useState<StatusTabValue>('all')
  const [page, setPage] = React.useState(1)

  const searched = React.useMemo(() => {
    const needle = search.trim().toLowerCase()
    const matched = needle
      ? jobs.filter(
          (job) =>
            job.company.toLowerCase().includes(needle) ||
            job.role.toLowerCase().includes(needle)
        )
      : jobs
    return sortJobs(matched, sort)
  }, [jobs, search, sort])

  const counts = React.useMemo(() => {
    const result = Object.fromEntries(
      STATUS_TABS.map((value) => [value, 0])
    ) as Record<StatusTabValue, number>
    result.all = searched.length
    for (const job of searched) result[job.status] += 1
    return result
  }, [searched])

  const listed = React.useMemo(
    () => (tab === 'all' ? searched : searched.filter((job) => job.status === tab)),
    [searched, tab]
  )

  const pageCount = Math.max(1, Math.ceil(listed.length / PAGE_SIZE))
  // CLAMPED RATHER THAN STORED. Deleting the last row of page 3, or narrowing
  // the search, would otherwise leave somebody on an empty page with no way
  // back except paging backwards through nothing.
  const current = Math.min(page, pageCount)
  const paged = React.useMemo(
    () => listed.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    [listed, current]
  )

  // Search, tab and sort all change the result set, so the page index they
  // were valid for is meaningless afterwards.
  React.useEffect(() => {
    setPage(1)
  }, [search, tab, sort])

  // A status tab at zero is a real, expected state -- nobody has an offer on
  // day one -- not a search yielding nothing. It gets its own sentence rather
  // than the generic "nothing matches these filters", which would misname the
  // cause.
  const emptyListMessage =
    tab === 'all'
      ? undefined
      : `no ${tab} applications${search.trim() ? ' match this search' : ' yet'}.`

  return {
    search,
    setSearch,
    sort,
    setSort,
    tab,
    setTab,
    page: current,
    setPage,
    pageCount,
    searched,
    listed,
    paged,
    counts,
    emptyListMessage,
  }
}
