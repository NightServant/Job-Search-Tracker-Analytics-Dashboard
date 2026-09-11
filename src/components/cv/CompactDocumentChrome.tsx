'use client'

import * as React from 'react'
import Link from 'next/link'
import { AnalyticsIcon, CheckIcon, MenuIcon } from '@/components/icons'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { DocumentWorkspaceProps } from './DocumentWorkspace'

/**
 * The editor below `lg`, modelled on Word for Android (Gabe, 2026-09-06):
 * a centred document name, a slim command row, a full-bleed canvas, and the
 * formatting controls pinned to the bottom where a thumb reaches them.
 *
 * A SEPARATE COMPONENT SINCE 2026-09-11, when DocumentWorkspace was 533 lines.
 * The seam is the one the file already had: it was two complete chromes with
 * `if (compact) return` between them, ~250 lines each, sharing only the props
 * and the decision. Nothing here is referenced by the desktop tree and nothing
 * there is referenced by this one -- including `sheet`, the bottom-sheet
 * state, which exists only at this width and now lives only in this file.
 *
 * THE CHOICE STAYS IN JS RATHER THAN `lg:` CLASSES, which is why these are two
 * components and not one with responsive utilities. Both chromes need
 * `actions`, `tools` and the rails, and those are interactive controls;
 * rendering both trees would put two of every button in the accessibility tree
 * and two of every match in a test's `getByRole`. One tree. See
 * `DocumentWorkspace` for the switch and `useBelowDesktop` for why it defaults
 * to desktop.
 */
export function CompactDocumentChrome({
  // `kindLabel` and `footnote` are deliberately not destructured: this chrome
  // shows no breadcrumb and no footnote. They stay on the shared props type
  // because the desktop chrome does use them.
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
}: DocumentWorkspaceProps) {
  const [sheet, setSheet] = React.useState<null | 'actions' | 'tailoring'>(null)
  const displayTitle = title.trim() || 'untitled CV'
  const hasRails = !!leftRail || !!rightRail

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
