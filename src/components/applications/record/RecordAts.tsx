'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { LazyPanel } from '@/components/ui/lazy-panel'

/**
 * THE ATS RING IS CODE-SPLIT (2026-09-11). It is the last thing pulling
 * recharts into this screen's first load, and it sits inside a panel most
 * visits never look at -- on /applications it lives in a dialog that starts
 * closed.
 *
 * `ssr: false` for the same reason as every other chart here: recharts
 * measures its container before drawing, and its `useId`-derived chart id was
 * a hydration mismatch between server and client.
 */
const AtsDonut = dynamic(() => import('@/components/ui/ats-donut').then((m) => m.AtsDonut), {
  ssr: false,
  loading: () => <LazyPanel height="h-40" label="the ATS score" />,
})
import { AlertCircleIcon } from '@/components/icons'
import { ICON_STATE_MOTION } from '@/components/icons/motion'
import { cn } from '@/lib/utils'
import { AtsLegend } from '@/components/ui/ats-donut'
import { AtsTermChips, AtsVerdict } from '@/components/ui/ats-verdict'
import { verdictFor } from '@/components/ui/ats-verdict-copy'
import { describeLink, type DocumentLinkSummary } from '@/services/applicationDocuments'
import type { KeywordMatch } from '@/services/atsMatch'

/**
 * The third column: how this CV reads against this posting, in full.
 *
 * READ-ONLY, ON PURPOSE (revision: "Third column has no EDIT FEATURES"). It
 * is derived from two things the user edits elsewhere -- the description in
 * the column to its left, and whichever CV is pinned to the application -- so
 * anything typeable here would be a control that writes somewhere else.
 *
 * WHAT MAKES IT "MUCH MORE COMPLETE" THAN THE OLD PANEL. The old one was a
 * ring and two comma-separated runs of text. This adds the three things a
 * reader actually wants next:
 *
 *   - A VERDICT IN WORDS. 57% means nothing without a scale; "fair match"
 *     plus the threshold it cleared does.
 *   - THE MATCHED TERMS AS TERMS, each one its own chip. Comma prose reads as
 *     a wall; sixty chips read as an inventory, and this is the half of the
 *     split that is meant to be encouraging rather than a to-do list.
 *   - WHICH CV WAS COMPARED. A score with no named CV beside it invites the
 *     reader to assume it scored the one they are thinking of.
 *
 * THE VERDICT AND THE CHIPS MOVED TO `ui/ats-verdict` (2026-09-13), because
 * the CV editor's tailoring rail was asked to read like this panel and the
 * only way that stays true is one implementation. What is left here is the
 * arrangement, which is this column's own business.
 */

export interface RecordAtsProps {
  match: KeywordMatch | null
  /** The CVs pinned to this application; the newest is the one that was scored. */
  links?: DocumentLinkSummary[]
  error?: boolean
  /**
   * Layout from the caller -- today the hairline that separates this panel
   * from the posting above it. It was removed as dead in a review and is back
   * because flipping the two panels gave it a job: the rule belongs to the
   * BOUNDARY, so it travels with whichever panel is second.
   */
  className?: string
  /**
   * How many chips each list shows before it folds.
   *
   * THIRTY-TWO, AND THE NUMBER IS A MEASUREMENT RATHER THAN A TASTE. It was
   * briefly unlimited -- the fold had existed only because the lists were
   * stacked under the ring, and in their own column there is nothing below
   * them to bury. On real data that was wrong in a way the small fixture could
   * not show: a 130-term posting put 53 matched and 77 missing tags down the
   * right column while the left one ends at 418px, so the panel was mostly a
   * tall list beside a short block of white. Gabe, on seeing it: "unwanted
   * space in the left column. Kindly reduce the number of tags in matched and
   * missing."
   *
   * THE LEFT COLUMN IS THE FIXED ONE -- verdict, ring, summation and the
   * provenance line come to ~418px whatever the posting says -- so the cap is
   * chosen to bring the right column up alongside it. Measured against a
   * 98-term posting in the running app: 20 a list ends at 311px, 30 and 32 at
   * 389, 36 at 441. Thirty-two is the round number inside the band that
   * straddles it, and it is a real reduction from a list of 77. What it hides
   * is one press away and the button says exactly how much.
   *
   * IT CANNOT BE EXACT, and that is fine: how many tags fit a row depends on
   * how long the words are, so a different posting lands a row either side.
   * Thirty pixels of slack at the foot of one column is the panel's padding;
   * a hundred and sixty is the thing that got reported.
   */
  termLimit?: number
}

