import { getStaleApplications } from '@/services/followUp'
import type { CalendarEvent, EventKind } from '@/services/events'
import type { Job } from '@/types'

/**
 * What the planner should put in front of somebody, merged from two sources.
 *
 * THE SECTION WAS EMPTY ON A REAL ACCOUNT, which is the whole reason this
 * exists (Gabe, 2026-09-11: "my account still does not have any data for this
 * section"). `up next` read `events` alone, and an account with fifty-two
 * applications and no interviews booked yet has no events at all -- so the
 * busiest user of the app got a heading over nothing while a demo fixture with
 * five invented events looked fine. A panel that only fills up once you are
 * already succeeding is a panel that is absent exactly when it would help.
 *
 * SO IT MERGES WHAT IS BOOKED WITH WHAT HAS GONE QUIET. Applications sitting
 * in flight past the follow-up threshold are the thing that needs doing when
 * nothing is scheduled, and they are computed from `date_applied` and
 * `updated_at` -- columns every account has from its first row. The staleness
 * rule is `services/followUp`'s, unchanged and unduplicated: the Overview's
 * nudge and this rail agree by construction rather than by coincidence.
 *
 * ORDER IS TIME, THEN NEGLECT. Anything with a clock on it comes first,
 * soonest to latest -- a booked interview outranks a chase whatever the
 * numbers say. Chases follow, longest-quiet first, because that is the one
 * most likely to be dead.
 */

/** In flight and untouched for this long is when chasing becomes reasonable. */
export const QUIET_AFTER_DAYS = 14

/** How many cards the rail carries before it is just a list again. */
const MAX_ITEMS = 10

const DAY_MS = 24 * 60 * 60 * 1000

const EVENT_LABELS: Record<EventKind, string> = {
  interview: 'interview',
  deadline: 'deadline',
  take_home: 'take-home',
  follow_up: 'follow-up',
  other: 'event',
}

export interface UpNextItem {
  id: string
  /** `event` is booked; `chase` is an application nobody has answered. */
  kind: 'event' | 'chase'
  /** `interview`, `deadline`, … or `no reply`. */
  label: string
  title: string
  company: string | null
  /** The instant it happens. Null on a chase — there is nothing booked. */
  at: string | null
  /** Days since the last sign of life. Only on a chase. */
  quietDays?: number
  /** The application it belongs to, for the link out. */
  jobId: string | null
}

export function buildUpNext(
  events: CalendarEvent[],
  jobs: Job[],
  now: Date = new Date()
): UpNextItem[] {
  const companyById = new Map(jobs.map((job) => [job.id, job.company]))

  // UPCOMING ONLY. `listUpcoming` already filters at the database, but the
  // demo fixture and any cached page can carry an event that has since gone
  // past, and "up next" must never point backwards.
  const booked: UpNextItem[] = events
    .filter((event) => new Date(event.starts_at).getTime() >= now.getTime())
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((event) => ({
      id: `event-${event.id}`,
      kind: 'event' as const,
      label: EVENT_LABELS[event.kind] ?? 'event',
      title: event.title,
      company: event.job_id ? (companyById.get(event.job_id) ?? null) : null,
      at: event.starts_at,
      jobId: event.job_id,
    }))

  // The same `last_touched_at` precedence the Overview's nudge uses: the
  // freshest timestamp on the row stands in for an activity log this screen
  // does not read.
  const quiet = getStaleApplications(
    jobs.map((job) => ({
      id: job.id,
      company: job.company,
      role: job.role,
      status: job.status,
      last_touched_at: job.updated_at || job.date_applied || job.created_at,
    })),
    QUIET_AFTER_DAYS,
    now
  ).map((stale) => ({
    id: `chase-${stale.id}`,
    kind: 'chase' as const,
    label: 'no reply',
    title: stale.role,
    company: stale.company,
    at: null,
    quietDays: Math.max(
      0,
      Math.round((now.getTime() - new Date(stale.last_touched_at).getTime()) / DAY_MS)
    ),
    jobId: stale.id,
  }))

  return [...booked, ...quiet].slice(0, MAX_ITEMS)
}
