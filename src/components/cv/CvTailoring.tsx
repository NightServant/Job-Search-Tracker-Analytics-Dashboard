'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { PanelSection } from '@/components/ui/panel-section'
import { AtsCheck, type AtsResult } from '@/components/ui/ats-check'
import { CssSpinner } from '@/components/ui/css-spinner'
import { iconMotion } from '@/components/icons/motion'
import { ArrowRightIcon } from '@/components/icons'
import { authedFetch } from '@/lib/authedFetch'
import { matchKeywords, type KeywordMatch } from '@/services/atsMatch'
import type { TailoringResult, TailoringSuggestion } from '@/services/integrations/tailoring'
import type { Job } from '@/types'

/**
 * AI CV tailoring, as the two rails either side of the document (Gabe,
 * 2026-09-04).
 *
 * WHY TWO RAILS AND NOT ONE PANEL. They answer different questions at
 * different moments. The left is what you are tailoring TO -- a posting,
 * picked from the applications you are already tracking or pasted in. The
 * right is how well the document currently matches it and what to do about
 * that. On one side you would be scrolling between a requirement and the
 * score for the same document; either side of the page, both are in view
 * while you edit between them.
 *
 * THE SCORE IS NOT COMPUTED BY THE MODEL. `matchKeywords` is deterministic,
 * in-repo and tested, and a number the user is going to act on should not come
 * back different every time they ask for it. The model is used only for the
 * part that genuinely needs language -- rewriting a line so it says the thing
 * the posting asks for -- and every suggestion arrives with a rationale and a
 * before/after so it can be judged rather than trusted.
 *
 * NOTHING IS APPLIED AUTOMATICALLY. Each suggestion is a proposal with an
 * explicit `apply`. A tool that silently rewrote someone's employment history
 * to match a posting would be producing a claim they have to defend in an
 * interview, and the prompt forbids invention for the same reason.
 */

/** Same thresholds as the application record's ATS panel, so one score reads one way. */
function verdictFor(score: number): AtsResult {
  if (score >= 80) return 'pass'
  if (score >= 50) return 'review'
  return 'fail'
}

export interface CvTailoringState {
  jobId: string
  setJobId: (id: string) => void
  /**
   * The posting being tailored against -- always the selected application's
   * stored description.
   *
   * THE PASTE BOX IS GONE (Gabe, 2026-09-05). It was a second place a posting
   * could live, and a second place is a fork: paste one thing, select another,
   * and the rail had to grow a rule about which wins and a sentence explaining
   * it. An application already has a `description` field, and it is the field
   * the ATS panel, the record view and the autofill all read. One posting, one
   * home. If it is missing, the fix is to put it on the application, which is
   * where every other part of the app will then find it too.
   */
  description: string
  match: KeywordMatch | null
  running: boolean
  result: TailoringResult | null
  run: () => Promise<void>
  selectedJob: Job | null
}

/**
 * Owns the tailoring state for one document.
 *
 * A hook rather than state inside either rail, because both rails read the
 * same posting and the same score -- and two copies of that is how a left
 * rail ends up describing a different job than the right one is scoring.
 */
export function useCvTailoring(options: {
  cvText: string
  jobs: Job[]
  fetchImpl?: typeof fetch
}): CvTailoringState {
  const [jobId, setJobId] = React.useState('')
  const [running, setRunning] = React.useState(false)
  const [result, setResult] = React.useState<TailoringResult | null>(null)

  const selectedJob = React.useMemo(
    () => options.jobs.find((job) => job.id === jobId) ?? null,
    [options.jobs, jobId]
  )

  const description = selectedJob?.description?.trim() ?? ''

  const match = React.useMemo(
    () => (description && options.cvText.trim() ? matchKeywords(options.cvText, description) : null),
    [description, options.cvText]
  )

  const run = React.useCallback(async () => {
    if (!description.trim() || !options.cvText.trim()) return
    setRunning(true)
    setResult(null)
    // authedFetch, not fetch: the route is authenticated because tailoring
    // spends a metered LLM allowance.
    const doFetch = options.fetchImpl ?? authedFetch
    try {
      // Through the app's own route, never straight at the provider: the key
      // lives on the server and must not reach the browser.
      const response = await doFetch('/api/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvText: options.cvText,
          jobDescription: description,
          missingKeywords: match?.missing ?? [],
          role: selectedJob?.role,
          company: selectedJob?.company,
        }),
      })
      setResult((await response.json()) as TailoringResult)
    } catch {
      setResult({ ok: false, reason: 'network', message: 'Could not reach the tailoring service.' })
    } finally {
      setRunning(false)
    }
  }, [description, options.cvText, options.fetchImpl, match, selectedJob])

  return {
    jobId,
    setJobId,
    description,
    match,
    running,
    result,
    run,
    selectedJob,
  }
}

