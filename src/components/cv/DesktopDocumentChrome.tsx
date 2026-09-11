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
