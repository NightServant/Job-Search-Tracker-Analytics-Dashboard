'use client'

import * as React from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { useDocumentFocus } from '@/components/shell/documentFocus'
import { cn } from '@/lib/utils'

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

export function DocumentWorkspace({
  kindLabel,
  documentsHref,
  title,
  onTitleChange,
  savedLabel,
  dirty = false,
  actions,
  destructiveActions,
  tools,
  leftRail,
  rightRail,
  children,
  footnote,
}: DocumentWorkspaceProps) {
  // Claimed on mount, released on unmount -- so closing the draft, navigating
  // away or unmounting for any other reason all restore the nav without this
  // component having to notice.
  useDocumentFocus()

  const displayTitle = title.trim() || 'untitled CV'
  const hasRails = !!leftRail || !!rightRail

  return (
    <div
      className={cn(
        'mx-auto flex w-full flex-col gap-6',
        // A letter page is 8.5in (816px). Two rails plus that needs room, so
        // the workspace widens only when it actually has rails -- otherwise a
        // lone document would float in the middle of a 1600px field.
        hasRails ? 'max-w-[1600px]' : 'max-w-[1100px]'
      )}
      data-document-workspace
    >
      <Breadcrumb
        items={[
          { label: 'documents', href: documentsHref },
          { label: kindLabel, href: documentsHref },
          { label: displayTitle },
        ]}
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <div className="flex min-w-0 flex-col gap-1">
          {/*
            A heading you type into. `w-full` with no border until focus, so it
            reads as the document's name and behaves as a field only once you
            are in it -- and it keeps the h1 semantics a screen reader needs to
            announce what this page is.
          */}
          <h1 className="min-w-0">
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="untitled CV"
              aria-label="CV title"
              // `text-ellipsis` on an input is honoured by every current
              // browser WHILE THE INPUT IS NOT FOCUSED, which is exactly the
              // behaviour wanted: a long filename reads as "Elijah Gabe
              // Cervantes y Celestino - CV (A..." at rest, and the moment you
              // click into it you get the whole string back and can scroll
              // through it with the caret. A separate truncated <span> that
              // swaps for an input on focus would do the same thing with a
              // layout shift and a lost click.
              //
              // `title` carries the full name, so what the ellipsis hides is
              // still available on hover.
              title={displayTitle}
              className={cn(
                'w-full min-w-0 truncate border-0 bg-transparent p-0 text-heading-l font-bold text-text-primary',
                'placeholder:text-text-muted',
                'focus:outline-none focus-visible:outline-none',
                // The only chrome it ever grows: a 2px accent rule underneath
                // while focused, which is the same vocabulary the active nav
                // item and the status marker already use.
                'border-b-2 border-transparent focus:border-accent-default'
              )}
            />
          </h1>
          <p className="text-body-s text-text-muted">
            {savedLabel}
            {dirty && <span className="ml-2 text-status-interviewing-mark">unsaved changes</span>}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
          {destructiveActions && (
            <>
              {/* A real gap, not a bigger margin: the separator says these are
                  a different category of action rather than the end of a row. */}
              <Separator orientation="vertical" className="mx-1 h-6" />
              {destructiveActions}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        {tools && (
          <div className="flex flex-wrap items-center gap-2 border-y border-border-subtle py-2">
            {tools}
          </div>
        )}
        {/*
          THREE COLUMNS ONLY WHERE THREE COLUMNS FIT. The rails need ~300px
          each beside an 816px page, so they sit beside it from `xl` and stack
          around it below that -- posting first, then the document, then the
          analysis, which is the order you read them in anyway.

          The page itself is a PRINT PROOF, not app chrome: it keeps its own
          white sheet and letter geometry and deliberately does not follow the
          app's theme, because what is on it has to match what comes out of a
          printer.
        */}
        {/*
          THE GRID FOLLOWS WHICH RAILS EXIST.

          Both rails -> three columns, the document between them: what the Word
          editor wants, where the page is one block and the analysis flanks it.

          Left rail only -> two columns, and the content column is free to
          split itself. That is what the LaTeX editor wants: it puts source
          beside preview inside that column, so the screen reads as three --
          rail, editor, output -- and both panes get real width instead of the
          ~470px they had when the analysis rail was still taking 320 on the
          right.
        */}
        <div
          className={cn(
            'grid gap-6',
            leftRail && rightRail && 'xl:grid-cols-[300px_minmax(0,1fr)_320px] xl:gap-8',
            leftRail && !rightRail && 'xl:grid-cols-[300px_minmax(0,1fr)] xl:gap-8'
          )}
        >
          {leftRail && <aside className="min-w-0 xl:order-1">{leftRail}</aside>}
          <div className="min-w-0 overflow-x-auto bg-bg-inset p-4 md:p-8 xl:order-2">
            {children}
          </div>
          {rightRail && <aside className="min-w-0 xl:order-3">{rightRail}</aside>}
        </div>
      </div>

      {footnote && <div className="text-body-s text-text-muted">{footnote}</div>}
    </div>
  )
}
