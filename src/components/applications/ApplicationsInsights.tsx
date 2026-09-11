'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LazyPanel } from '@/components/ui/lazy-panel'
import { StatCard } from '@/components/ui/stat-card'
import { jobStats } from '@/lib/overviewSeries'
import type { Job } from '@/types'

/**
 * THE CHART IS CODE-SPLIT (2026-09-11), and on this screen it matters most:
 * /applications is the page people live on, and recharts was in its first-load
 * bundle for one panel above the table.
 *
 * `ssr: false` for the same two reasons as the Overview's -- recharts cannot
 * draw without measuring, and its `useId`-derived chart id was a hydration
 * mismatch on every load.
 */
const SourceBars = dynamic(() => import('./SourceBars').then((m) => m.SourceBars), {
  ssr: false,
  loading: () => <LazyPanel height="h-32" label="the source breakdown" />,
})

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
