'use client'

import * as React from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { ClockIcon } from '@/components/icons'
import { ICON_MOTION_GROUP } from '@/components/icons/motion'
import { useAppHref } from '@/components/shell/routeBase'
import { QUIET_AFTER_DAYS, type UpNextItem } from '@/lib/upNext'

/**
 * The planner's first band: what is booked, and what has gone quiet.
 *
 * A RAIL, NOT A LIST (Gabe, 2026-09-11: "implement horizontal layout"). The
 * vertical version stacked six day-grouped rows down the left third of a
 * 1500px screen and left the other two thirds empty -- a list of short lines
 * pretending to be a page section. Horizontal, the same six items are one card
 * tall and the width is doing work.
 *
 * IT SITS ABOVE THE MONTH AND ABOVE THE ROLES. Both of the other bands on this
 * screen are things to look at; this is the only one that is a list of things
 * to DO, so it opens the page. That does push `fresh remote roles` down one
 * band -- a deliberate call, and a one-line swap if it reads wrong: your own
 * commitments outrank a third-party job board.
 *
 * TWO KINDS OF CARD, and the difference is carried by the label rather than by
 * colour. A booked event has a clock on it; a chase has an age. The system
 * paints status in five reserved hues and this is not a status, so neither
 * card is tinted -- the accent marks only the action, which is the link out.
 */
export interface UpNextProps {
  items?: UpNextItem[]
  className?: string
}

/** `Sat 12 Sep · 10:00 AM`, in the reader's own zone. */
function formatWhen(iso: string): string {
  const at = new Date(iso)
  const day = at.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${day} · ${time}`
}

/** How far off it is, in the words somebody would actually use. */
function formatLead(iso: string, now: Date): string | null {
  const days = Math.round(
    (new Date(new Date(iso).toDateString()).getTime() - new Date(now.toDateString()).getTime()) /
      (24 * 60 * 60 * 1000)
  )
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days <= 14) return `in ${days} days`
  return null
}

export function UpNext({ items = [], className }: UpNextProps) {
  const appHref = useAppHref()
  const now = React.useMemo(() => new Date(), [])

  return (
    <section
      data-up-next
      aria-label="Up next"
      className={cn('flex flex-col gap-3', className)}
    >
      <Carousel
        opts={{ align: 'start', dragFree: true, containScroll: 'trimSnaps' }}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="flex items-center gap-2 text-heading-s text-text-primary">
              <ClockIcon size={16} aria-hidden className="shrink-0 text-text-muted" />
              up next
            </h2>
            <p className="text-body-s text-text-muted">
              what is booked, and what has gone quiet for more than {QUIET_AFTER_DAYS} days.
            </p>
          </div>
          {items.length > 0 && (
            <div className="flex shrink-0 items-center gap-2">
              <CarouselPrevious className="static translate-y-0" />
              <CarouselNext className="static translate-y-0" />
            </div>
          )}
        </div>

        {/* AN EMPTY ACCOUNT IS A REAL STATE AND IT IS GOOD NEWS. Nothing booked
            and nothing overdue is the state somebody wants to be in, so it
            gets a sentence rather than an apology or an invented placeholder
            card. */}
        {items.length === 0 ? (
          <p className="text-body-s text-text-muted" data-up-next-empty>
            nothing booked, and nothing waiting longer than {QUIET_AFTER_DAYS} days. the month
            below is clear.
          </p>
        ) : (
          <CarouselContent className="-ml-4">
            {items.map((item) => {
              const lead = item.at ? formatLead(item.at, now) : null
              return (
                <CarouselItem key={item.id} className="basis-auto pl-4">
                  <article
                    data-up-next-card
                    data-kind={item.kind}
                    className="flex h-full w-64 flex-col justify-between gap-3 rounded-md border border-border-subtle bg-card p-4"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="flex items-baseline gap-2 text-label-caps uppercase text-text-muted">
                        {item.label}
                        {lead && <span className="font-normal normal-case">{lead}</span>}
                      </p>
                      <p className="line-clamp-2 text-body-m text-text-primary">{item.title}</p>
                      {item.company && (
                        <p className="truncate text-body-s text-text-secondary">{item.company}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <p className="tabular text-caption text-text-muted">
                        {item.at
                          ? formatWhen(item.at)
                          : `no reply for ${item.quietDays} days`}
                      </p>
                      {/* THE WHOLE POINT OF THE CARD. Every item here belongs
                          to an application, and the thing you do about it --
                          chase it, prepare for it, mark it rejected -- happens
                          in the record. A card you cannot act from is a
                          notification. */}
                      {item.jobId && (
                        <Link
                          href={appHref(`/applications?application=${item.jobId}`)}
                          className={cn(
                            ICON_MOTION_GROUP,
                            'inline-flex items-center gap-1.5 self-start whitespace-nowrap text-body-s text-accent-default hover:underline'
                          )}
                        >
                          open the application
                        </Link>
                      )}
                    </div>
                  </article>
                </CarouselItem>
              )
            })}
          </CarouselContent>
        )}
      </Carousel>
    </section>
  )
}
