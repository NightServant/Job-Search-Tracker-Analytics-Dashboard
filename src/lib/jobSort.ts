import type { Job } from '@/types'

/**
 * How the two application tables are ordered.
 *
 * `applied` IS THE DEFAULT, and it is the whole point of this file. Both
 * tables used to render whatever order `jobService.getJobs` returned --
 * `created_at` descending, which is when the ROW was added to Worktrack, not
 * when the application went out. The two agree only if you record every
 * application the day you send it, and Gabe's list showed five rows all dated
 * "Aug 25" in an order nothing on screen explained.
 *
 * The other two are the alphabetical filter the applications table asked for.
 * There is no ascending/descending pair for them: a company list is read A-Z
 * and a reversed one answers no question anybody has.
 */
export type JobSort = 'applied' | 'company' | 'position'

export const JOB_SORTS: { value: JobSort; label: string }[] = [
  { value: 'applied', label: 'recently applied' },
  { value: 'company', label: 'company A–Z' },
  { value: 'position', label: 'position A–Z' },
]

/**
 * A wishlist row has no `date_applied`, and that is not a missing value to be
 * guessed at -- it has genuinely not been applied to. Falling back to
 * `created_at` would slot it among the applications by the date it was
 * BOOKMARKED, which reads as an applied date that is simply wrong.
 *
 * So they sort last, and among themselves by when they were added.
 */
function appliedTime(job: Job): number {
  // Bare DATE, parsed as UTC midnight -- the same reading `formatAppliedDate`
  // uses. Appending the time is what stops V8 reading `2026-08-25` in the
  // viewer's zone and shifting the day for half the world.
  return job.date_applied ? Date.parse(`${job.date_applied}T00:00:00Z`) : Number.NaN
}

function createdTime(job: Job): number {
  return Date.parse(job.created_at)
}

/** Case- and accent-insensitive, so `ÅBB` and `abb` land where a reader expects. */
function byText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

/** A stable copy in the requested order. Never sorts the caller's array. */
export function sortJobs(jobs: Job[], sort: JobSort): Job[] {
  const rows = jobs.slice()
  switch (sort) {
    case 'company':
      return rows.sort((a, b) => byText(a.company, b.company) || byText(a.role, b.role))
    case 'position':
      return rows.sort((a, b) => byText(a.role, b.role) || byText(a.company, b.company))
    case 'applied':
    default:
      return rows.sort((a, b) => {
        const left = appliedTime(a)
        const right = appliedTime(b)
        const leftUnset = Number.isNaN(left)
        const rightUnset = Number.isNaN(right)
        if (leftUnset && rightUnset) return createdTime(b) - createdTime(a)
        if (leftUnset) return 1
        if (rightUnset) return -1
        // Newest first, and `created_at` breaks the ties a bare DATE creates:
        // five applications sent on one day would otherwise come back in
        // whatever order the query produced.
        return right - left || createdTime(b) - createdTime(a)
      })
  }
}
