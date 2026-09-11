import type { IconName } from '@/components/icons'

/**
 * The four panes of the document editor's rails, as data.
 *
 * THE LEFT RAIL SELECTS AND THE RIGHT RAIL SHOWS, which is the arrangement
 * Word uses and the one Gabe asked for on 2026-09-11. Before this the two
 * rails were a fixed pair -- a "tailor to" picker on the left and the ATS
 * result on the right -- so the editor could only ever be doing one thing, and
 * grammar and spelling had nowhere to live at all.
 *
 * SEPARATED FROM THE COMPONENTS ON PURPOSE. The rail, the pane switch and the
 * mobile fallback all have to agree on what the tabs are and what order they
 * come in; three copies of that list is three chances to disagree. Keeping it
 * as data also means the ordering and the labels are unit-testable without
 * rendering anything, and it satisfies `react-refresh/only-export-components`
 * the same way `button-variants.ts` and `progress-tones.ts` already do.
 *
 * ORDER IS PROOFREAD-THEN-TARGET, and it is not alphabetical by accident.
 * Grammar and spelling are about the document as written and can be acted on
 * with nothing else set up; tailoring is about a specific application and
 * needs one chosen first. Putting the two that always work above the one that
 * needs configuration means a new CV opens on something useful.
 *
 * SPELL CHECK WAS A THIRD TAB AND IS GONE (Gabe, 2026-09-11). On a real
 * 949-word CV it produced 26 findings and roughly two thirds were proper
 * nouns LanguageTool has no dictionary for -- React, Next.js, shadcn/UI,
 * Laravel, Tarlac. A tab that is wrong two times in three is a list to
 * dismiss, not a check. `services/grammar` drops those findings at the
 * boundary, so nothing downstream has to know the tab ever existed.
 *
 * ATS MATCH AND AI TAILORING WERE TWO TABS UNTIL 2026-09-11 AND THAT WAS
 * WRONG. Gabe: "combine AI tailoring and ATS scoring properly this time."
 * They are one request against one posting -- the score says what a screener
 * will miss, the rewrites are what to do about it -- so splitting them made
 * you pick an application twice, read half an answer, and switch tabs to act
 * on it. The score and the fix now sit in one pane, in that order, because
 * that is the order you use them in.
 */

export type DocumentTabId = 'grammar' | 'tailor'

export interface DocumentTab {
  id: DocumentTabId
  label: string
  icon: IconName
  /** Shown under the label in the rail; says what the pane is for. */
  hint: string
  /**
   * True when the pane is useless without an application selected. The rail
   * marks these so the reason a pane is empty is visible before it is opened,
   * rather than after.
   */
  needsApplication: boolean
}

export const DOCUMENT_TABS: readonly DocumentTab[] = [
  {
    id: 'grammar',
    label: 'grammar check',
    icon: 'Pencil',
    hint: 'agreement, tense, phrasing and style',
    needsApplication: false,
  },
  {
    id: 'tailor',
    label: 'tailor to a job',
    icon: 'ShieldCheck',
    hint: 'score this CV, then rewrite it',
    needsApplication: true,
  },
] as const

export const DEFAULT_DOCUMENT_TAB: DocumentTabId = 'grammar'

export function tabById(id: DocumentTabId): DocumentTab {
  const tab = DOCUMENT_TABS.find((candidate) => candidate.id === id)
  // Unreachable through the type, but a bad id from persisted state would
  // otherwise render a blank rail with no clue why.
  if (!tab) throw new Error(`Unknown document tab: ${id}`)
  return tab
}

/**
 * Coerce anything into a tab id.
 *
 * The selected tab is worth remembering between visits, and stored values
 * outlive the code that wrote them: a tab that is renamed or removed would
 * otherwise leave somebody's editor permanently blank.
 */
export function asDocumentTab(raw: unknown): DocumentTabId {
  return DOCUMENT_TABS.some((tab) => tab.id === raw)
    ? (raw as DocumentTabId)
    : DEFAULT_DOCUMENT_TAB
}
