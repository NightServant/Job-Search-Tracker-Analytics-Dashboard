'use client'

import * as React from 'react'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AnalyticsIcon, CheckIcon, ChevronLeftIcon, MenuIcon } from '@/components/icons'
import { buttonVariants } from '@/components/ui/button-variants'
import { ICON_MOTION_GROUP, iconMotion } from '@/components/icons/motion'
import { useDocumentFocus } from '@/components/shell/documentFocus'
import { useBelowDesktop } from '@/hooks/useBelowDesktop'
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

  // BELOW `lg` THIS IS A DIFFERENT EDITOR SHAPE, modelled on Word for
  // Android (Gabe, 2026-09-06): a centred document name, a slim command row,
  // a full-bleed canvas, and the formatting controls pinned to the bottom
  // where a thumb reaches them.
  //
  // CHOSEN IN JS, NOT WITH `lg:` CLASSES, and that is the important part. Both
  // chromes need `actions`, `tools` and the two rails, and those are
  // interactive controls -- rendering both trees would put two of every button
  // in the accessibility tree and two of every match in a test's `getByRole`.
  // One tree. See useBelowDesktop for why it defaults to desktop.
  const compact = useBelowDesktop()
  const [sheet, setSheet] = React.useState<null | 'actions' | 'tailoring'>(null)

  if (compact) {
    return (
      // `fixed inset-0`, so the editor really is the whole viewport rather
      // than a tall page inside the shell's gutters. AppShell has already
      // dropped the sidebar, the bottom nav AND the top bar in response to
      // `useDocumentFocus()`, so there is nothing underneath this to escape.
      <div
        data-document-workspace
        data-compact
        className="fixed inset-0 z-30 flex flex-col bg-bg-canvas"
      >
        {/* THE NAME, CENTRED, exactly as Word does it -- the document names
            the screen, and there is no room at this width for a breadcrumb
            path as well. Still the h1, still typed into in place. */}
        <div className="flex h-11 shrink-0 items-center justify-center border-b border-border-subtle px-12">
          <h1 className="min-w-0 max-w-full">
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="untitled CV"
              aria-label="CV title"
              title={displayTitle}
              className={cn(
                'w-full min-w-0 truncate border-0 bg-transparent p-0 text-center text-body-m text-accent-default',
                'placeholder:text-text-muted focus:outline-none focus-visible:outline-none'
              )}
            />
          </h1>
        </div>

        {/* THE COMMAND ROW. Done on the left as Word puts its tick there;
            state in the middle, where it is read rather than tapped; the two
            things that open a surface on the right. Every remaining action
            lives in the overflow sheet rather than being cut -- see below. */}
        <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border-subtle px-1">
          <Link
            href={documentsHref}
            aria-label="Done"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-text-primary hover:text-accent-default"
          >
            <CheckIcon size={20} aria-hidden />
          </Link>

          <p className="min-w-0 flex-1 truncate px-1 text-caption text-text-muted">
            {savedLabel}
            {dirty && <span className="ml-2 text-status-interviewing-mark">unsaved</span>}
          </p>

          {hasRails && (
            // AI TAILORING GETS ITS OWN CONTROL rather than living three taps
            // deep in the overflow. Gabe's requirement was that tailoring and
            // the CV check stay reachable here; burying the app's one piece of
            // real intelligence under a `...` is how a feature stops existing.
            <button
              type="button"
              aria-label="Tailoring and CV check"
              onClick={() => setSheet('tailoring')}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-text-primary hover:text-accent-default"
            >
              <AnalyticsIcon size={20} aria-hidden />
            </button>
          )}
          <button
            type="button"
            aria-label="More actions"
            onClick={() => setSheet('actions')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-text-primary hover:text-accent-default"
          >
            <MenuIcon size={20} aria-hidden />
          </button>
        </div>

        {/* THE CANVAS, full bleed and the only thing that scrolls. */}
        <div data-document-canvas className="min-h-0 flex-1 overflow-auto">
          {children}
        </div>

        {/* THE FORMATTING BAR, pinned. `pb-safe` for the home indicator, and
            it scrolls sideways rather than wrapping: a bar that grows to two
            rows moves every control the moment you apply a style.

            The controls keep their word labels. Word uses B / I / U glyphs,
            but this design system's icon set has none of them and inventing
            three would break the rule that every glyph is a name rather than a
            picture -- see components/icons. Words at this size are also the
            more legible of the two. */}
        {tools && (
          <div
            data-document-tools
            className="flex shrink-0 items-center gap-2 overflow-x-auto border-t border-border-subtle px-2 py-2 pb-safe"
          >
            {tools}
          </div>
        )}

        <Sheet open={sheet !== null} onOpenChange={(next) => !next && setSheet(null)}>
          {/* `pb-safe` on the CONTENT, not on the last child: the sheet is
              flush to the bottom edge, so on a device with a home indicator
              the final action sat under it -- which is what cut `delete` off.
              A capped height plus its own scroll keeps a long action list
              reachable instead of pushing the top of the sheet off-screen. */}
          <SheetContent side="bottom" className="max-h-[80svh] overflow-y-auto pb-safe">
            {sheet === 'tailoring' ? (
              <>
                <SheetHeader>
                  <SheetTitle>tailoring</SheetTitle>
                </SheetHeader>
                {/* TWO TABS, NOT ONE SCROLL. The rails answer different
                    questions -- what you are tailoring TO, and how well it
                    currently matches -- and desktop puts them on opposite
                    sides of the page for that reason. Stacked in one sheet
                    they would put the requirement and the score a scroll
                    apart, which is the thing the two-rail layout exists to
                    avoid. */}
                <Tabs defaultValue="target" className="px-4 pb-4">
                  {/* FULL WIDTH, TWO EQUAL HALVES. The list defaults to
                      `w-fit`, which on a sheet this wide left two small tabs
                      floating at the left edge with a field of empty bar
                      beside them. Two destinations of equal standing read as a
                      segmented control, and a thumb gets half the sheet as a
                      target rather than a word. */}
                  {/* NOT `variant="line"`. It was tried and it cannot carry a
                      fill: the line variant sets
                      `group-data-[variant=line]/tabs-list:data-active:bg-transparent`,
                      which is a more specific selector than anything passed in
                      through className, so the active tab measured as a
                      transparent background with near-white text -- invisible.
                      The default variant's `data-active:bg-*` IS a plain
                      variant, so tailwind-merge resolves it against the class
                      below and the accent wins. */}
                  <TabsList className="h-auto w-full bg-bg-inset p-1">
                    {[
                      ['target', 'the posting'],
                      ['analysis', 'the check'],
                    ].map(([value, label]) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className={cn(
                          'h-auto flex-1 py-2 text-body-s',
                          // THE ACTIVE TAB WEARS THE ACCENT AS A FIELD, not as
                          // text. `accent-surface` / `accent-on-surface` is the
                          // pair this app already uses wherever a band of
                          // accent is wanted -- the calendar's weekday row, the
                          // applications table header -- because
                          // `accent-default` is picked for text contrast and a
                          // full-width bar of it is the over-bright header Gabe
                          // rejected on the calendar.
                          'data-active:bg-accent-surface data-active:text-accent-on-surface data-active:shadow-none',
                          'dark:data-active:bg-accent-surface dark:data-active:text-accent-on-surface dark:data-active:border-transparent',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default'
                        )}
                      >
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value="target" className="pt-4">
                    {leftRail}
                  </TabsContent>
                  <TabsContent value="analysis" className="pt-4">
                    {rightRail}
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <>
                <SheetHeader>
                  <SheetTitle>{displayTitle}</SheetTitle>
                </SheetHeader>
                {/* EVERY DESKTOP ACTION, none dropped. Save, export, reset,
                    versions and delete all arrive as the caller passed them;
                    this sheet only decides where they sit. Destructive stays
                    separated by a rule, as it is on desktop. */}
                {/* COLUMNS AND ROWS, NOT ONE TALL COLUMN (Gabe, 2026-09-06).
                    Six full-width actions stacked came to roughly 400px of
                    sheet over a document the reader was in the middle of --
                    the menu was bigger than the thing it belonged to. Two per
                    row halves that at no cost: none of these labels needs a
                    full phone width, and the pairs read as what they are
                    (`export .docx` beside `export PDF`).

                    Centred inside each cell, per Gabe's earlier note. Sizing
                    happens HERE rather than in the caller, so the desktop
                    action bar -- the same nodes, in a row, at natural width --
                    is untouched. */}
                <div
                  className={cn(
                    // ONE COLUMN ON A PHONE, TWO FROM `sm` (Gabe,
                    // 2026-09-06). The pairing is a tablet win and a phone
                    // loss: at 390px two columns leave each action about
                    // 175px, which is cramped for `export .docx` and puts two
                    // 44px targets side by side under one thumb. The tablet
                    // has the width to spend and the sheet is what needed
                    // shortening there.
                    // ONE COLUMN ON A PHONE, SIX TRACKS FROM `sm`.
                    //
                    // Six rather than three so the sheet can hold two row
                    // shapes without a second grid: the three exports are two
                    // tracks each (three peers of one weight, one row), and
                    // save and delete are three each (Gabe, 2026-09-06). Three
                    // tracks cannot express halves, which is why this is not
                    // `grid-cols-3` with a span.
                    'grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-6',
                    'sm:[&>button]:col-span-2',
                    '[&_button]:w-full [&_button]:justify-center',
                    // EVERY ACTION IS A TILE. The caller ranks these for a
                    // desktop bar, where a row of mostly-ghost buttons is
                    // correct: they sit on one line, separated by their own
                    // spacing, and only Save is meant to carry weight. Stacked
                    // in a sheet that ranking reads as chaos -- `reset` and
                    // `export .docx` had no boundary at all, so two of the six
                    // items looked like captions rather than controls.
                    //
                    // A hairline and a 44px floor on all of them, and nothing
                    // else: BACKGROUND IS DELIBERATELY NOT SET HERE, because
                    // this arbitrary-variant selector outranks a utility class
                    // and would repaint Save's accent fill and flatten the
                    // exact ranking worth keeping.
                    '[&_button]:min-h-11 [&_button]:rounded-md [&_button]:border [&_button]:border-border-subtle',
                    // SAVE TAKES HALF THE ROW, and delete the other half. The
                    // caller ranks save last, so among the grid's direct
                    // <button> children it is the final one -- delete is
                    // nested in its own div and is not one of them.
                    'sm:[&>button:last-of-type]:col-span-3',
                    // Anything a caller passes that is not a <button> still
                    // has to fill its cell rather than keep its own width.
                    '[&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:justify-center'
                  )}
                >
                  {actions}
                  {destructiveActions && (
                    <>
                      {/* Full-width, and after a rule: a destructive action
                          does not share a row with a save. */}
                      {/* NO SEPARATOR FROM `sm`, and that is a real trade.
                          Desktop keeps its vertical rule because a destructive
                          action does not belong beside a save -- but Gabe
                          asked for these two to share a row here, and a rule
                          between two cells of the same row would have to break
                          the row to draw. What still tells them apart is the
                          ranking the caller already gives them: save is the
                          only filled control in the sheet, delete is a ghost
                          with a trash glyph. The phone keeps the rule, because
                          there the two are stacked and it costs nothing. */}
                      <Separator className="my-1 sm:hidden" />
                      <div className="sm:col-span-3">{destructiveActions}</div>
                    </>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    )
  }

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
      {/* A BACK BUTTON, NOT A BREADCRUMB (Gabe, Worktrack Revisions item 7).
          The trail read `documents / word / <name>` and its middle crumb was a
          lie: `word` and `latex` are not places, and both crumbs pointed at
          the same `/documents` page -- so the path claimed a hierarchy the app
          does not have and offered two links to one destination.

          What a person wants from the top-left of a full-screen editor is the
          way out, said once and plainly. `kindLabel` survives as the label
          beside the title, where it is a FACT about this document rather than
          a step in a path nobody walked. */}
      <div className="flex items-center gap-3">
        <Link
          href={documentsHref}
          className={cn(
            ICON_MOTION_GROUP,
            buttonVariants({ variant: 'ghost', size: 's' }),
            '-ml-2'
          )}
        >
          <ChevronLeftIcon size={16} aria-hidden className={iconMotion('back')} />
          back to documents
        </Link>
        <span className="text-label-caps uppercase text-text-muted">{kindLabel}</span>
      </div>

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
