'use client'

import * as React from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalIcon, PlusIcon } from '@/components/icons'
import { ICON_MOTION_GROUP, iconMotion } from '@/components/icons/motion'
import { localDayKey } from '@/services/date'
import { parseDayKey } from '@/lib/calendar'
import { useAppHref } from '@/components/shell/routeBase'
import type { FeedFacet, FeedJob } from '@/services/jobFeed'

/**
 * Newly posted remote roles, grouped by the day they went up.
 *
 * WHY IT IS ON THE CALENDAR and not on /applications, which is where a job
 * board would normally live. Gabe asked for "an API for aggregating job posts"
 * as a calendar enhancement, and the fit is better than it first looks: this
 * screen is the app's only view of TIME, and a posting's most perishable
 * property is its age. Grouped by `pubDate` under a month grid, the panel
 * answers "what appeared while I was not looking" — which is the same question
 * the grid above answers about interviews. On /applications it would have been
 * a second list competing with the user's own.
 *
 * GROUPED BY DAY, USING THE SAME LOCAL-DAY KEY as the events above it. A
 * `pubDate` is a real instant, so bucketing it by its UTC date would file an
 * evening posting under the previous day for anybody ahead of UTC — the
 * defect `localDayKey` exists to prevent, applied to a third source now.
 *
 * EVERY ROW LINKS TO THE ORIGINAL POSTING, and that is a condition of use
 * rather than a design choice: Jobicy's own response asks that it be "clearly
 * credited with a direct link to the source, and all application buttons
 * redirect to the original job URL provided in this feed". The credit is in
 * the footer and the title is the link.
 *
 * `track it` DOES NOT COPY THE POSTING INTO THE DATABASE. It hands the URL to
 * the ordinary add flow, which reads the page with this app's own extractor —
 * so a tracked application is built from the employer's posting, not from a
 * third party's summary of it, and nothing here is stored on their behalf.
 */
export interface JobFeedProps {
  jobs?: FeedJob[]
  loading?: boolean
  error?: boolean
  /** The feed's own industry taxonomy. Empty means no filter is drawn. */
  industries?: FeedFacet[]
  industry?: string | null
  onIndustryChange?: (slug: string) => void
  /** The feed's geo taxonomy. Empty means no region filter is drawn. */
  locations?: FeedFacet[]
  geo?: string | null
  onGeoChange?: (slug: string) => void
  className?: string
}

/** `all` is a sentinel, not a slug: the API means "no industry filter". */
const ANY_INDUSTRY = 'all'

function formatPostedDay(key: string, today: string): string {
  if (key === today) return 'today'
  const date = parseDayKey(key)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === localDayKey(yesterday.toISOString())) return 'yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/**
 * `₱120,000 – ₱160,000`, or null.
 *
 * `Intl.NumberFormat` rather than a hand-rolled prefix: the feed reports a
 * currency per posting and most of them are USD, so a hardcoded peso sign
 * would misstate every one of them by a factor of about fifty-five.
 */
function formatBand(job: FeedJob): string | null {
  if (!job.salaryMin && !job.salaryMax) return null
  const money = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: job.salaryCurrency ?? 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  if (job.salaryMin && job.salaryMax) return `${money(job.salaryMin)} – ${money(job.salaryMax)}`
  return money((job.salaryMin ?? job.salaryMax) as number)
}

