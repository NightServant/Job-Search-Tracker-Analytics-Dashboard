'use client'

import * as React from 'react'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AlertCircleIcon, type IconName } from '@/components/icons'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * One query's worth of state, mirroring what a react-query result carries.
 * Kept as a plain shape (rather than importing `UseQueryResult`) so this
 * component has no react-query dependency of its own -- `page.tsx` is the
 * only file that touches the hooks, matching ruling D.
 */
export interface MetricState<T> {
  data: T | null
  isLoading: boolean
  error: unknown
}

/**
 * How ONE analytics panel renders: its frame, and its four states.
 *
 * SPLIT OUT OF `Analytics.tsx` ON 2026-09-11 (537 lines). The seam is the same
 * one `ProfileGroup` was cut along and it is not state -- it is what the code
 * DRAWS. These four answer "what does a single panel look like while it is
 * loading, when it failed, when it has nothing, and when it has data"; what is
 * left in Analytics.tsx answers "which panels exist and in what order".
 *
 * THE ERROR BRANCH IS THE REASON `AnalyticsPanel` EXISTS AT ALL and is worth
 * not losing in a move. Gabe asked for the card component on this screen, but
 * `PanelSection` supplied a failed-read state distinct from an empty one,
 * which M5's Task 5 needed a fix round to get right. Swapping to a bare Card
 * would have quietly dropped that distinction, so it moved here instead of
 * disappearing.
 */

export function AnalyticsPanel({
  title,
  icon,
  description,
  action,
  error,
  children,
}: {
  title: string
  /** A muted glyph before the heading -- see CardTitle. Names the panel; never decoration. */
  icon?: IconName
  /** One lowercase line saying what the panel answers. */
  description?: string
  action?: React.ReactNode
  error?: string
  children: React.ReactNode
}) {
  return (
    // data-analytics-panel because Card renders a div where PanelSection
    // rendered a <section>. An unnamed <section> is not a landmark, so nothing
    // in the accessibility tree is lost -- but the panel boundary still has to
    // be addressable, by tests and by anything that needs to scope a query to
    // one panel.
    <Card data-analytics-panel className="h-full">
      <CardHeader>
        {/* An <h2> inside CardTitle, not instead of it: CardTitle renders a
            div, so converting these panels to Cards silently removed every
            panel heading from the accessibility tree and from the document
            outline. Tailwind's preflight resets heading size and weight to
            inherit, so this is semantics at zero visual cost. */}
        <CardTitle icon={icon}>
          <h2>{title}</h2>
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {error ? (
          <p className="flex items-center gap-2 text-body-s text-status-rejected-mark">
            <AlertCircleIcon size={16} aria-hidden className="[&_svg]:size-4" />
            {error}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}



export function Span({ children }: { children: React.ReactNode }) {
  return <span className="text-body-s text-text-muted">{children}</span>
}

export function PanelBody({
  state,
  empty,
  render,
}: {
  state: MetricState<unknown>
  empty: boolean
  render: () => React.ReactNode
}) {
  if (state.isLoading) {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">loading</span>
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (empty) {
    return (
      <EmptyState icon="Analytics">
        not enough data yet. this fills in as applications move through the pipeline.
      </EmptyState>
    )
  }
  return <>{render()}</>
}
