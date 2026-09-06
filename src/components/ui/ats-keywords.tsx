'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'

/**
 * A keyword list that does not become a wall.
 *
 * WHAT IT REPLACES. Both ATS surfaces rendered `missing.join(', ')` straight
 * out, and a real posting produces sixty-odd terms: "roles, responsibility,
 * provide, first, line, phone, email, chat, manages, service, desk, ..." --
 * eleven lines of comma-separated prose in a 320px rail. Nobody reads that,
 * which means the most actionable thing on the panel was also the least
 * readable, and the words that matter were buried among "first", "line",
 * "500" and "hours".
 *
 * A CAP AND A COUNT, not a scroll box. The first `limit` terms are the ones
 * worth acting on now; the rest are one click away and the count says exactly
 * how many there are, so the list never lies about its own length. A scroll
 * region would hide the count and put a second scrollbar inside a rail that
 * already has one.
 *
 * ORDER IS THE CALLER'S. This does not sort: `atsMatch` yields terms in the
 * order the posting uses them, which is a weak but real signal -- a
 * requirement stated first is usually stated first for a reason. Re-ranking
 * here would be inventing a relevance model and hiding it in a view.
 */
export interface AtsKeywordsProps {
  label: string
  terms: string[]
  /** Shown instead of the list when there are none. */
  emptyText?: string
  /** How many to show before folding. */
  limit?: number
  /** Muted rendering, for the "matched" list which is context rather than work. */
  muted?: boolean
}

export function AtsKeywords({
  label,
  terms,
  emptyText,
  limit = 18,
  muted = false,
}: AtsKeywordsProps) {
  const [expanded, setExpanded] = React.useState(false)
  const overflow = Math.max(0, terms.length - limit)
  const shown = expanded ? terms : terms.slice(0, limit)

  return (
    <div className="flex flex-col gap-1" data-ats-keywords={label}>
      <p className="text-label-caps uppercase text-text-secondary">
        {label}
        {terms.length > 0 && (
          // The COUNT beside the heading, always. It is the fact a reader
          // wants first -- "how much work is this" -- and it stays true
          // whether the list is folded or not.
          <span className="tabular ml-1 text-text-muted">({terms.length})</span>
        )}
      </p>

      {terms.length === 0 ? (
        <p className="text-body-s text-text-muted">{emptyText ?? 'none.'}</p>
      ) : (
        <>
          <p className={muted ? 'text-body-s text-text-muted' : 'text-body-s text-text-primary'}>
            {shown.join(', ')}
            {!expanded && overflow > 0 && '…'}
          </p>
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
