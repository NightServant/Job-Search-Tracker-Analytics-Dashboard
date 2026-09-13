'use client'

import * as React from 'react'
import { GrammarCheckPane } from './ProofreadPanes'
import { TailoringAnalysisRail, type CvTailoringState } from './CvTailoring'
import type { DocumentTabId } from './documentTabs'
import type { ProofreadState } from './useProofread'
import type { ThesaurusState } from './useThesaurus'

/**
 * The right rail: whichever pane the left rail has selected.
 *
 * THE WHOLE POINT OF THE PAIR is that this is one region with an id the tabs
 * point at, rather than four panels stacked down a column. `role="tabpanel"`
 * and `aria-labelledby` are what tell a screen reader that the thing on the
 * left drives the thing on the right -- the relationship a sighted user reads
 * out of the layout for free.
 *
 * THE PICKER USED TO BE ASSEMBLED HERE, in a "tailor to" PanelSection of its
 * own above the analysis. That made the tailoring pane two sections built in
 * two files, and it made this component the only place that knew which list of
 * applications the picker should show -- a second list beside the one
 * `useCvTailoring` was resolving the selection out of. Both moved into
 * `TailoringAnalysisRail`, which is why the tailor branch below is one line:
 * the pane switch should choose a pane, not lay one out.
 */

export interface DocumentRailPaneProps {
  active: DocumentTabId
  id?: string
  proofread: ProofreadState
  thesaurus?: ThesaurusState
  tailoring: CvTailoringState
}

export function DocumentRailPane({
  active,
  id = 'document-rail',
  proofread,
  thesaurus,
  tailoring,
}: DocumentRailPaneProps) {
  return (
    <div
      id={`${id}-pane`}
      role="tabpanel"
      aria-labelledby={`${id}-pane-tab-${active}`}
      tabIndex={0}
      className="flex flex-col gap-6 focus-visible:outline-none"
      data-document-pane={active}
    >
      {active === 'grammar' && <GrammarCheckPane state={proofread} thesaurus={thesaurus} />}

      {active === 'tailor' && (
        <TailoringAnalysisRail state={tailoring} />
      )}
    </div>
  )
}
