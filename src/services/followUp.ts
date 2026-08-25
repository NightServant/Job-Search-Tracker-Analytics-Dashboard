import type { JobStatus } from '@/types'

export interface StaleCandidate {
  id: string
  company: string
  role: string
  status: JobStatus
  /** Most recent sign of life: applied date, status change, or activity note. */
  last_touched_at: string
}

/**
 * Statuses where silence is actionable.
 *
 * wishlist was never sent, so there is nobody to chase. offer and rejected are
 * resolved — an old rejection is not a follow-up, it is history.
 */
const IN_FLIGHT: readonly JobStatus[] = ['applied', 'interviewing']

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Applications that have gone quiet for longer than `days`.
 *
 * Pure over rows the caller already has, so the dashboard nudge costs no extra
 * query. `now` is injectable because a function that reads the clock cannot be
 * tested at a boundary.
 *
 * Exactly `days` old is not yet stale — the threshold is the point at which
 * chasing becomes reasonable, so the nudge fires the day after, not on it.
 */
export function getStaleApplications(
  candidates: StaleCandidate[],
  days: number,
  now: Date = new Date()
): StaleCandidate[] {
  const cutoff = now.getTime() - days * DAY_MS
  return candidates
    .filter((c) => IN_FLIGHT.includes(c.status))
    .filter((c) => new Date(c.last_touched_at).getTime() < cutoff)
    .sort(
      (a, b) =>
        new Date(a.last_touched_at).getTime() - new Date(b.last_touched_at).getTime()
    )
}
