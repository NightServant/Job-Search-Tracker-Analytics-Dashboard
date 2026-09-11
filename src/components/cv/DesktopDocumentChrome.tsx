'use client'

import * as React from 'react'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { ChevronLeftIcon } from '@/components/icons'
import { buttonVariants } from '@/components/ui/button-variants'
import { ICON_MOTION_GROUP, iconMotion } from '@/components/icons/motion'
import { cn } from '@/lib/utils'
import type { DocumentWorkspaceProps } from './DocumentWorkspace'

/**
 * The editor at `lg` and above: breadcrumb, name, save state, actions, a
 * docked tool strip, and the page between two rails.
 *
 * THE OTHER HALF of the split described in `CompactDocumentChrome` -- see that
 * file for why this is two components rather than one with `lg:` classes.
 *
 * THREE COLUMNS ONLY WHERE THREE COLUMNS FIT: the rails need ~300px each
 * beside an 816px page, so they sit beside it from `xl` and stack above it
 * below that.
 */
export function DesktopDocumentChrome({
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
  const displayTitle = title.trim() || 'untitled CV'

  return (
    <div
      // FULL BLEED, NOT A CARD IN A PAGE (Gabe, 2026-09-11: "the editor must
      // be displayed fully within the app page"). It used to be centred at
      // max-w-1600 with the app's gutters around it, so a word processor sat
      // inside a reading column -- the one layout Word never has. The shell
      // has already dropped the sidebar and bottom nav via `useDocumentFocus`,
      // so there is nothing left to align to: the editor takes the page.
      className="flex w-full flex-col"
      data-document-workspace
    >
      {/*
        WORD'S TITLE BAR, which is what this replaces (Gabe, 2026-09-11:
        "follow the UI of Microsoft Word desktop, file name at the top of the
        toolbar, migrate CTAs to the toolbar itself").

        Before this there were TWO header rows above the ribbon: a back link
        with a kind label, then a large h1 filename with every action ranged
        right. Three stacked bands of chrome before the first formatting
        control, where Word has one. The filename now sits centred in the bar
        as Word puts "Document1", the way out is an icon at the left where
        Word's home button is, and the actions are the quick-access row beside
        it.

        THE FILENAME IS SMALLER THAN IT WAS AND THAT IS DELIBERATE. It was a
        `heading-l` h1, which is a page title; in a word processor the
        document name is a label on the window, not a headline over the
        content. It keeps h1 semantics for screen readers regardless.
      */}
      <div className="flex items-center gap-2 border-b border-border-default bg-bg-surface px-3 py-1.5">
        {/* THE WAY OUT KEEPS ITS WORDS (Gabe, 2026-09-11: "do not forget to
            include the redirect button"). The first pass at this bar reduced
            it to a bare chevron because that is what Word's home icon is --
            but Word's icon leads to a file browser everybody already knows,
            and a lone `<` in a web app is a guess. The label shows from `sm`
            and the icon carries it below that, where the bar has no room;
            `aria-label` names it either way, so it is never just an arrow to
            a screen reader. */}
        <Link
          href={documentsHref}
          aria-label="back to documents"
          title="back to documents"
          className={cn(
            ICON_MOTION_GROUP,
            buttonVariants({ variant: 'ghost', size: 's' }),
            'shrink-0 gap-1 px-2'
          )}
        >
          <ChevronLeftIcon size={16} aria-hidden className={iconMotion('back')} />
          <span className="hidden sm:inline">back to documents</span>
        </Link>

        <Separator orientation="vertical" className="h-5 shrink-0" />

        {/* THE QUICK ACCESS ROW. Word keeps save and undo here; this keeps
            save and the exports, because those are what a CV is for. */}
        <div className="flex shrink-0 items-center gap-1">{actions}</div>

        {/* CENTRED, as Word centres "Document1". `min-w-0` on both this and
            the input is what lets a long name ellipsis instead of pushing the
            actions off the bar. */}
        {/* THE KIND LABEL SITS OUTSIDE THE h1, not inside it. An input inside
            a heading contributes its VALUE to the heading's accessible name,
            so a sibling span in there makes the heading announce "LaTeX CV
            WORD" -- which is what broke the route test when this bar was first
            written. The heading names the document and nothing else. */}
        <div className="mx-auto flex min-w-0 items-baseline justify-center gap-2 px-4">
        <h1 className="min-w-0">
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="untitled CV"
            aria-label="CV title"
            // `text-ellipsis` on an input is honoured while it is NOT focused,
            // which is exactly what is wanted: a long name reads truncated at
            // rest and gives back the whole string the moment you click in.
            title={displayTitle}
            className={cn(
              'min-w-0 max-w-[22rem] truncate border-0 bg-transparent p-0 text-center',
              'text-body-m font-medium text-text-primary placeholder:text-text-muted',
              'focus:outline-none focus-visible:outline-none',
              // The only chrome it grows: the same 2px accent rule the active
              // nav item and the status marker already use.
              'border-b-2 border-transparent focus:border-accent-default'
            )}
          />
        </h1>
        <span className="shrink-0 text-label-caps uppercase text-text-muted">{kindLabel}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span className="hidden text-body-s text-text-muted lg:inline">
            {savedLabel}
            {/* "unsaved changes", not "unsaved": the shorter form reads as a
                state the document is in rather than work that is pending, and
                two tests assert the longer one because it is what a person
                needs to see. */}
            {dirty && (
              <span className="ml-2 text-status-interviewing-mark">unsaved changes</span>
            )}
          </span>
          {destructiveActions && (
            <>
              {/* A real gap, not a bigger margin: the separator says these are
                  a different category of action rather than the end of a row. */}
              <Separator orientation="vertical" className="mx-1 h-5" />
              {destructiveActions}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        {/*
          THE RIBBON SITS ON ITS OWN GROUND (Gabe, 2026-09-11: "there is no
          real dividers between components"). A hairline alone was not enough
          separation: the toolbar, the rails and the page were all the same
          off-white, so the chrome read as one undifferentiated field with
          rules drawn through it.

          TONE ALONE WAS NOT ENOUGH, AND THAT IS WORTH MEASURING RATHER THAN
          arguing about. In light mode the three grounds are 255 / 250 / 244 in
          luminance -- five and six units apart, which is very nearly
          invisible and is exactly why the chrome read as one field. In dark
          mode the same tiers are 19 / 28 / 40, nine and twelve apart, where
          the tint genuinely does the work.

          So both: `surface` for the ribbon and rails against `inset` around
          the page, plus `border-border-default` at 212 -- 38 units against
          surface, about seven times the tonal step -- to carry the boundary
          where the tint cannot. The tint is not decorative; it is what makes
          dark mode read without a heavier border.
        */}
        {tools && (
          <div className="flex flex-wrap items-center gap-2 border-y border-border-default bg-bg-surface px-2 py-2">
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
          {leftRail && (
            <aside className="min-w-0 rounded-[4px] border border-border-default bg-bg-surface p-4 xl:order-1">
              {leftRail}
            </aside>
          )}
          {/* `id` IS LOAD-BEARING: the formatting ribbon points at this region
              with `aria-controls`, which is what tells a screen reader that a
              toolbar in the chrome above formats the document down here. A
              dangling reference would be worse than none. */}
          <div
            id="document-sheet"
            className="min-w-0 overflow-x-auto bg-bg-inset p-4 md:p-8 xl:order-2"
          >
            {children}
          </div>
          {rightRail && (
            <aside className="min-w-0 rounded-[4px] border border-border-default bg-bg-surface p-4 xl:order-3">
              {rightRail}
            </aside>
          )}
        </div>
      </div>

      {footnote && <div className="text-body-s text-text-muted">{footnote}</div>}
    </div>
  )
}
