'use client'

import * as React from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { CardDescription, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselRow,
} from '@/components/ui/carousel'
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
        {/* THE SAME TITLE AND SUBTITLE AS `fresh remote roles` BELOW IT (Gabe,
            2026-09-13: "match the 'up next' title and description typography to
            fresh remote jobs"). These were hand-set here -- `text-heading-s`
            over `text-body-s text-text-muted` -- while the roles band used
            `CardTitle` / `CardDescription`, so two sibling bands on one screen
            announced themselves at two different weights and sizes. Borrowing
            the components rather than copying their classes is what keeps them
            matched the next time either one moves; `CardTitle` and
            `CardDescription` are plain styled boxes with no Card required. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <CardTitle icon="Clock">
              <h2>up next</h2>
            </CardTitle>
            <CardDescription>
              what is booked, and what has gone quiet for more than {QUIET_AFTER_DAYS} days.
            </CardDescription>
          </div>
        </div>

        {/* AN EMPTY ACCOUNT IS A REAL STATE AND IT IS GOOD NEWS. Nothing booked
            and nothing overdue is the state somebody wants to be in, so it
            says so rather than apologising or inventing a placeholder card.

            IT IS `EmptyState` NOW, not a loose muted sentence (Gabe,
            2026-09-13). One line of grey type under a heading is the shape a
            FAILED read takes as well, so the rail's best state and its worst
            one rendered identically -- the exact confusion `EmptyState` was
            built to end. The glyph gives the eye something to land on in a
            band that is otherwise 120px of nothing. `py-10`, half its default:
            this is one band on a page, not the whole screen. */}
        {items.length === 0 ? (
          <EmptyState icon="Calendar" className="py-10" data-up-next-empty>
            nothing booked, and nothing waiting longer than {QUIET_AFTER_DAYS} days. the month
            below is clear.
          </EmptyState>
        ) : (
          /* THE ARROWS FLANK THE RAIL now rather than sitting on the heading
             row (Gabe, 2026-09-15). One arrangement for every carousel in the
             app -- see `CarouselRow` in ui/carousel.

             The "only when there is a rail" rule survives the move and is now
             structural rather than a condition: the row is the populated
             branch of this ternary, so the empty state above it has no
             controls to disable. */
          <CarouselRow>
            <CarouselPrevious />
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
            <CarouselNext />
          </CarouselRow>
        )}
      </Carousel>
    </section>
  )
}