/** What this CV is being tailored to. */
export function TailoringTargetRail({ state, jobs }: { state: CvTailoringState; jobs: Job[] }) {
  return (
    <div className="flex flex-col gap-6" data-tailoring-target>
      <PanelSection title="tailor to" icon="Briefcase" className="border-t-0 pt-0">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-label-caps uppercase text-text-secondary">application</span>
            <Select
              aria-label="application"
              value={state.jobId}
              onValueChange={state.setJobId}
              items={[
                { value: '', label: 'none selected' },
                ...jobs.map((job) => ({
                  value: job.id,
                  label: `${job.role} — ${job.company}`,
                })),
              ]}
            />
          </label>

          {state.selectedJob && !state.selectedJob.description && (
            // Not an error, and not a dead end: the description lives on the
            // application, and putting it there is what makes the ATS panel,
            // the record view and this rail all work at once.
            <p className="text-body-s text-text-muted">
              that application has no job description saved, so there is nothing to score
              against. add one on the application.
            </p>
          )}
        </div>
      </PanelSection>
    </div>
  )
}

/** One proposed rewrite: before, after, why, and a way to take it. */
function Suggestion({
  suggestion,
  onApply,
}: {
  suggestion: TailoringSuggestion
  onApply?: (suggestion: TailoringSuggestion) => void
}) {
  return (
    <li className="flex flex-col gap-2 border-b border-border-subtle py-4 last:border-b-0">
      <p className="text-label-caps uppercase text-text-secondary">{suggestion.section}</p>
      <p className="text-body-s text-text-muted line-through decoration-text-muted/40">
        {suggestion.before}
      </p>
      <p className="text-body-m text-text-primary">{suggestion.after}</p>
      <p className="text-body-s text-text-muted">{suggestion.rationale}</p>
      {onApply && (
        <Button variant="secondary" size="s" className="w-fit" onClick={() => onApply(suggestion)}>
          apply
          <ArrowRightIcon size={14} aria-hidden className={iconMotion('forward')} />
        </Button>
      )}
    </li>
  )
}

/** RIGHT RAIL: how well it matches, and what to change. */
export function TailoringAnalysisRail({
  state,
  onApply,
}: {
  state: CvTailoringState
  onApply?: (suggestion: TailoringSuggestion) => void
}) {
  const { match, result, running } = state

  return (
    <div className="flex flex-col gap-6" data-tailoring-analysis>
      <PanelSection title="ATS match" icon="ShieldCheck" className="border-t-0 pt-0">
        {match === null ? (
          <p className="text-body-s text-text-muted">
            pick an application or paste a posting to score this CV against it.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <AtsCheck result={verdictFor(match.score)} label={`${match.score}%`} />
            <div className="flex flex-col gap-1">
              <p className="text-label-caps uppercase text-text-secondary">missing keywords</p>
              {match.missing.length === 0 ? (
                <p className="text-body-s text-text-muted">
                  none — every term in the posting shows up in this CV.
                </p>
              ) : (
                <p className="text-body-s text-text-primary">{match.missing.join(', ')}</p>
              )}
            </div>
          </div>
        )}
      </PanelSection>

      <PanelSection title="AI tailoring" icon="CircleCheck">
        <div className="flex flex-col gap-4">
          <Button
            size="s"
            className="w-fit"
            onClick={() => void state.run()}
            disabled={running || !state.description.trim()}
          >
            {running && <CssSpinner size={14} />}
            {running ? 'tailoring' : 'tailor this CV'}
          </Button>

          {!state.description.trim() && (
            <p className="text-body-s text-text-muted">
              needs a posting to tailor against.
            </p>
          )}

          {result && !result.ok && (
            <p
              role="alert"
              className={
                result.reason === 'unconfigured'
                  ? 'text-body-s text-text-muted'
                  : 'text-body-s text-status-rejected-mark'
              }
            >
              {result.message}
            </p>
          )}

          {result?.ok && result.summary && (
            <div className="flex flex-col gap-1">
              <p className="text-label-caps uppercase text-text-secondary">suggested summary</p>
              <p className="text-body-m text-text-primary">{result.summary}</p>
            </div>
          )}

          {result?.ok && result.suggestions.length > 0 && (
            <ul className="flex flex-col">
              {result.suggestions.map((suggestion, i) => (
                <Suggestion key={`${suggestion.section}-${i}`} suggestion={suggestion} onApply={onApply} />
              ))}
            </ul>
          )}

          {result?.ok && result.suggestions.length === 0 && !result.summary && (
            <p className="text-body-s text-text-muted">
              nothing to change — the CV already covers what the posting asks for.
            </p>
          )}
        </div>
      </PanelSection>
    </div>
  )
}
