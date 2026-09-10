import { StatCard } from '@/components/ui/stat-card'
import { jobStats } from '@/lib/overviewSeries'
import type { Job } from '@/types'

/**
 * The Overview's headline numbers, as cards (Gabe, 2026-09-10).
 *
 * FOUR, NOT FIVE. `KpiStrip` showed applications, interviews, offers,
 * rejected and success rate as five undivided figures. Gabe asked for four
 * cards, two matching each column of the grid below -- so `rejected` gives up
 * its own slot and becomes the detail line under `offers`, which is where it
 * was most useful anyway: an offer count means one thing beside a 4 and
 * another beside a 40.
 *
 * THE GRID ALIGNS WITH THE ONE BELOW IT, exactly, and that is arithmetic
 * rather than luck. A two-column grid of width W and gap g gives columns of
 * (W - g)/2; a four-column grid of the same width and gap gives (W - 3g)/4,
 * and two of those plus the gap between them is (W - 3g)/2 + g = (W - g)/2.
 * So each pair of cards here lands exactly on one chart card below, provided
 * both grids use `gap-section`. They do.
 *
 * Two columns on a phone rather than one: these are four short cards, and one
 * per row would push the first chart below three screens of scrolling.
 */
export function HeadlineStats({ jobs }: { jobs: Job[] }) {
  const stats = jobStats(jobs)

  return (
    // `data-kpi-strip` is kept from the component this replaces: it is what
    // the dashboard test uses to assert this row sits above the follow-up
    // nudge, and that ordering did not change.
    <section data-kpi-strip className="grid grid-cols-2 gap-section xl:grid-cols-4">
      <StatCard
        icon="Applications"
        label="applications"
        value={stats.sent}
        detail={
          stats.wishlist > 0
            ? `${stats.wishlist} more on the wishlist`
            : 'everything you have sent'
        }
      />
      <StatCard
        icon="Calendar"
        label="interviews"
        value={stats.interviewing}
        detail={
          stats.sent > 0
            ? `${Math.round((stats.interviewing / stats.sent) * 100)}% of what you sent`
            : 'nothing sent yet'
        }
      />
      <StatCard
        icon="ShieldCheck"
        label="offers"
        value={stats.offers}
        detail={stats.rejected > 0 ? `${stats.rejected} rejected` : 'none rejected'}
      />
      <StatCard
        icon="Analytics"
        label="success rate"
        value={`${stats.responseRate}%`}
        detail={
          stats.sent > 0
            ? `${stats.responded} of ${stats.sent} heard back`
            : 'nothing sent yet'
        }
      />
    </section>
  )
}

/** `sep`, `aug` — the label the month-on-month line names. */
function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' }).toLowerCase()
}

function momentum(thisMonth: number, lastMonth: number, previous: Date): string {
  const label = monthLabel(previous)
  if (thisMonth === 0 && lastMonth === 0) return `nothing in ${label} either`
  const delta = thisMonth - lastMonth
  if (delta > 0) return `${delta} more than ${label}`
  if (delta < 0) return `${-delta} fewer than ${label}`
  return `the same as ${label}`
}

function waiting(count: number, days: number | null): string {
  if (count === 0) return 'nothing is waiting on a reply'
  if (days === null) return 'no send date on any of them'
  if (days === 0) return 'the oldest went out today'
  if (days === 1) return 'the oldest went out yesterday'
  return `the oldest went out ${days} days ago`
}

/**
 * Two more cards, immediately above the recent-applications table (Gabe,
 * 2026-09-10: "I highly recommend to add more two card components before
 * recent applications table").
 *
 * THEY ANSWER WHAT THE FOUR ABOVE DO NOT. The headline row is a snapshot --
 * how many, how far along -- and says nothing about pace or about what is
 * owed a chase. These are the two questions somebody opens a job tracker on a
 * Monday morning to ask: am I still sending, and what has gone quiet.
 *
 * `waiting on a reply` is deliberately NOT the follow-up nudge. The nudge
 * fires at fourteen days and lists specific rows to chase; this counts
 * everything still at `applied`, including yesterday's, and is the
 * denominator that nudge is a slice of.
 */
export function PipelineStats({ jobs }: { jobs: Job[] }) {
  const now = new Date()
  const stats = jobStats(jobs, now)
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  return (
    <>
      <StatCard
        icon="Clock"
        label={`added in ${monthLabel(now)}`}
        value={stats.thisMonth}
        detail={momentum(stats.thisMonth, stats.lastMonth, previous)}
      />
      <StatCard
        icon="Flag"
        label="waiting on a reply"
        value={stats.awaitingReply}
        detail={waiting(stats.awaitingReply, stats.oldestWaitDays)}
      />
    </>
  )
}
