'use client'

import * as React from 'react'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { AnalyticsIcon, ApplicationsIcon, ChevronLeftIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { ICON_MOTION_GROUP, iconMotion } from '@/components/icons/motion'
import { cn } from '@/lib/utils'
import type { DocumentWorkspaceProps } from './DocumentWorkspace'

/* The toggles point at these with `aria-controls`, so the ids have to be the
   same two strings in both places -- a dangling reference is worse than none,
   which is the same rule `document-sheet` below is written under. */
const LEFT_RAIL_ID = 'document-left-rail'
const RIGHT_RAIL_ID = 'document-right-rail'

/**
 * WHERE BOTH RAILS START OPEN, in pixels of workspace width.
 *
 * The arithmetic rather than a taste: the rails are 320 and 400, so they take
 * 720px between them. At 1024 -- the narrowest width this chrome renders at --
 * that leaves the page 304px, which is a sliver of a sheet flanked by two
 * panels, and the thing being edited is the smallest thing on screen. At 1280
 * the page well gets 560px, which `useFitToWidth` scales an 816px letter page
 * into legibly, so that is where the default flips.
 *
 * 1280 is also Tailwind's `xl`, which is not a coincidence: it is the width
 * the three-column layout was originally gated on, and it was the right number
 * for "both rails are comfortable here". What was wrong was making it the
 * width at which the layout existed AT ALL.
 */
const RAILS_OPEN_AT = 1280

/**
 * The editor at `lg` and above: breadcrumb, name, save state, actions, a
 * docked tool strip, and the page between two rails.
 *
 * THE OTHER HALF of the split described in `CompactDocumentChrome` -- see that
 * file for why this is two components rather than one with `lg:` classes.
 *
 * THE THREE-COLUMN FRAME STARTS AT `lg`, AND IT STARTED AT `xl` UNTIL
 * 2026-09-13 (Gabe: "make left and right rail collapsible and maintain the
 * layout of large screens to the small laptop screens"). Between 1024 and 1280
 * this file had a SECOND layout -- rails stacked above and below the page, the
 * whole window scrolling -- and 1280 is above every 13" laptop there is, so
 * the arrangement most people saw was the fallback. It is gone: one layout at
 * every width this component renders at, and the rails COLLAPSE rather than
 * stack when there is no room for them.
 *
 * That also retires rules that were already unreachable. `DocumentWorkspace`
 * hands this component only widths >= 1024 (`useBelowDesktop` switches at
 * `lg`), so every un-prefixed class here that existed to serve the stacked
 * fallback below `xl` was serving a 1024-1280 band that now looks like the
 * large screens, and nothing narrower ever gets here at all.
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

  /**
   * ONE BOOLEAN PER RAIL, and they both start OPEN.
   *
   * DESKTOP-FIRST for the same reason `useBelowDesktop` is: the server cannot
   * measure anything, so the first client render must agree with the markup it
   * hydrates. Starting open means a wide screen never flashes a collapsed rail
   * open; a narrow one corrects itself in the same frame as mount, which is
   * the cheaper of the two wrong first paints.
   */
  const [leftOpen, setLeftOpen] = React.useState(true)
  const [rightOpen, setRightOpen] = React.useState(true)
  const rootRef = React.useRef<HTMLDivElement>(null)

  /**
   * THE DEFAULT IS MEASURED, NOT ASKED OF A MEDIA QUERY, and once only.
   *
   * A media query answers about the VIEWPORT; what decides whether two rails
   * and a page fit is the width of this workspace, which is the viewport minus
   * whatever chrome is beside it. They agree today because `useDocumentFocus`
   * hides the sidebar -- and that is exactly the kind of agreement that stops
   * being true the first time something is docked next to the editor.
   *
   * MEASURED DIRECTLY, THEN OBSERVED ONLY IF THAT FAILED. A ResizeObserver is
   * delivered as part of the rendering lifecycle, so an environment that is
   * not painting never calls it: a hidden browser pane gave a laid-out element
   * zero callbacks in 1.5s (2026-09-13), and a background tab or a headless
   * capture does the same. `getBoundingClientRect` asks layout directly and
   * cannot be starved, so it goes first and the observer is the fallback for
   * the case where there was no layout to read yet.
   *
   * IT IS A DEFAULT, NOT A BINDING. Once a real width has been read the
   * observer is never even created, so there is no resize handler left to
   * argue with a person who closed a rail on purpose -- a toggle is final by
   * construction rather than by a flag guarding it.
   */
  React.useEffect(() => {
    const el = rootRef.current
    if (!el) return

    let settled = false
    const measure = () => {
      if (settled) return
      const width = el.getBoundingClientRect().width
      // ZERO IS "UNMEASURED", NOT "NARROW". jsdom lays nothing out and reports
      // 0 for every element, and a `display:none` subtree does the same in a
      // real browser. There is no such thing as a 0px workspace; collapsing
      // both rails on that reading would hide half the editor wherever it is
      // rendered without a layout. Keeping the default is the honest answer to
      // a measurement that did not happen.
      if (width === 0) return
      settled = true
      const open = width >= RAILS_OPEN_AT
      setLeftOpen(open)
      setRightOpen(open)
    }

    measure()

    if (settled || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const showLeftRail = !!leftRail && leftOpen
  const showRightRail = !!rightRail && rightOpen

  const leftToggleLabel = leftOpen ? 'Hide document tools' : 'Show document tools'
  const rightToggleLabel = rightOpen ? 'Hide tailoring rail' : 'Show tailoring rail'

  /**
   * THE COLUMN TEMPLATE FOLLOWS WHICH RAILS EXIST *AND* WHICH ARE OPEN.
   *
   * A closed rail contributes no track. It would be tidier to leave the track
   * and let a `hidden` child collapse it, but a grid track sized `320px` is
   * 320px whether anything is in it or not -- the page would keep paying for a
   * rail nobody can see.
   *
   * Four cases, and the fourth is not hypothetical: the LaTeX editor passes no
   * right rail at all (it puts source beside preview inside the content column
   * instead), so "left only" is a shipping arrangement rather than a transient
   * state of the Word editor.
   */
  const railColumns =
    showLeftRail && showRightRail
      ? 'lg:grid-cols-[320px_minmax(0,1fr)_400px] min-[1700px]:grid-cols-[380px_minmax(0,1fr)_500px]'
      : showLeftRail
        ? 'lg:grid-cols-[320px_minmax(0,1fr)] min-[1700px]:grid-cols-[380px_minmax(0,1fr)]'
        : showRightRail
          ? 'lg:grid-cols-[minmax(0,1fr)_400px] min-[1700px]:grid-cols-[minmax(0,1fr)_500px]'
          : 'lg:grid-cols-[minmax(0,1fr)]'

  return (
    <div
      ref={rootRef}
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
      //
      // THE LOCKED FRAME IS NOW EVERY WIDTH THIS CHROME RENDERS AT, which it
      // was not until 2026-09-13. It used to lock from `xl` only, because
      // below that the rails stacked into three auto rows inside a fixed
      // height -- which CSS Grid SQUEEZES rather than overflows. Measured at
      // 900x600 back then: the left rail rendered 154px tall instead of its
      // natural 500, so the layout was three crushed strips each with its own
      // scrollbar over a document about 160px tall. The rails collapse instead
      // of stacking now, so there is never a third row to crush and the frame
      // can lock from `lg` -- the `lg:` prefix stays only because this file is
      // still nominally a `lg`-and-up component.
      className="flex w-full flex-col lg:h-[100dvh] lg:overflow-hidden"
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
          // `sticky` IS INERT HERE NOW and is kept because it costs nothing to
          // keep and something to rediscover. It mattered while this file had
          // a 1024-1280 arrangement where the whole page scrolled: without it
          // the title bar and the ribbon scrolled away with the document,
          // which is what Gabe saw -- half a ribbon at the top of the window
          // and the actions stranded beside it. The frame is locked at every
          // width this component renders at now, so nothing scrolls past it.
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

      <div className="flex flex-col lg:min-h-0 lg:flex-1">
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
              {/* THE RAIL TOGGLES LEAD THE GROUP, BEFORE THE VERBS. They are
                  view state, not actions on the document, and the separator
                  says so -- the same idiom the destructive actions use at the
                  other end, for the same reason: a rule marks a change of
                  category, where a wider gap would only read as the end of a
                  row.

                  A toggle exists only where its rail does, so the LaTeX editor
                  gets one and the Word editor two, and neither gets a control
                  that points at nothing.

                  ICONS, NOT LABELS, and these two in particular: the outline
                  glyph for the tools rail (it is the tab list and Word's
                  navigation pane), and the chart glyph for the tailoring rail
                  -- which is already what the compact chrome puts on its own
                  tailoring control, so the same panel has the same mark on a
                  phone and on a laptop. */}
              {leftRail && (
                <Button
                  variant="ghost"
                  size="s"
                  className="px-2"
                  aria-expanded={leftOpen}
                  aria-controls={LEFT_RAIL_ID}
                  aria-label={leftToggleLabel}
                  title={leftToggleLabel}
                  onClick={() => setLeftOpen((open) => !open)}
                >
                  <ApplicationsIcon size={16} aria-hidden />
                </Button>
              )}
              {rightRail && (
                <Button
                  variant="ghost"
                  size="s"
                  className="px-2"
                  aria-expanded={rightOpen}
                  aria-controls={RIGHT_RAIL_ID}
                  aria-label={rightToggleLabel}
                  title={rightToggleLabel}
                  onClick={() => setRightOpen((open) => !open)}
                >
                  <AnalyticsIcon size={16} aria-hidden />
                </Button>
              )}
              {(leftRail || rightRail) && (
                <Separator orientation="vertical" className="mx-1 h-6" />
              )}
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
          THREE COLUMNS FROM `lg`, AND COLLAPSIBLE ONES. The rails want ~300px
          each beside an 816px page, which is more than a 1366 laptop has to
          give all three at once -- so the answer is which panels are open
          rather than which layout is in force. Below 1280 of workspace both
          start closed and the page has the screen to itself; the toggles in
          the ribbon are how you get a rail back, one at a time.

          The page itself is a PRINT PROOF, not app chrome: it keeps its own
          white sheet and letter geometry and deliberately does not follow the
          app's theme, because what is on it has to match what comes out of a
          printer.
        */}
        {/* `min-h-0` IS THE LOAD-BEARING HALF of "only the document scrolls".
            A flex child's automatic minimum size is its content height, so
            without this the grid refuses to shrink, the frame grows past the
            viewport and the page scrolls after all -- which is the bug this
            whole layout exists to fix. Each region then scrolls itself. */}
        <div
          className={cn(
            'grid gap-0 lg:min-h-0 lg:flex-1',
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

              Which is also why collapsing is a TOGGLE and not a narrower rail:
              there is no width at which this content is merely smaller. It is
              either there at the width it needs or it is out of the way.
            */
            railColumns
          )}
        >
          {leftRail && (
            <aside
              id={LEFT_RAIL_ID}
              // A CLOSED RAIL IS `hidden`, NOT UNMOUNTED, and the difference
              // is a person's work. The rails hold per-section edit state and
              // whatever request is in flight -- a rewrite being reviewed, a
              // tailoring run half returned -- all of it React state inside
              // these subtrees. Unmounting on a LAYOUT toggle would throw that
              // away and re-ask the model for it, which is a bill as well as a
              // surprise. `display:none` also takes the subtree out of the
              // accessibility tree, so a screen reader never finds two copies
              // of the same control while a rail is put away.
              className={cn(
                'min-w-0 border-b border-border-default bg-bg-surface p-5',
                'lg:order-1 lg:overflow-y-auto lg:border-b-0 lg:border-r',
                !leftOpen && 'hidden'
              )}
            >
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
              'lg:order-2 lg:overflow-auto'
            )}
          >
            {children}
          </div>
          {rightRail && (
            <aside
              id={RIGHT_RAIL_ID}
              // Hidden rather than unmounted -- see the left rail above. This
              // is the one that makes the rule non-negotiable: the tailoring
              // pane is where the in-flight request and the per-section edit
              // state actually live.
              className={cn(
                'min-w-0 border-t border-border-default bg-bg-surface p-5',
                'lg:order-3 lg:overflow-y-auto lg:border-t-0 lg:border-l',
                !rightOpen && 'hidden'
              )}
            >
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
