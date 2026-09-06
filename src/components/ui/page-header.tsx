import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The strip every authenticated screen's body opens with: a title and an
 * optional action on the trailing edge.
 *
 * Four screens need this exact shape -- Dashboard, Applications, Documents,
 * Analytics -- and the roadmap's explicit goal is that they read as one
 * screen wearing four different data sets, not four screens that happen to
 * agree by coincidence. `action` is a generic slot rather than a typed button
 * Display/M (28px), not Heading/L. Overview rendered its own h1 at Display/M
 * while every other screen went through this component at 20px, so six pages
 * disagreed about how big a page title is. Figma's frames are Display/M, so
 * this component moved rather than Overview.
 *
 * prop because the four screens don't agree on what belongs there: an "Add"
 * button, a "+ new cv" button, a date-range picker, and here, nothing at all.
 *
 * `description` is one lowercase line under the title, saying what the screen
 * is for. It sits BELOW the title/action row rather than inside it, so a long
 * sentence never squeezes the action off the trailing edge, and it is a
 * sibling of the h1 rather than part of it -- a heading's accessible name
 * should be the page's name, not the name plus a sentence of prose.
 */
export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  /** One lowercase line saying what this screen is for. */
  description?: React.ReactNode
  action?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  action,
  className,
  ...props
}: PageHeaderProps) {
  return (
    // `min-w-0` on both boxes. A flex or grid item's automatic minimum size is
    // its content's, not zero, so this header refused to be narrower than the
    // `max-w-prose` description it contains -- 65ch, about 470px. On analytics,
    // where the header is a grid item beside a 176px range picker, that pinned
    // the whole page at ~600px and every screen below that scrolled sideways.
    // The description already wraps; it just needed permission to.
    //
    // `flex-wrap` on the title row is the other half. At 320px "analytics" plus
    // a 176px select plus the gap does not fit on one line, and without this
    // the two simply overlap the edge. Wrapping puts the control on its own
    // line, which is what the tier map asks for below 640 anyway.
    // `gap-1` is right for a title sitting directly above its own sentence.
    // It is NOT right once a full-width button joins the column below them:
    // 4px between a description and a primary CTA reads as one crowded block
    // rather than a heading, its explanation, and an action.
    //
    // Written mobile-first -- roomier base, tightened from `sm` -- rather than
    // as a `max-sm` override, matching CardHeader. Measured at 320px: 8px
    // title-to-description and 16px description-to-action, against 4px and
    // 4px before.
    <div
      data-body-header
      className={cn('flex min-w-0 flex-col gap-2 sm:gap-1', className)}
      {...props}
    >
      {/* ON A PHONE THE READING ORDER IS TITLE, DESCRIPTION, ACTION (Gabe,
          2026-09-06). It used to be title, action, description, which put a
          full-width primary button between a heading and the sentence
          explaining it -- the button interrupted its own explanation.
          `max-sm:contents` makes this row stop generating a box below 640, so
          its two children become items of the outer column and `order` can
          place them around the description. From `sm` it is the original row
          again, unchanged.

          NOTE: no sizing rules here. An earlier pass put `flex-col` on
          `[&>*:last-child]` to stack a pair of buttons, which on
          /applications -- where the slot is a single Button -- stacked that
          button's OWN icon above its own label. The slot is deliberately
          untyped, so the caller sizes what the caller passed. */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 max-sm:contents">
        <h1 className="min-w-0 text-display-m text-text-primary max-sm:order-1">{title}</h1>
        {action ? (
          // The extra `mt-2` is what separates the two RELATIONSHIPS in this
          // column: the description belongs to the title, the action does not
          // belong to either. A uniform gap says all three are one thing.
          <div className="min-w-0 max-sm:order-3 max-sm:mt-2 max-sm:w-full">{action}</div>
        ) : null}
      </div>
      {description ? (
        <p
          data-page-description
          className="max-w-prose text-body-s text-text-muted max-sm:order-2"
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}
