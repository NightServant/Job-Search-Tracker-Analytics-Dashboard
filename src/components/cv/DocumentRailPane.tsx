'use client'

import * as React from 'react'
import { PanelSection } from '@/components/ui/panel-section'
import type { Job } from '@/types'
import { ApplicationPicker } from './ApplicationPicker'
import { GrammarCheckPane, SpellCheckPane } from './ProofreadPanes'
import { TailoringAnalysisRail, type CvTailoringState } from './CvTailoring'
import type { DocumentTabId } from './documentTabs'
import type { ProofreadState } from './useProofread'
import type { TailoringSuggestion } from '@/services/integrations/tailoring'

/**
 * The right rail: whichever pane the left rail has selected.
 *
 * THE WHOLE POINT OF THE PAIR is that this is one region with an id the tabs
 * point at, rather than four panels stacked down a column. `role="tabpanel"`
 * and `aria-labelledby` are what tell a screen reader that the thing on the
 * left drives the thing on the right -- the relationship a sighted user reads
 * out of the layout for free.
 *
 * THE PICKER LIVES HERE, ONCE, above the two panes that need it, rather than
 * inside each of them. ATS match and AI tailoring both score this CV against
 * one application; two copies of the control would be two places to change the
 * answer and a question about which one wins. The proofreading panes do not
 * show it at all, because grammar does not depend on where the CV is going.
 */

export interface DocumentRailPaneProps {
  active: DocumentTabId
  id?: string
  jobs: Job[]
  linkedJobIds?: readonly string[]
  proofread: ProofreadState
  tailoring: CvTailoringState
  onApplySuggestion?: (suggestion: TailoringSuggestion) => void
}

export function DocumentRailPane({
  active,
  id = 'document-rail',
  jobs,
  linkedJobIds = [],
  proofread,
  tailoring,
  onApplySuggestion,
}: DocumentRailPaneProps) {
  const needsApplication = active === 'ats' || active === 'tailoring'

  return (
    <div
      id={`${id}-pane`}
      role="tabpanel"
      aria-labelledby={`${id}-pane-tab-${active}`}
      tabIndex={0}
      className="flex flex-col gap-6 focus-visible:outline-none"
      data-document-pane={active}
    >
      {needsApplication && (
        <PanelSection title="tailor to" icon="Briefcase" className="border-t-0 pt-0">
          <div className="flex flex-col gap-3">
            <ApplicationPicker
              jobs={jobs}
              linkedJobIds={linkedJobIds}
              value={tailoring.jobId}
              onChange={tailoring.setJobId}
            />
            {tailoring.selectedJob && !tailoring.selectedJob.description && (
              // Not an error and not a dead end: the description lives on the
              // application, and adding it there is what makes this rail, the
              // ATS panel and the record view all work at once.
              <p className="text-body-s text-text-muted">
                that application has no job description saved, so there is nothing to score
                against. add one on the application.
              </p>
            )}
          </div>
        </PanelSection>
      )}

      {active === 'grammar' && <GrammarCheckPane state={proofread} />}
      {active === 'spelling' && <SpellCheckPane state={proofread} />}

      {/* ATS and tailoring share one analysis rail today: the score and the
          rewrites come from the same pass over the same posting. They are two
          TABS because they answer different questions -- "will a screener read
          this" and "what should it say instead" -- and the pane emphasises the
          half the tab asked for. */}
      {needsApplication && (
        <TailoringAnalysisRail
          state={tailoring}
          onApply={onApplySuggestion}
          emphasis={active === 'ats' ? 'match' : 'rewrites'}
        />
      )}
    </div>
  )
}
