/**
 * The landing page's vertical rhythm, in one place.
 *
 * WHY THIS FILE EXISTS, and it is the same argument ./typography.ts makes about
 * type. Measured in the browser at 1440 on 2026-09-14, the page was using TEN
 * distinct vertical values to do three jobs: 112px between sections, 80px above
 * the closing rule, 64px before the carousel, 56px inside a problem row, 48px
 * under every heading and again in the footer, 40px inside a proof row and
 * inside a product cell, 32px, 20px, 16px and 12px below that. None of it was a
 * decision. Each section was written on its own, reached for whichever Tailwind
 * step looked right, and the page ended up loose in the places nobody measured
 * and tight in the places somebody did. Gabe called it on 2026-09-14: "tighten
 * the margin/padding of each section and its components to the global
 * standard."
 *
 * THE GLOBAL STANDARD IS `--spacing-section`, and it already exists. index.css
 * defines it as `clamp(1.5rem, 1rem + 2.5vw, 2rem)` and calls it "the vertical
 * gap between major blocks"; the dashboard, analytics and applications screens
 * all space their panels with `gap-section`. The landing page was the only
 * surface in the app not spending it.
 *
 * IT IS USED AS A MULTIPLE, NOT AS A LITERAL. A landing section cannot be
 * padded with the raw 24-32px token -- that is the gap between two panels
 * inside one app screen, and a marketing section padded to it reads as a
 * settings pane. What the token is good for is being the UNIT: every value
 * below is a whole or half step of it, so the page's rhythm is derived from the
 * app's rather than invented beside it, and the ratios between the steps are
 * fixed by construction instead of by whoever edits a section next.
 *
 * THE BREAKPOINT JUMP IS GONE, and that is the second thing this buys. Every
 * value it replaces was a `py-20 md:py-28` pair, so the page stepped discretely
 * at 768 and did nothing in between -- a 767px viewport and a 375px one got
 * identical spacing. `--spacing-section` is a clamp, so these move continuously
 * with the viewport and reach their ceiling at 640. That is the reasoning
 * index.css already gives for the token existing at all ("single tokens rather
 * than `p-4 md:p-8` pairs so the step between tiers is continuous instead of a
 * jump at 768"); this file just applies it.
 *
 * WHAT EACH STEP RESOLVES TO, at 375px and at 640px-and-up:
 *
 *   section   x3      76 / 96   a section's own top and bottom padding
 *   blockGap  x2      51 / 64   between two major blocks inside one section
 *   headingGap x1.5   38 / 48   under a section heading, before its content
 *   band      x1.5    38 / 48   a chrome band's own padding (the footer)
 *   row       x1.25   32 / 40   one row of a section's list, top and bottom
 *
 * TIGHTER, NOT CRAMPED. The largest cut is desktop section padding, 112px to
 * 96px, which takes the empty band between two sections from 224px to 192px.
 * The second is the problem section's rows, 56px to 40px, which were the only
 * rows on the page padded more than the proof rows doing the identical job.
 * Mobile barely moves -- 80px to 76px -- because mobile was never the loose
 * half; the `md:` step was.
 *
 * `headingGap` and `band` are the same step under two names because they are
 * the same distance doing two different jobs, and one of them is a margin while
 * the other is a padding. Tailwind bakes the property into the class, so the
 * alternative to naming both is a call site writing the calc out by hand, which
 * is exactly the drift this file exists to stop.
 *
 * NOT A `@theme` TOKEN. The obvious alternative was three new `--spacing-*`
 * entries in index.css and three plain utilities. It was rejected: these five
 * values are the landing page's rhythm and nothing else in the app has sections
 * to space, so a global token would be a page-specific decision stored in the
 * design system's own vocabulary, where the next reader would reasonably assume
 * it applied everywhere.
 */
export const LANDING_RHYTHM = {
  /** A `<Section>`'s own top and bottom padding. Three steps. */
  section: 'py-[calc(var(--spacing-section)*3)]',
  /** Between two major blocks inside one section -- the claims and the screens. */
  blockGap: 'mt-[calc(var(--spacing-section)*2)]',
  /** The same distance as `blockGap`, as padding, for a block opened by a rule. */
  blockPad: 'pt-[calc(var(--spacing-section)*2)]',
  /** Under a section heading, before the content it introduces. */
  headingGap: 'mb-[calc(var(--spacing-section)*1.5)]',
  /** A chrome band's own padding: the footer. */
  band: 'py-[calc(var(--spacing-section)*1.5)]',
  /** One row of a section's list -- a proof entry, a problem row. */
  row: 'py-[calc(var(--spacing-section)*1.25)]',
  /**
   * The same step on the other axis, for the one thing that needs it: a
   * product cell is a row turned on its side and pads all four edges equally.
   * A row does not -- its horizontal edges are the section's own gutter.
   */
  rowX: 'px-[calc(var(--spacing-section)*1.25)]',
} as const

export type LandingRhythmStep = keyof typeof LANDING_RHYTHM
