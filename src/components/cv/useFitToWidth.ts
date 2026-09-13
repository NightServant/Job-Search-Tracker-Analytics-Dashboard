'use client'

import * as React from 'react'

/**
 * Word's zoom-to-fit, for the page that never fitted.
 *
 * WHY THIS EXISTS RATHER THAN ANOTHER BREAKPOINT. The rails and the page have
 * been competing for one row since the three-column layout landed, and the
 * numbers had been nudged three times by 2026-09-11 without the tension going
 * anywhere: a letter page is a fixed 816px, its well adds 64, so every pixel
 * a rail gains is a pixel the page loses. Widening the left rail to 320 would
 * have pushed the page into a sideways scroll at 1366, 1440 and 1536 -- the
 * three most common laptop widths there are.
 *
 * Word does not solve this by shrinking its panes. It scales the page, and the
 * zoom control in its status bar is exactly this. Scaling removes the trade
 * entirely: a rail can be as wide as it is useful and the page still shows
 * whole, because the page is no longer a fixed demand on the row.
 *
 * TRANSFORM, NOT A WIDTH CHANGE, and that distinction is the whole point. The
 * sheet stays 816px of letter geometry with 0.8in margins, so what is on
 * screen is still a print proof and still matches what comes out of a printer
 * -- it is only drawn smaller. Changing the width instead would reflow the
 * text and the preview would stop predicting the PDF, which is the one thing
 * this sheet is for.
 *
 * LAYOUT HEIGHT IS CORRECTED BY HAND because a transform does not affect it.
 * A page scaled to 0.7 still occupies its full 11in in the document flow, so
 * the well would end in a third of a page of empty space and the scrollbar
 * would promise more document than exists. The wrapper's height is multiplied
 * by the same factor.
 *
 * IT NEVER SCALES ABOVE 1. A wide monitor shows a letter page at letter size,
 * not a poster. That was the original argument for the cap, it was put to the
 * test on 2026-09-13 at three different ceilings, and it survived all three --
 * see MAX_SCALE, which is now a decision rather than an assumption.
 *
 * WHAT DID CHANGE THAT DAY WAS THE FLOOR, which had been doing something it
 * was never meant to; see MIN_SCALE.
 */

/** Letter width in CSS pixels at 96dpi, which is what `8.5in` resolves to. */
export const PAGE_WIDTH_PX = 816

/**
 * The floor is a GUARD, NOT A POLICY, and it was a policy until 2026-09-13.
 *
 * IT USED TO BE 0.55, on the argument that below it the type is too small to
 * edit comfortably -- 11pt body at about 6pt on screen -- so the page should
 * stop shrinking and scroll instead. True about editing, and irrelevant here:
 * the only well narrow enough to hit 0.55 is a phone, where scroll view is the
 * default and print view is a deliberate "show me the page" -- a preview, not
 * a surface anyone types on.
 *
 * WHAT IT COST WAS CENTRING (Gabe, 2026-09-13: "mobile and tablet screens
 * print view must center the document regardless of width"). Measured at 390:
 * the floor drew a 449px page in a 390px canvas, so it overflowed 59px and sat
 * flush left, because a box wider than its container has no free space for
 * `margin: auto` to split. There is no way to centre that without pushing the
 * left margin -- where every line of text begins -- off the screen. Fitting it
 * is the only centring that is also readable.
 *
 * 0.35 clears the narrowest phone there is (320px of canvas needs 0.39), and
 * exists only so a pathological measurement cannot ask for `zoom: 0`.
 */
export const MIN_SCALE = 0.35

/**
 * And above this it stops growing: it does not.
 *
 * ASKED FOR, TRIED AT THREE SIZES, AND DECLINED (Gabe, 2026-09-13: "allow the
 * document to shrink and grow depending on desktop and laptop screen size,
 * just like Microsoft Word" -- then "document is too big" at fit-the-well,
 * "too aggressive for sizing" at 1.2, "aggressive sizing in desktop and laptop
 * screens" at 1.1, and finally "never above 100%" when asked outright).
 *
 * WHICH IS WORTH KEEPING AS A NUMBER RATHER THAN DELETING THE CLAMP, because
 * the clamp is now a decision with a history instead of an accident. The
 * original note here argued a 4K monitor should show a letter page at letter
 * size and not a poster, and every attempt to relax it produced a page someone
 * looked at and called too big. A well wider than 816px spends the difference
 * on desk, which is what Word does at 100% too.
 *
 * THE PAGE STILL GROWS, just not past its own size: everything between the
 * floor and here is the raw ratio, so a rail folding away does widen the page
 * until it reaches letter size. That range is the whole of what shipped.
 */
