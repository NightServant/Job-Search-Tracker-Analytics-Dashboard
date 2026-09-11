'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { type IconName } from '@/components/icons'
import type { UserProfile } from '@/services/profile'
import { initialsOf } from './initials'

/**
 * The frame a profile is drawn in: sections, identity, loading, facets.
 *
 * THE OTHER HALF OF THE SPLIT from `profileEntries` (2026-09-11). These four
 * are the containers -- a card with a heading and a count, the banner at the
 * top, the skeleton before anything arrives, and the small labelled block the
 * facets use. None of them knows what goes inside; all of them are about where
 * it sits.
 *
 * `initialsOf` IS SHARED WITH THE ENTRIES and imported rather than duplicated:
 * `OrgTile` needs a letter for an organisation and `Identity` needs one for a
 * person, and two copies of that would drift the first time somebody decided
 * three initials were better than two.
 */

/**
 * One section of the profile, as a card (Gabe, 2026-09-10).
 *
 * THE SECTIONS WERE HAIRLINE-SEPARATED BLOCKS and are now boxed. That is a
 * deliberate departure from this system's default -- separation here is
 * normally a rule, never a border -- and it is the same departure the
 * Overview already runs on: Gabe asked for the card component on these
 * screens specifically. What does NOT change is the rest of the grammar. The
 * radius still caps at 4px, there is still no shadow anywhere, and the card
 * carries a hairline border rather than a ring.
 *
 * WHY IT READS BETTER HERE. A profile is a list of unrelated lists -- four
 * roles, then two degrees, then eight certificates -- and a rule between them
 * says only "a new thing starts". A box says how far the thing extends, which
 * is the question a reader scanning for their education actually has.
 *
 * The count rides in the title rather than under it, so a list never hides
 * its own length.
 */
export function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string
  icon: IconName
  count?: number
  children: React.ReactNode
}) {
  return (
    <Card aria-label={title} data-profile-section={title}>
      <CardHeader>
        <CardTitle icon={icon}>
          <h3>{title}</h3>
          {count !== undefined && count > 0 && (
            <span className="tabular text-body-s font-normal text-text-muted">({count})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/**
 * The identity: cover band, overlapping avatar, name, headline, place.
 *
 * THE OVERLAP IS THE WHOLE GESTURE and it is what makes this read as a profile
 * rather than as a row with a picture. `-mt-10` pulls the avatar up over the
 * band by half its height; the band's own height is what reserves the space
 * that pull takes back, so nothing collides at any width.
 */
export function Identity({ profile, action }: { profile: UserProfile; action?: React.ReactNode }) {
  const place = [profile.location, profile.industry].filter(Boolean).join(' · ')
  return (
    <Card className="gap-0 py-0" data-profile-banner>
      {/* A FLAT FIELD, NOT A PICTURE. There is no cover image in any source
          this app has, and generating one would be decoration pretending to be
          data. `accent-surface` is the token for a field of accent -- the same
          one the applications table's header band and the calendar's weekday
          row wear -- so this belongs to the app rather than to LinkedIn. */}
      <div aria-hidden className="h-16 bg-accent-surface @sm/profile:h-20" />

      <div className="flex flex-col gap-4 p-4 @sm/profile:p-5">
        <div className="-mt-10 flex flex-col gap-3 @sm/profile:-mt-12">
          <Avatar className="size-16 shrink-0 border-2 border-bg-canvas @sm/profile:size-20">
            {profile.pictureUrl && (
              <AvatarImage src={profile.pictureUrl} alt="" referrerPolicy="no-referrer" />
            )}
            <AvatarFallback className="bg-bg-surface text-body-l text-text-secondary">
              {initialsOf(profile.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="break-words text-heading-m text-text-primary">
              {profile.name ?? 'unnamed'}
            </h3>
            {/* THE HEADLINE GETS A MEASURE, NOT A LINE. Out of LinkedIn it is
                routinely a whole sentence about what someone is looking for. */}
            {profile.headline && (
              <p className="max-w-prose text-body-m leading-[1.5] text-text-secondary">
                {profile.headline}
              </p>
            )}
            {place && <p className="text-body-s text-text-muted">{place}</p>}
          </div>
        </div>

        {action}
      </div>
    </Card>
  )
}

export function Loading() {
  return (
    <div className="flex flex-col gap-4" data-profile-state="loading">
      <Card className="gap-0 py-0">
        <Skeleton className="h-16 w-full rounded-none sm:h-20" />
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <Skeleton className="-mt-10 size-16 rounded-full sm:-mt-12 sm:size-20" />
          <Skeleton className="h-4 w-40 max-w-full" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      </Card>
      <Card>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}


export function Facet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-label-caps uppercase text-text-secondary">{title}</p>
      {children}
    </div>
  )
}
