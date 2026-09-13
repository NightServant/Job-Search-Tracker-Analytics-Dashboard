'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckIcon, CloseIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { VERDICT_COPY, verdictFor } from '@/components/ui/ats-verdict-copy'

/**
 * The ATS verdict and the two term inventories, in one place.
 *
 * BOTH SURFACES DRAW THE SAME SCORE AND THEY USED TO DRAW IT DIFFERENTLY. The
 * application record had a verdict in words and chips with a working fold;
 * the CV editor's rail had a bare ring over comma-separated runs of text. Gabe
 * asked for the rail to be "enhanced -- use the application overview version
 * as a reference", and the honest way to do that is one implementation rather
 * than a second copy that drifts the first time a threshold moves.
 *
 * WHAT LIVES HERE IS THE VOCABULARY, not the layout: the verdict line and the
 * chip fold, over the thresholds and wording in `ats-verdict-copy`. Where the
 * ring sits relative to them is still each surface's own decision -- the rail
 * is a 320px column and the record is a third of a 1400px dialog.
 */

/** The score in words: a number means nothing without the scale beside it. */
export function AtsVerdict({ score, className }: { score: number; className?: string }) {
  const copy = VERDICT_COPY[verdictFor(score)]
  return (
    <div className={cn('flex flex-col gap-1', className)} data-ats-verdict>
      <p className={cn('text-heading-s', copy.className)}>{copy.label}</p>
      <p className="text-body-s text-text-muted">{copy.detail}</p>
    </div>
  )
}

/**
 * A fold that does not lie about its length: the count is in the heading and
 * the button says exactly how many more there are.
 */
export function AtsTermChips({
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
      {/* A `div`, NOT THE `p` THIS HEADING WAS. Every glyph in this app renders
          a `motion` DIV, and a div inside a paragraph is invalid HTML the
          browser fixes by closing the `<p>` early -- which React then reports
          as a hydration error and which silently reparents the label and the
          count out of their own heading. It never fired before because the only
          surface drawing these chips was the record dialog, and no test ever
          rendered it with a match that had terms in it. */}
      <div className="flex items-center gap-1.5 text-label-caps uppercase text-text-secondary">
        <Glyph
          size={14}
          aria-hidden
          className={cn('shrink-0', tone === 'matched' ? 'text-verdict-pass' : 'text-text-muted')}
        />
        {label}
        {terms.length > 0 && <span className="tabular text-text-muted">({terms.length})</span>}
      </div>
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
                  tone === 'matched' ? 'border-verdict-pass/40 text-text-primary' : 'text-text-muted'
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