export function RecordAts({
  match,
  links = [],
  error = false,
  termLimit = 32,
  className,
}: RecordAtsProps) {
  const comparedCv =
    links.length > 0
      ? [...links].sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0]
      : null

  return (
    /*
     * A BAND AND AN INVENTORY, and the split is by KIND OF READING rather than
     * by topic (Gabe, 2026-09-13: "relayout the ATS matching").
     *
     * WHAT WAS WRONG WITH THE PREVIOUS ONE. It was two columns -- the ring and
     * its numbers on the left, the tags on the right -- which made the panel's
     * height the height of its LONGEST child and left a hole under the other.
     * Two rounds of tuning a tag cap went into balancing those two columns,
     * which is the tell that the split itself was wrong: a layout you have to
     * keep re-measuring against its own content is a layout fighting the
     * content.
     *
     * THE HEADLINE IS ONE BAND, FULL WIDTH. The verdict, the ring, the counts
     * and the CV that was scored all answer one question -- "how did this do"
     * -- and they are a fixed amount of it whatever the posting says. Putting
     * them across the top means the band never has to balance against anything.
     *
     * THE TWO INVENTORIES ARE EQUAL COLUMNS UNDER IT, which is the one place a
     * two-column layout is honestly right here: matched and missing are the
     * same kind of thing at the same weight, read by comparison, and neither
     * is subordinate to the other. They are also the only part whose length
     * varies, so they are the only part that takes the leftover height.
     *
     * A CONTAINER QUERY, NOT A VIEWPORT ONE. `@2xl/ats-panel` is 672px: above
     * it there is room for the band to run horizontally and for two columns of
     * tags; below it everything stacks. `ats-panel`, not `ats`, because the
     * donut declares `@container/ats` for its own ring/legend split and two
     * containers of one name resolve against whichever is nearer.
     */
    <section
      // `flex-1` so the panel fills the frame its tab gives it: the inventory
      // below claims the leftover height, and "leftover" is only a number once
      // this section has one.
      className={cn('@container/ats-panel flex min-h-0 flex-1 flex-col gap-5', className)}
      aria-label="ATS match"
      data-record-ats
    >
      {error ? (
        <div className="flex items-start gap-2 text-body-s text-status-rejected-mark">
          <AlertCircleIcon size={16} className={cn('mt-0.5 shrink-0', ICON_STATE_MOTION.refuse)} />
          Could not load your CV to check the match. Try refreshing the page.
        </div>
      ) : match === null ? (
        <p className="text-body-s text-text-muted">
          Link a CV and add a job description to see how closely they match.
        </p>
      ) : (
        <>
          {/* THE BAND: THE PICTURE, THEN EVERYTHING THAT READS AS WORDS.

              IT WAS TWO EQUAL HALVES AND THE RIGHT ONE LOOKED EMPTY (Gabe,
              2026-09-13: "ATS matching top right column felt empty"). The ring
              took a full half of the band and carried its own counts under it,
              so the left side was ~250px tall while the right held a heading,
              a sentence and a line of provenance -- and the difference showed
              as a hole beside the ring.

              THE COUNTS MOVED ACROSS, which fixes it by rebalancing rather
              than by padding: `matched / missing / terms in posting` are
              numbers you READ, so they belong with the other things you read.
              `AtsDonut` keeps drawing the arc and `AtsLegend` is placed here,
              which is why the donut grew a `legend` switch rather than this
              file growing a second copy of that markup.

              THE RING IS A FIXED COLUMN, not half the band. It is a picture at
              a size that works -- 14rem -- and the words take whatever is
              left, so the balance holds at 780px and at 320px alike. */}
          <div className="grid shrink-0 items-center gap-6 @2xl/ats-panel:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <AtsDonut
              score={match.score}
              matched={match.matched.length}
              missing={match.missing.length}
              verdict={verdictFor(match.score)}
              legend={false}
            />

            <div className="flex flex-col gap-3">
              <AtsVerdict score={match.score} />
              <AtsLegend
                matched={match.matched.length}
                missing={match.missing.length}
                verdict={verdictFor(match.score)}
                className="border-t border-border-subtle pt-3"
              />
              {comparedCv && (
                // WITH THE VERDICT, because it qualifies it: a score with no
                // named CV beside it invites the reader to assume it scored
                // the one they are thinking of.
                <p className="border-t border-border-subtle pt-3 text-body-s text-text-muted">
                  scored against{' '}
                  <span className="text-text-secondary">{describeLink(comparedCv)}</span>
                </p>
              )}
            </div>
          </div>

          {/* THE INVENTORY. `min-h-0 flex-1` so it takes whatever the band
              left and no more -- which is what lets the panel sit in a fixed
              frame with nothing scrolling around it.

              `overflow-y-auto` is for the EXPANDED state only. Both lists fold
              at `termLimit`, so the ordinary view fits and shows no scrollbar
              at all; pressing `show N more` scrolls this region rather than
              growing the column it sits in. A contained list that scrolls is a
              listbox; a column that scrolls is the thing Gabe asked to remove.

              MATCHED FIRST. The revision asked for these "for positive
              reinforcement", and a list of failures above a list of wins
              reverses the point of showing them at all. */}
          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto border-t border-border-subtle pt-5 @2xl/ats-panel:grid-cols-2">
            <AtsTermChips
              label="matched"
              tone="matched"
              terms={match.matched}
              limit={termLimit}
              emptyText="none of the posting’s terms appear in this CV yet."
            />
            <AtsTermChips
              label="missing"
              tone="missing"
              terms={match.missing}
              limit={termLimit}
              emptyText="none — every term in the posting shows up in the CV."
            />
          </div>
        </>
      )}
    </section>
  )
}
