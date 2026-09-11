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
      // FULL BLEED AND FULL HEIGHT, NOT A CARD IN A PAGE. It was centred at
      // max-w-1600 inside the app's gutters, so a word processor sat in a
      // reading column -- the one layout Word never has.
      //
      // `h-[100dvh]` with `overflow-hidden` is what makes the DOCUMENT the
      // only thing that scrolls (Gabe, 2026-09-11). Before this the whole page
      // scrolled, so the ribbon and both rails slid away the moment you read
      // past the first screen -- a formatting bar you have to scroll back up
      // to reach is a formatting bar you stop using. `dvh` rather than `vh`
      // because mobile browsers change the viewport as their chrome hides, and
      // `vh` would leave the foot of the document under the address bar.
      // THE LOCKED FRAME IS `xl` AND UP ONLY, and that is a fix rather than a
      // caveat. Below xl the grid collapses to one column and the rails stack
      // around the document -- three auto rows inside a fixed height, which
      // CSS Grid SQUEEZES rather than overflows. Measured at 900x600: the left
      // rail rendered 154px tall instead of its natural 500, so the layout was
      // three crushed strips each with its own scrollbar and a document about
      // 160px tall. Below xl the page scrolls, which is the only sane
      // behaviour for a stacked layout; from xl the frame locks and only the
      // document moves, which is what was asked for.
      className="flex w-full flex-col xl:h-[100dvh] xl:overflow-hidden"
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
      <div className={cn(
          // STICKY BELOW `xl`, WHERE THE PAGE ITSELF SCROLLS. From xl the frame
          // is locked and only the document moves, so this is a no-op there.
          // Below it the rails stack and the page scrolls -- and without this
          // the title bar and the ribbon scroll away with it, which is what
          // Gabe saw: half a ribbon at the top of the window and the actions
          // stranded beside it. A formatting bar you have to scroll back up to
          // reach is one you stop using.
          'sticky top-0 z-30 flex shrink-0 items-center gap-2',
          'border-b border-border-default bg-bg-surface px-4 py-2'
        )}>
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
        </div>
      </div>

      <div className="flex flex-col xl:min-h-0 xl:flex-1">
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
        {/* THE CTAs LIVE IN THE RIBBON NOW (Gabe, 2026-09-11: "move the CTAs
            within the toolbar"). They were in the title bar, which left the
            right end of the ribbon empty once the styles gallery stopped
            being capped -- a band of nothing where Word puts its Editing
            group. Putting them here fills that space with the controls a
            person reaches for most, and leaves the title bar doing what
            Word's does: naming the file.

            `ml-auto` rather than a spacer: the ribbon's own bands size
            themselves, and whatever is left over goes to the gap before these.
            */}
        {/* THE ROW RENDERS WHENEVER THERE ARE ACTIONS, not only when there are
            tools. Gating the whole band on `tools` cost the LaTeX editor every
            one of its controls -- it passes no formatting ribbon -- which two
            tests caught immediately. The ribbon half is what is optional. */}
        {(tools || actions || destructiveActions) && (
          <div className={cn(
              // Sits under the title bar when both are stuck. `top-[var()]`
              // would need the bar's measured height; `top-12` is its height
              // at this padding and is close enough that nothing shows through.
              'sticky top-12 z-20 flex shrink-0 items-stretch gap-3',
              'border-y border-border-default bg-bg-surface px-4 py-2.5'
            )}>
            <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">{tools}</div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5 border-l border-border-subtle pl-3">
              {actions}
              {destructiveActions && (
                <>
                  {/* A real gap, not a bigger margin: the separator says these
                      are a different category of action rather than the end of
                      a row. */}
                  <Separator orientation="vertical" className="mx-1 h-6" />
                  {destructiveActions}
                </>
              )}
            </div>
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
        {/* `min-h-0` IS THE LOAD-BEARING HALF of "only the document scrolls".
            A flex child's automatic minimum size is its content height, so
            without this the grid refuses to shrink, the frame grows past the
            viewport and the page scrolls after all -- which is the bug this
            whole layout exists to fix. Each region then scrolls itself. */}
        <div
          className={cn(
            'grid gap-0 xl:min-h-0 xl:flex-1',
            /*
              THE RAILS NO LONGER TRADE AGAINST THE PAGE.

              They did, and the numbers here had been nudged three times by
              2026-09-11 without the tension going anywhere: a letter page is a
              fixed 816px, its well adds 64, so every pixel a rail gained was a
              pixel the page lost. Widening the left rail to 320 would have put
              the page into a sideways scroll at 1366, 1440 and 1536 -- the
              three commonest laptop widths there are.

              `useFitToWidth` removed the constraint rather than balancing it.
              The page now scales to whatever column it is given, as Word's
              zoom does, so a rail can be as wide as it is useful and the page
              still shows whole. These widths are chosen for the CONTENT now:
              the left rail holds an outline, a statistics table with a label
              and a figure on one line, and the tab list; the right holds an
              ATS ring, two keyword lists, rewrites and the thesaurus.
            */
            leftRail && rightRail &&
              'xl:grid-cols-[320px_minmax(0,1fr)_400px] min-[1700px]:grid-cols-[380px_minmax(0,1fr)_500px]',
            leftRail && !rightRail &&
              'xl:grid-cols-[320px_minmax(0,1fr)] min-[1700px]:grid-cols-[380px_minmax(0,1fr)]'
          )}
        >
          {leftRail && (
            <aside className="min-w-0 border-b border-border-default bg-bg-surface p-5 xl:order-1 xl:overflow-y-auto xl:border-b-0 xl:border-r">
              {leftRail}
            </aside>
          )}
          {/* `id` IS LOAD-BEARING: the formatting ribbon points at this region
              with `aria-controls`, which is what tells a screen reader that a
              toolbar in the chrome above formats the document down here. A
              dangling reference would be worse than none. */}
          <div
            id="document-sheet"
            className={cn(
              // GENEROUS ROOM UNDER THE LAST PAGE (Gabe: "no space at the
              // bottom"). The well's own padding put 32px under the sheet,
              // which reads as the document being cut off rather than ended --
              // Word leaves most of a screen below the final page. `pb-24`
              // is that breathing room.
              'min-w-0 overflow-x-auto bg-bg-inset p-4 pb-24 md:p-8 md:pb-24',
              'xl:order-2 xl:overflow-auto'
            )}
          >
            {children}
          </div>
          {rightRail && (
            <aside className="min-w-0 border-t border-border-default bg-bg-surface p-5 xl:order-3 xl:overflow-y-auto xl:border-t-0 xl:border-l">
              {rightRail}
            </aside>
          )}
        </div>
      </div>

      {footnote && (
        <div className="shrink-0 border-t border-border-default bg-bg-surface px-3 py-1 text-body-s text-text-muted">
          {footnote}
        </div>
      )}
    </div>
  )
}
