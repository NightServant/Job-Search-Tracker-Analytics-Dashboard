'use client'

import * as React from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { jobStats, sourceBreakdown } from '@/lib/overviewSeries'
import type { Job } from '@/types'

/** Six is what fits a third of a row without the labels colliding. */
const MAX_SOURCES = 6

/**
 * Where the applications came from, as horizontal bars.
 *
 * WHY SOURCE AND NOT STATUS, which is the obvious choice and is the wrong one
 * HERE. The status tabs sit about a hundred pixels under this card and already
 * print all five counts; a status donut in this slot would be the same five
 * numbers twice on one screen, which is decoration wearing a chart's clothes.
 * Source is the one dimension of an application this screen never shows —
 * the table's columns are company, position, status, salary and applied-on —
 * and "which channel is actually producing these" is a real question to ask
 * while looking at the list. The Overview's `by source` panel names only the
 * top two and a tail; this draws the actual distribution.
 *
 * HORIZONTAL, because the labels are words. `Jobstreet`, `Cloudstaff`,
 * `unknown` set under vertical bars in a third of a row would each be rotated
 * or truncated; along the y axis they are simply read.
 */
function SourceBars({ jobs }: { jobs: Job[] }) {
  const reducedMotion = usePrefersReducedMotion()
  const data = React.useMemo(() => sourceBreakdown(jobs, MAX_SOURCES), [jobs])

  if (data.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-8" data-sources-empty>
        <p className="max-w-prose text-center text-body-s text-text-muted">
          Nothing to plot yet. Add an application and this fills in by source.
        </p>
      </div>
    )
  }

  return (
    // A LOW FLOOR AND `flex-1`, the same rule the analytics charts follow: the
    // plot follows the card rather than setting the row's height -- and here
    // the floor is lower than anywhere else in the app for a specific reason.
    // This band sits inside a FIXED FRAME (see `useViewportFit` on the
    // applications screen): the page does not scroll, the table does, so every
    // pixel this card takes is a row off the list underneath it. 128px still
    // draws six legible bars; 224px, the analytics floor, cost three rows.
    <div className="min-h-32 w-full flex-1" data-chart-sources-bars>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
        >
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="source"
            width={88}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-bg-inset)' }}
            contentStyle={{
              background: 'var(--color-bg-canvas)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 4,
            }}
            formatter={(value) => [`${Number(value)}`, 'applications']}
          />
          <Bar
            dataKey="count"
            fill="var(--color-accent-default)"
            isAnimationActive={!reducedMotion}
            radius={[0, 2, 2, 0]}
            maxBarSize={24}
          >
            {/* THE LEADER TAKES THE ACCENT AND THE REST SIT BACK. Six bars in
                one colour is a ranking nobody has to read twice; six bars in
                six colours invents five distinctions that do not exist. The
                accent means "this is the one", exactly as it does on the nav
                and the status marker. */}
            {data.map((row, index) => (
              <Cell key={row.source} fillOpacity={index === 0 ? 1 : 0.35} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * The band above the applications toolbar: one chart and four numbers (Gabe,
 * 2026-09-10 — "left column with 1/3 width" / "four appropriate statistics
 * cards, two column layout, right column with 2/3 width").
 *
 * THE THIRDS ARE A REAL THIRD, not a flex guess: `xl:grid-cols-3` with the
 * card block taking `col-span-2`. The split arrives at `xl` rather than `lg`
 * for the reason recorded on the Overview and Analytics — the sidebar expands
 * at 1024 and takes back exactly the width that breakpoint just handed over,
 * so a three-column split at `lg` lands the chart in about 230px. Below `xl`
 * the chart takes the full width and the four cards stay two-up, which is
 * what keeps this band about 400px tall on a tablet instead of 900.
 *
 * THE FOUR NUMBERS ARE THIS SCREEN'S, not the Overview's four. Both read
 * `jobStats`, so they can never disagree, but the questions differ: the
 * Overview asks how the search is going, and a list screen asks what is in
 * the list and what it is waiting on.
 */
export function ApplicationsInsights({ jobs }: { jobs: Job[] }) {
  const stats = React.useMemo(() => jobStats(jobs), [jobs])

  return (
    <section data-applications-insights className="grid gap-section xl:grid-cols-3">
      <Card className="xl:col-span-1">
        <CardHeader>
          <CardTitle icon="External">
            <h2>by source</h2>
          </CardTitle>
          <CardDescription>which channels these actually came from.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <SourceBars jobs={jobs} />
        </CardContent>
      </Card>

      <div className="grid gap-section sm:grid-cols-2 xl:col-span-2">
        <StatCard
          icon="Applications"
          label="tracked"
          value={stats.total}
          detail={
            stats.wishlist > 0
              ? `${stats.sent} sent, ${stats.wishlist} on the wishlist`
              : `${stats.sent} sent`
          }
        />
        <StatCard
          icon="Clock"
          label="waiting on a reply"
          value={stats.awaitingReply}
          detail={
            stats.oldestWaitDays === null
              ? 'nothing outstanding'
              : `the oldest for ${stats.oldestWaitDays} days`
          }
        />
        <StatCard
          icon="Calendar"
          label="interviewing"
          value={stats.interviewing}
          detail={stats.offers > 0 ? `${stats.offers} at offer` : 'no offers yet'}
        />
        <StatCard
          icon="Analytics"
          label="success rate"
          value={`${stats.responseRate}%`}
          detail={
            stats.sent > 0 ? `${stats.responded} of ${stats.sent} heard back` : 'nothing sent yet'
          }
        />
      </div>
    </section>
  )
}
