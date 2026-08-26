import * as React from 'react'
import { cn } from '@/lib/utils'
import { AtsCheck, type AtsResult } from '@/components/ui/ats-check'
import type { KeywordMatch } from '@/services/atsMatch'

/**
 * Thresholds for turning a percentage into the three-way verdict `AtsCheck`
 * renders. Arbitrary but documented: 80 and 50 split the range into thirds
 * loosely centred on "most requirements met" and "roughly half", and nothing
 * downstream depends on the exact cut, so this is an implementer's call
 * rather than a spec'd value.
 */
function verdictFor(score: number): AtsResult {
  if (score >= 80) return 'pass'
  if (score >= 50) return 'review'
  return 'fail'
}

/**
 * How the CV stacks up against the posting -- and, unlike a bare score,
 * which words to add.
 *
 * `match` is `null` rather than a zeroed `KeywordMatch` when there is nothing
 * to compare: no linked CV, or no job description. Rendering a 0% in that
 * case would look like a genuinely bad match instead of an absent one.
 */
export interface AtsPanelProps extends React.HTMLAttributes<HTMLElement> {
  match: KeywordMatch | null
}

export function AtsPanel({ match, className, ...props }: AtsPanelProps) {
  return (
    <section
      aria-label="ATS match"
      className={cn('flex flex-col gap-4 border-t border-border-subtle pt-6', className)}
      {...props}
    >
      <h2 className="text-heading-s text-text-primary">ATS match</h2>
      {match === null ? (
        <p className="text-body-s text-text-muted">
          Link a CV and add a job description to see how closely they match.
        </p>
      ) : (
        <>
          <AtsCheck result={verdictFor(match.score)} label={`${match.score}%`} />
          <div className="flex flex-col gap-1">
            <p className="text-label-caps uppercase text-text-secondary">Missing keywords</p>
            {match.missing.length === 0 ? (
              <p className="text-body-s text-text-muted">
                None -- every term in the posting shows up in the CV.
              </p>
            ) : (
              <p className="text-body-s text-text-primary">{match.missing.join(', ')}</p>
            )}
          </div>
          {match.matched.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-label-caps uppercase text-text-secondary">Matched</p>
              <p className="text-body-s text-text-muted">{match.matched.join(', ')}</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