export function JobFeed({
  jobs = [],
  loading = false,
  error = false,
  industries = [],
  industry = null,
  onIndustryChange,
  locations = [],
  geo = null,
  onGeoChange,
  className,
}: JobFeedProps) {
  const appHref = useAppHref()
  const today = React.useMemo(() => localDayKey(new Date().toISOString()), [])

  return (
    // `@container/feed` is declared HERE, on the card, and queried by the cards
    // inside it. An element cannot query its own container, so the declaration
    // has to sit above the `@2xl/feed:` rules rather than beside them.
    // NO FRAME ON THE PANEL ITSELF (Gabe, 2026-09-10: "remove the background
    // color and border for that card only"). The rail is already a row of
    // bordered cards; boxing them inside a second box drew two borders 16px
    // apart and made the roles look nested inside something. The horizontal
    // padding goes with it, so the first role sits on the same left edge as
    // the month grid below rather than 16px inside it. The card's VERTICAL
    // rhythm is kept -- that is what still separates title, rail and credit.
    <Card
      className={cn('@container/feed border-0 bg-transparent py-0', className)}
      data-job-feed
    >
      {/* THE CAROUSEL WRAPS THE HEADER TOO, because its arrows live up there
          rather than floating over the first and last card. `CarouselPrevious`
          only works inside the provider, so the provider has to contain both.
          The card's own vertical rhythm is restated on it, since a wrapper
          between `Card` and its children would otherwise swallow the gap. */}
      <Carousel
        opts={{ align: 'start', dragFree: true, containScroll: 'trimSnaps' }}
        className="flex flex-col gap-(--card-spacing)"
      >
        <CardHeader className="px-0">
          <CardTitle icon="Applications">
            <h2>fresh remote roles</h2>
          </CardTitle>
          <CardDescription>
            what went up recently, newest first — track one and Worktrack reads the posting for
            you.
          </CardDescription>
          <CardAction>
            <div className="flex flex-wrap items-center gap-2">
              {/* WHERE, THEN WHAT. Region first because it is the filter that
                  decides whether the rail is usable at all: unfiltered, this
                  feed is overwhelmingly US-eligible, so somebody outside the
                  US was reading a list of roles they cannot take (Gabe,
                  2026-09-11). It opens on the reader's own country when the
                  feed lists one -- see `geoSlugForCountry`. */}
              {locations.length > 0 && (
                <div className="w-48 max-sm:w-full">
                  <Select
                    id="job-feed-geo"
                    icon="Globe"
                    aria-label="Filter roles by region"
                    value={geo ?? ANY_INDUSTRY}
                    onValueChange={(next) => onGeoChange?.(next)}
                    items={[
                      { value: ANY_INDUSTRY, label: 'anywhere' },
                      ...locations
                        .filter((facet) => facet.slug !== 'anywhere')
                        .map((facet) => ({ value: facet.slug, label: facet.name })),
                    ]}
                  />
                </div>
              )}
              {industries.length > 0 && (
                // Width on a wrapper, not on the Select: `Select`'s own root is
                // `w-full` and only its trigger takes `className`.
                <div className="w-52 max-sm:w-full">
                  <Select
                    id="job-feed-industry"
                    icon="Tag"
                    aria-label="Filter roles by field"
                    value={industry ?? ANY_INDUSTRY}
                    onValueChange={(next) => onIndustryChange?.(next)}
                    items={[
                      { value: ANY_INDUSTRY, label: 'every field' },
                      ...industries.map((facet) => ({ value: facet.slug, label: facet.name })),
                    ]}
                  />
                </div>
              )}
              <div className="flex shrink-0 items-center gap-2">
                <CarouselPrevious className="static translate-y-0" />
                <CarouselNext className="static translate-y-0" />
              </div>
            </div>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          {loading && (
            <div className="flex gap-4 overflow-hidden" data-job-feed-state="loading">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-36 w-72 shrink-0" />
              ))}
            </div>
          )}

          {/* A FAILED THIRD-PARTY READ IS NOT AN EMPTY BOARD. Saying "nothing
              posted" when the request never landed would be a claim about the
              job market made on the strength of a network error. */}
          {!loading && error && (
            <p className="text-body-s text-text-muted" data-job-feed-state="error">
              could not reach the job feed just now. the calendar below is unaffected.
            </p>
          )}

          {!loading && !error && jobs.length === 0 && (
            <p className="text-body-s text-text-muted" data-job-feed-state="empty">
              nothing posted here right now. try another region or field.
            </p>
          )}

          {!loading && !error && jobs.length > 0 && (
            // -ml-4 / pl-4 is the carousel's own gutter idiom: the track shifts
            // left by one gap so the first card sits flush with the card's
            // padding while every later one keeps its spacing.
            <CarouselContent className="-ml-4">
              {jobs.map((job) => {
                const band = formatBand(job)
                const facts = [job.geo, job.level].filter(Boolean).join(' · ')
                return (
                  <CarouselItem key={job.id} className="basis-auto pl-4">
                    {/* THE ROLE CARD KEEPS ITS FILL (Gabe, 2026-09-10:
                        "background color for the job card must not be removed
                        since it highlights everything"). Unframing the PANEL
                        took the fill out from under these too, because they had
                        been inheriting `bg-card` from it -- so the rail went
                        from a row of cards to a row of outlines on the page
                        ground. `bg-card` is stated on the card itself now,
                        which is where it should always have been: it is what
                        makes one role read as one object. */}
                    <article
                      data-feed-role
                      className="flex h-full w-72 flex-col justify-between gap-3 rounded-md border border-border-subtle bg-card p-4"
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="text-label-caps uppercase text-text-muted">
                          {formatPostedDay(localDayKey(job.publishedAt), today)}
                        </p>
                        {/* `rel="noreferrer"` and a new tab: this is somebody
                            else's site, reached from a list somebody else
                            wrote. `line-clamp-2` because a board title runs to
                            "Freelance Product and Brand Designers – Join Our
                            Network" and every card in a rail is one height. */}
                        {/* THE GLYPH IS A SIBLING OF THE CLAMP, not inside it.
                            Inline after the text it was pushed onto a second
                            line whenever the title did not leave room for it on
                            the first -- so a one-line title rendered as a line
                            of words and a line holding one 14px icon. */}
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            ICON_MOTION_GROUP,
                            'flex items-start gap-1.5 text-body-m text-text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default'
                          )}
                        >
                          <span className="line-clamp-2 min-w-0">{job.title}</span>
                          <ExternalIcon
                            size={14}
                            aria-hidden
                            className={cn('mt-1 shrink-0 text-text-muted', iconMotion('forward'))}
                          />
                        </a>
                        <p className="truncate text-body-s text-text-secondary">{job.company}</p>
                        {facts && <p className="truncate text-caption text-text-muted">{facts}</p>}
                      </div>

                      <div className="flex flex-col gap-2">
                        {band && <p className="tabular text-caption text-text-muted">{band}</p>}
                        {/* THE URL, NOT THE ROW. `?add=` opens the ordinary add
                            wizard on its first step with the address filled in;
                            the app then reads the employer's own page. Nothing
                            from this feed is written to the database. */}
                        <Link
                          href={appHref(`/applications?add=${encodeURIComponent(job.url)}`)}
                          className={cn(
                            ICON_MOTION_GROUP,
                            'inline-flex items-center gap-1.5 self-start whitespace-nowrap text-body-s text-accent-default hover:underline'
                          )}
                        >
                          <PlusIcon size={14} aria-hidden className={iconMotion('open')} />
                          track it
                        </Link>
                      </div>
                    </article>
                  </CarouselItem>
                )
              })}
            </CarouselContent>
          )}

          {/* ATTRIBUTION, AS THE FEED ASKS FOR IT. Not a footnote this app is
              free to drop: every response repeats the request in a
              `friendlyNotice` field. */}
          <p className="border-t border-border-subtle pt-3 text-caption text-text-muted">
            Remote roles from{' '}
            <a
              href="https://jobicy.com"
              target="_blank"
              rel="noreferrer"
              className="text-accent-default underline-offset-4 hover:underline"
            >
              Jobicy
            </a>
            . Worktrack shows them; it does not store them.
          </p>
        </CardContent>
      </Carousel>
    </Card>
  )
}
