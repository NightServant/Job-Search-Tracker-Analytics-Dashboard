import Link from 'next/link'
import { formatTouchedDate } from '@/services/date'
import type { StaleCandidate } from '@/services/followUp'

/**
 * The one thing on the dashboard that asks for an action today.
 *
 * Renders nothing when nothing is stale. An "all caught up" card looks like
 * content, so the eye learns to skip that slot and then skips it on the day it
 * matters. Absence is the stronger signal.
 *
 * The rule is neutral, not a status colour: "needs chasing" is a property of
 * your attention, not of the application's status, and the five status hues
 * are spoken for.
 *
 * Links to the candidate's own detail route rather than the unfiltered list
 * -- `candidate.id` is the job id, and this is the one element on the
 * dashboard whose entire purpose is "go deal with THIS application," so
 * landing anywhere less specific defeats it.
 *
 * `last_touched_at` is formatted with `formatTouchedDate`, not
 * `formatShortDate`/`formatAppliedDate` -- it is typically a `TIMESTAMPTZ`
 * instant (see that function's docblock in `services/date.ts`), and this
 * card's whole job is telling the viewer how long it's been sitting, which a
 * UTC read gets wrong for part of every day outside UTC.
 */
export function FollowUpNudge({ stale }: { stale: StaleCandidate[] }) {
  if (stale.length === 0) return null

  return (
    <section data-follow-up className="border-l-2 border-border-strong pl-4">
      <h2 className="text-label-caps uppercase text-text-muted">Needs a follow-up</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {stale.map((candidate) => (
          <li key={candidate.id} className="flex items-center justify-between gap-4">
            <Link
              href={`/applications/${candidate.id}`}
              className="truncate text-body-m text-text-primary hover:text-accent-default"
            >
              {candidate.company} — {candidate.role}
            </Link>
            <time className="tabular shrink-0 text-body-s text-text-muted">
              since {formatTouchedDate(candidate.last_touched_at)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  )
}
