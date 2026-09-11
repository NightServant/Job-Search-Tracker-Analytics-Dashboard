'use client'

import { useDocumentFocus } from '@/components/shell/documentFocus'
import { useBelowDesktop } from '@/hooks/useBelowDesktop'
import { CompactDocumentChrome } from './CompactDocumentChrome'
import { DesktopDocumentChrome } from './DesktopDocumentChrome'

/**
 * The chrome every CV editor sits in: breadcrumb, name, save state, actions,
 * a docked tool strip, and the page itself.
 *
 * ONE COMPONENT FOR BOTH EDITORS. Word and LaTeX had separate headers that had
 * already drifted, and a third surface is coming (the docx-editor.dev
 * component, and FormaTeX's compiled preview) -- three hand-maintained copies
 * of the same bar is three chances to disagree about where Save lives.
 *
 * WHAT CHANGED IN THE REFORMAT, and why each one, since "make it nicer" is
 * not a spec:
 *
 * 1. THE NAV IS GONE. `useDocumentFocus` hides the sidebar and the bottom nav
 *    while this is mounted (Gabe, 2026-09-04). A CV is a document you work
 *    inside, and the sidebar was spending 240px on destinations nobody wants
 *    mid-edit. The Top Bar stays: it carries the theme toggle and settings,
 *    and a full-screen editor with no chrome at all strands a phone user.
 *
 * 2. THE BREADCRUMB REPLACES THE PAGE TITLE. The header used to read "Word CV"
 *    -- a category, not a name -- while the document's actual name sat below
 *    it in a form field labelled CV TITLE. The name is now the heading, and
 *    the category is one crumb of the path that got you here. That is also
 *    the only way back now that the sidebar is hidden, which is why it is a
 *    breadcrumb rather than a lone back link.
 *
 * 3. THE NAME IS EDITED IN PLACE. Naming a document is not filling in a form,
 *    so it is a heading you type into: same size, same weight, no box until
 *    you focus it. This also kills the "CV TITLE" caps label, which existed
 *    only to explain a field that no longer needs explaining.
 *
 * 4. ACTIONS ARE RANKED. Save is the editor's verb and is primary. Export was
 *    the loudest control on the screen -- filled accent, next to a text
 *    Save -- which told the eye that leaving with a PDF mattered more than
 *    keeping the work. Delete is pushed to its own end of the bar: a
 *    destructive action does not belong beside Save.
 *
 * 5. SAVE STATE MOVED UNDER THE NAME. It was floating to the right of the
 *    title input, attached to nothing.
 *
 * 6. THE TOOL STRIP TOUCHES THE PAGE. It acts on the document, so it is docked
 *    directly above it rather than separated by the title block.
 */
export interface DocumentWorkspaceProps {
  /** Word, LaTeX -- the crumb between `documents` and this file's own name. */
  kindLabel: string
  documentsHref: string
  title: string
  onTitleChange: (title: string) => void
  /** e.g. "saved 7:43 am". Rendered under the name, muted. */
  savedLabel: string
  dirty?: boolean
  /** Save, export, versions, reset. Ranked by the caller; rendered as given. */
  actions: React.ReactNode
  /** Delete, or anything else that destroys. Kept apart from `actions`. */
  destructiveActions?: React.ReactNode
  /** Formatting controls. Docked to the top of the page. */
  tools?: React.ReactNode
  /**
   * The AI tailoring rails, one either side of the page (Gabe, 2026-09-04).
   *
   * TWO RAILS RATHER THAN ONE PANEL because they answer different questions
   * and are read at different moments: the left is what you are tailoring TO
   * (the posting), the right is how well it currently matches and what to do
   * about it. Putting both on one side would make the reader scroll between
   * the requirement and the score for the same document.
   *
   * There is room for them only because the sidebar is hidden -- the two are
   * one decision, not two.
   */
  leftRail?: React.ReactNode
  rightRail?: React.ReactNode
  /** The page: an editor, or a compiled preview. */
  children: React.ReactNode
  /** A compile log or an unconfigured-integration notice, under the page. */
  footnote?: React.ReactNode
}

export function DocumentWorkspace(props: DocumentWorkspaceProps) {
  // Claimed on mount, released on unmount -- so closing the draft, navigating
  // away or unmounting for any other reason all restore the nav without this
  // component having to notice.
  useDocumentFocus()

  // CHOSEN IN JS, NOT WITH `lg:` CLASSES, and that is the important part.
  // Both chromes need `actions`, `tools` and the two rails, and those are
  // interactive controls -- rendering both trees would put two of every button
  // in the accessibility tree and two of every match in a test's `getByRole`.
  // One tree. See useBelowDesktop for why it defaults to desktop.
  //
  // THE TWO TREES MOVED OUT ON 2026-09-11 (533 lines). They were ~250 lines
  // each with `if (compact) return` between them, sharing only these props and
  // this decision -- which is all that is left here.
  const compact = useBelowDesktop()

  return compact ? (
    <CompactDocumentChrome {...props} />
  ) : (
    <DesktopDocumentChrome {...props} />
  )
}
