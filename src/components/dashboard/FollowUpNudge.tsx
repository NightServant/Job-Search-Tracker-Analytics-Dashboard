import Link from 'next/link'
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
              href="/applications"
              className="truncate text-body-m text-text-primary hover:text-accent-default"
            >
              {candidate.company} — {candidate.role}
            </Link>
            <time className="tabular shrink-0 text-body-s text-text-muted">
              since{' '}
              {new Date(candidate.last_touched_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </time>
          </li>
        ))}
      </ul>
    </section>
  )
}
