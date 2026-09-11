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
 * IT NEVER SCALES ABOVE 1. A 4K monitor should show a letter page at letter
 * size, not a poster.
 */

/** Letter width in CSS pixels at 96dpi, which is what `8.5in` resolves to. */
export const PAGE_WIDTH_PX = 816

/**
 * Below this the type is too small to edit comfortably, so the page stops
 * shrinking and scrolls instead. 0.55 puts 11pt body text at about 6pt on
 * screen, which is already the floor of readable.
 */
export const MIN_SCALE = 0.55

export interface FitToWidth {
  /** Attach to the element whose width the page must fit inside. */
  ref: React.RefObject<HTMLDivElement | null>
  scale: number
}

export function useFitToWidth(pageWidth = PAGE_WIDTH_PX): FitToWidth {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = React.useState(1)

  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    const measure = () => {
      // `clientWidth` excludes the scrollbar, which is what the page has to
      // fit beside -- using the border box would leave the last few pixels
      // under a vertical scrollbar on the widths that only just fit.
      const available = element.clientWidth
      if (available <= 0) return
      setScale(Math.max(MIN_SCALE, Math.min(1, available / pageWidth)))
    }

    measure()
    // ResizeObserver rather than a window listener: the well changes width
    // when a RAIL appears or the breakpoint flips, not only when the window
    // does, and a window listener would miss both.
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [pageWidth])

  return { ref, scale }
}
