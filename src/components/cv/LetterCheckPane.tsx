'use client'

import { PanelSection } from '@/components/ui/panel-section'
import type { LetterReview } from './letterSuggestions'

/**
 * The cover letter's rail pane: what a reader will notice, and what to change.
 *
 * IT SITS WHERE THE TAILOR PANE SITS ON A CV, so it is built out of the same
 * furniture on purpose -- a `PanelSection` with the rule suppressed because it
 * is first in the rail, a headline figure with the word count opposite it, and
 * findings as bordered rows beneath. `documentTabs` records why a cover letter
 * does not get the tailor pane at all; `letterSuggestions` records every check
 * and the threshold it turns on.
 *
 * THERE IS NO RUN BUTTON, AND THAT IS THE POINT OF COMPUTING IT LOCALLY. The
 * grammar pane has one because it spends a network round trip on LanguageTool
 * and cannot honestly show a number it has not fetched. Nothing here leaves
 * the browser, so the findings simply follow the document as it is typed --
 * which is also why the empty state says "as you write" rather than "not
 * checked yet". A button whose only job is to recompute a pure function of
 * text already on screen is a click charged for nothing.
 *
 * THE HEADLINE IS A COUNT, NOT A SCORE, and the distinction is one Gabe has
 * already made once: the ATS ring shipped as a bare percentage and was sent
 * back because a number on its own gives you nothing to do. A count is the
 * length of the list directly underneath it -- it points at the work rather
 * than standing in for it, and every row of that list names a change.
 *
 * THE FINDINGS SECTION IS ABSENT WHEN THERE ARE NONE rather than rendering a
 * heading over a "nothing found" line. An empty panel with a title is a
 * section claiming to hold something; the clean case is already stated in the
 * block above, and saying it twice in two type sizes reads as two different
 * facts.
 */

export function LetterCheckPane({ review }: { review: LetterReview }) {
  const { words, findings } = review
  const empty = words === 0

  const summary = empty
    ? 'Nothing written yet. This follows the letter as you write it — there is no check to run and nothing leaves the browser.'
    : findings.length === 0
      ? 'Nothing flagged. This reads like a letter written for one employer rather than one sent to all of them.'
      : 'Each row says what a reader will notice, and what to change about it.'

  return (
    // The same minimum height the grammar pane holds, so the rail keeps its
    // shape on an empty document instead of collapsing to two lines.
    <div className="flex min-h-[24rem] flex-col gap-6" data-pane="suggestions">
      <PanelSection title="letter check" icon="Mail" className="border-t-0 pt-0">
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
                        <span className="text-display-m tabular-nums text-text-primary">
              {empty ? '—' : findings.length}
            </span>
            <span className="text-body-s text-text-muted">
              {empty ? 'nothing to read yet' : `${words} words`}
            </span>
          </div>
          <p className="text-body-s text-text-muted">{summary}</p>
        </div>
      </PanelSection>

      {findings.length > 0 && (
        <PanelSection title="what to change" icon="AlertCircle">
          <ul className="flex flex-col gap-2">
            {findings.map((finding) => (
              <li
                key={finding.id}
                data-finding="letter"
                className="flex flex-col gap-2 rounded-[4px] border border-border-subtle bg-bg-canvas p-3"
              >
                <span className="text-label-caps text-text-muted">{finding.label}</span>
                {/* THE PROBLEM IN THE READING COLOUR AND THE FIX MUTED UNDER
                    IT, which is the order the grammar cards already use: what
                    is wrong, then what to press. Reversing it would put the
                    instruction above the reason for it. */}
                <p className="text-body-m leading-[1.5] text-text-primary">{finding.problem}</p>
                <p className="text-body-s leading-[1.6] text-text-muted">{finding.fix}</p>
              </li>
            ))}
          </ul>
        </PanelSection>
      )}
    </div>
  )
}
