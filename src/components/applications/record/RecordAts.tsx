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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertCircleIcon, CheckIcon, CloseIcon, ShieldCheckIcon } from '@/components/icons'
import { ICON_STATE_MOTION } from '@/components/icons/motion'
import { cn } from '@/lib/utils'
import type { AtsResult } from '@/components/ui/ats-check'
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
 * Thresholds match `AtsPanel`'s, which they replace: 80 and 50, loosely "most
 * requirements met" and "roughly half". Nothing downstream depends on the
 * exact cut.
 */
function verdictFor(score: number): AtsResult {
  if (score >= 80) return 'pass'
  if (score >= 50) return 'review'
  return 'fail'
}

const VERDICT_COPY: Record<AtsResult, { label: string; detail: string; className: string }> = {
  pass: {
    label: 'strong match',
    detail: 'most of what the posting asks for is already in this CV.',
    className: 'text-verdict-pass',
  },
  review: {
    label: 'fair match',
    detail: 'about half the posting’s vocabulary shows up. The missing list is where to start.',
    className: 'text-verdict-review',
  },
  fail: {
    label: 'weak match',
    detail: 'this CV and this posting share little language. Tailor it before sending.',
    className: 'text-verdict-fail',
  },
}

/**
 * A fold that does not lie about its length: the count is in the heading and
 * the button says exactly how many more there are.
 */
function TermChips({
  label,
  terms,
  tone,
  emptyText,
  limit = 24,
}: {
  label: string
  terms: string[]
  tone: 'matched' | 'missing'
  emptyText: string
  limit?: number
}) {
  const [expanded, setExpanded] = React.useState(false)
  const overflow = Math.max(0, terms.length - limit)
  const shown = expanded ? terms : terms.slice(0, limit)
  const Glyph = tone === 'matched' ? CheckIcon : CloseIcon

  return (
    <div className="flex flex-col gap-2" data-ats-terms={tone}>
      <p className="flex items-center gap-1.5 text-label-caps uppercase text-text-secondary">
        <Glyph
          size={14}
          aria-hidden
          className={cn(
            'shrink-0',
            tone === 'matched' ? 'text-verdict-pass' : 'text-text-muted'
          )}
        />
        {label}
        {terms.length > 0 && <span className="tabular text-text-muted">({terms.length})</span>}
      </p>
      {terms.length === 0 ? (
        <p className="text-body-s text-text-muted">{emptyText}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {shown.map((term) => (
              // `outline` -- a hairline-bordered label, never a filled pill.
              // Badge is sanctioned for tags and terms and banned from
              // carrying application status.
              <Badge
                key={term}
                variant="outline"
                className={cn(
                  'rounded-md',
                  tone === 'matched'
                    ? 'border-verdict-pass/40 text-text-primary'
                    : 'text-text-muted'
                )}
              >
                {term}
              </Badge>
            ))}
          </div>
          {overflow > 0 && (
            <Button
              variant="ghost"
              size="s"
              className="self-start px-0"
              aria-expanded={expanded}
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? 'show fewer' : `show ${overflow} more`}
            </Button>
          )}
        </>
      )}
    </div>
  )
}

export interface RecordAtsProps {
  match: KeywordMatch | null
  /** The CVs pinned to this application; the newest is the one that was scored. */
  links?: DocumentLinkSummary[]
  error?: boolean
  className?: string
}

export function RecordAts({ match, links = [], error = false, className }: RecordAtsProps) {
  const comparedCv =
    links.length > 0
      ? [...links].sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0]
      : null

  return (
    <section className={cn('flex flex-col gap-4', className)} aria-label="ATS match" data-record-ats>
      <h3 className="flex items-center gap-2 text-heading-s text-text-primary">
        <ShieldCheckIcon size={16} aria-hidden className="shrink-0 text-text-muted" />
        ATS match
      </h3>

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
          <div className="flex flex-col gap-1">
            <p className={cn('text-heading-s', VERDICT_COPY[verdictFor(match.score)].className)}>
              {VERDICT_COPY[verdictFor(match.score)].label}
            </p>
            <p className="text-body-s text-text-muted">
              {VERDICT_COPY[verdictFor(match.score)].detail}
            </p>
          </div>

          <AtsDonut
            score={match.score}
            matched={match.matched.length}
            missing={match.missing.length}
            verdict={verdictFor(match.score)}
          />

          {comparedCv && (
            <p className="border-t border-border-subtle pt-3 text-body-s text-text-muted">
              scored against{' '}
              <span className="text-text-secondary">{describeLink(comparedCv)}</span>
            </p>
          )}

          {/* MATCHED FIRST. The revision asked for these "for positive
              reinforcement", and a list of failures above a list of wins
              reverses the point of showing them at all. */}
          <TermChips
            label="matched"
            tone="matched"
            terms={match.matched}
            emptyText="none of the posting’s terms appear in this CV yet."
          />
          <TermChips
            label="missing"
            tone="missing"
            terms={match.missing}
            emptyText="none — every term in the posting shows up in the CV."
          />
        </>
      )}
    </section>
  )
}
