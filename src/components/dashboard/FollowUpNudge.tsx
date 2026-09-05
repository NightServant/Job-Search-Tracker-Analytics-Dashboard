'use client'

import * as React from 'react'
import Link from 'next/link'
import { AppDialog } from '@/components/ui/app-dialog'
import { Button } from '@/components/ui/button'
import { ClockIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
import { useAppHref } from '@/components/shell/routeBase'
import { formatTouchedDate } from '@/services/date'
import type { StaleCandidate } from '@/services/followUp'

/**
 * The one thing on the dashboard that asks for an action today.
 *
 * Renders nothing when nothing is stale. An "all caught up" card looks like
 * content, so the eye learns to skip that slot and then skips it on the day it
 * matters. Absence is the stronger signal.
 *
 * A COUNT AND A CONTROL, NOT A LIST. It used to render every quiet application
 * inline, and on a real search that is routinely fifteen rows -- which made
 * the one panel whose job is "the single thing to do today" the longest
 * element on the dashboard, pushing both charts below the fold. A list that
 * long is also not a nudge: nobody chases fifteen companies this morning. The
 * backlog moved into a dialog, so the dashboard states the problem and the
 * dialog is where you work through it.
 *
 * The dialog lists ALL of them rather than a capped subset: AppDialog's body
 * already scrolls, so there is nothing to gain by hiding rows, and a truncated
 * dialog would understate the backlog -- making it look handled when it is
 * not, which is a worse failure than the overlong panel this replaces.
 *
 * The rule is neutral, not a status colour: "needs chasing" is a property of
 * your attention, not of the application's status, and the five status hues
 * are spoken for.
 *
 * Rows link to the candidate's own detail route rather than the unfiltered
 * list -- `candidate.id` is the job id, and this is the one element whose
 * entire purpose is "go deal with THIS application", so landing anywhere less
 * specific defeats it. Through `appHref`, so the links stay inside /demo when
 * the demo renders this same component.
 *
 * `last_touched_at` is formatted with `formatTouchedDate`, not
 * `formatShortDate`/`formatAppliedDate` -- it is typically a `TIMESTAMPTZ`
 * instant (see that function's docblock in `services/date.ts`), and this
 * card's whole job is telling the viewer how long it's been sitting, which a
 * UTC read gets wrong for part of every day outside UTC.
 */
export function FollowUpNudge({ stale }: { stale: StaleCandidate[] }) {
  // Above the early return, not below it. This component renders null when
  // nothing is stale, so a hook called after that guard runs on some renders
  // and not others -- and the day a follow-up appears, the hook order changes
  // underneath React.
  const appHref = useAppHref()
  const [open, setOpen] = React.useState(false)

  if (stale.length === 0) return null

  const count = stale.length

  return (
    <section data-follow-up className="border-l-2 border-border-strong pl-4">
      <h2 className="text-label-caps uppercase text-text-muted">needs a follow-up</h2>
      {/*
        The count lives ON the control rather than in a sentence beside it, so
        the whole panel is one line. Splitting it into "15 applications have
        gone quiet" plus a "review" button says the number twice as far as the
        reader is concerned, and the point of this change was to stop this
        panel taking more room than the charts it sits above.
      */}
      <div className="mt-2">
        <Button size="s" variant="secondary" onClick={() => setOpen(true)}>
          <ClockIcon size={16} aria-hidden className={iconMotion('none')} />
          review {count} follow-up{count === 1 ? '' : 's'}
        </Button>
      </div>

      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title="needs a follow-up"
        icon="Clock"
        description="Longest silence first. Open one to pick up where it stopped."
      >
        <ul className="flex flex-col gap-3">
          {stale.map((candidate) => (
            <li key={candidate.id} className="flex items-center justify-between gap-4">
              <Link
                href={appHref(`/applications/${candidate.id}`)}
                onClick={() => setOpen(false)}
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
      </AppDialog>
    </section>
  )
}