export const MAX_SCALE = 1

/**
 * The whole rule, exported because its TEST used to be a second copy of this
 * expression -- so raising the ceiling left the test asserting `Math.min(1,
 * ...)` against a hook that no longer did that, and it passed. A rule worth a
 * test is worth having one definition of.
 */
export function scaleFor(available: number, pageWidth = PAGE_WIDTH_PX): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, available / pageWidth))
}

export interface FitToWidth {
  /**
   * Attach to the element whose width the page must fit inside.
   *
   * A CALLBACK REF, NOT AN OBJECT REF, AND THAT IS THE WHOLE FIX (2026-09-13).
   * See the observer note below -- the type is what makes it impossible to
   * observe a node that has since been replaced.
   */
  ref: React.RefCallback<HTMLDivElement>
  scale: number
}

export function useFitToWidth(pageWidth = PAGE_WIDTH_PX): FitToWidth {
  const [scale, setScale] = React.useState(1)
  const nodeRef = React.useRef<HTMLDivElement | null>(null)
  const observerRef = React.useRef<ResizeObserver | null>(null)

  // Read inside `measure`, so a geometry that arrives with the document does
  // not have to tear down and re-attach the observer to be taken into account.
  const pageWidthRef = React.useRef(pageWidth)
  pageWidthRef.current = pageWidth

  const measure = React.useCallback(() => {
    const element = nodeRef.current
    if (!element) return
    // `clientWidth` excludes the scrollbar, which is what the page has to fit
    // beside -- using the border box would leave the last few pixels under a
    // vertical scrollbar on the widths that only just fit.
    const available = element.clientWidth
    // ZERO IS "UNMEASURED", NOT "INFINITELY NARROW": jsdom lays nothing out,
    // and a `display:none` subtree reads the same in a real browser. Keeping
    // the last good scale is the honest answer to a measurement that did not
    // happen.
    if (available <= 0) return
    setScale(scaleFor(available, pageWidthRef.current))
  }, [])

  /**
   * THE OBSERVER FOLLOWS THE NODE, because for one day it did not.
   *
   * THE BUG, WHICH IS WORTH WRITING DOWN IN FULL. This was an object ref read
   * once inside a mount effect: measure `ref.current`, observe it, and never
   * look again. That holds only while the observed node outlives the component
   * that measured it, and here it does not. `useBelowDesktop` is desktop-first,
   * so a phone mounts `DesktopDocumentChrome`, corrects itself, and swaps to
   * `CompactDocumentChrome` -- a different component type, so React unmounts
   * that subtree and mounts a new one. The page wrapper is a NEW DOM node from
   * then on. `useFitToWidth` sits ABOVE the swap in `WordResumeEditor`, so it
   * never re-ran, and its observer spent the rest of the session watching a
   * detached element while React quietly pointed `ref.current` at the live one.
   *
   * MEASURED, not reasoned about: instrumenting `ResizeObserver` in the page
   * and asking which observers watched the live wrapper returned NOTHING on a
   * phone, while the same probe on a desktop returned the hook's. The page
   * therefore kept whatever zoom it had been given at mount forever -- it
   * survived rotation (576 -> 844 left the zoom at 0.667, a 544px page adrift
   * in an 844px canvas), view toggles and rail toggles alike. Every "document
   * is too big", "not centered" and "horizontal scrolling" report on
   * 2026-09-13 was this one fact.
   *
   * A CALLBACK REF CANNOT HAVE THAT BUG. React calls it with the node on
   * attach and with `null` on detach, every time either happens, so the
   * observer is re-pointed at exactly the moments the node identity changes.
   * There is no window in which the hook holds an element the tree has
   * replaced.
   */
  const ref = React.useCallback(
    (node: HTMLDivElement | null) => {
      nodeRef.current = node
      observerRef.current?.disconnect()
      observerRef.current = null
      if (!node) return

      measure()
      // The well changes width when a RAIL folds or the chrome swaps, not only
      // when the window does, so a window listener would miss both.
      if (typeof ResizeObserver === 'undefined') return
      const observer = new ResizeObserver(measure)
      observer.observe(node)
      observerRef.current = observer
    },
    [measure]
  )

  // A geometry that arrives after mount (the document's own page size, read
  // once its content loads) changes the answer without changing the element.
  React.useEffect(() => {
    measure()
  }, [pageWidth, measure])

  return { ref, scale }
}
