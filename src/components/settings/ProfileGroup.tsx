'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { icons, type IconName } from '@/components/icons'
import { EMPTY_PROFILE, hasProfileContent, type UserProfile } from '@/services/profile'

/**
 * Settings -> Profile: who you are, as the CV tools see you.
 *
 * IT RENDERS A `UserProfile` AND HAS NO OPINION ABOUT WHERE IT CAME FROM.
 * That has been worth it three times over: this screen outlived a Composio
 * connector, a page scraper and a CSV importer without changing shape, and the
 * Apify route plugged in by filling the same type.
 *
 * THE LAYOUT IS LINKEDIN'S, at Gabe's instruction (2026-09-10, with his own
 * profile side by side with this panel). That is a real design decision rather
 * than mimicry for its own sake: this data came FROM a LinkedIn profile, and a
 * person checking whether the import got it right is comparing two screens.
 * Every difference in shape between them is a difference they have to hold in
 * their head while they read. So:
 *
 *   A COVER BAND AND AN OVERLAPPING AVATAR open it, the way a profile does.
 *     There is no cover image to show and inventing one would be decoration,
 *     so the band is a flat accent-surface field -- the same token the tables
 *     and the calendar header wear. It is a place, not a picture.
 *   STACKED CARDS, one per kind of content, each with its own heading and
 *     count -- which is what LinkedIn does too. These were hairline-separated
 *     blocks until 2026-09-10; see `Section` below for why the box earns its
 *     place on this particular screen and what stays unchanged (radius, no
 *     shadow, hairline border).
 *   A SQUARE TILE LEADS EVERY ENTRY, where LinkedIn puts a company logo. We
 *     have no logos and will not fetch them, so it carries the organisation's
 *     initial. Square, not round: round is a person, square is an institution,
 *     and that distinction is doing real work two inches under a round avatar.
 *
 * WHAT IS DELIBERATELY NOT COPIED: the radius (this system caps at 4px and
 * LinkedIn's cards are 8), the drop shadows (there are none anywhere here),
 * and the blue. The accent is orange and a status is never a pill.
 *
 * CERTIFICATIONS AND PROJECTS ARE BULLETED LISTS, also at Gabe's instruction.
 * They earn it and the other two sections do not: a role and a degree are
 * dated records with bodies, read one at a time, while a certificate is one
 * line and a project is close to it. Setting eight certificates as eight
 * bordered records makes a short list look like a long one.
 *
 * BY CONTAINER, NOT VIEWPORT, throughout. This panel is full width on the
 * settings page today and sits inside a tab that could narrow tomorrow; a
 * viewport query would keep two columns after the panel itself had stopped
 * being wide enough for them.
 *
 * THE PHOTO IS RENDERED NOW. The docblock here used to say "NO PHOTO -- the
 * export is CSVs and carries no image", which stopped being true the moment
 * the Apify route landed and started returning `profilePicture`. Initials
 * remain the fallback, which is honest for a source that has none.
 */

export type ProfileState =
  | { status: 'loading' }
  | { status: 'ready'; profile: UserProfile }
  | { status: 'empty'; message: string }

export interface ProfileGroupProps {
  state: ProfileState
  /**
   * The import control.
   *
   * It moves: in the empty state it IS the call to action and sits under the
   * steps; once a profile exists it drops under the identity, where a
   * re-fetch reads as maintenance rather than as the next thing to do.
   */
  source?: React.ReactNode
  /** How to get a profile. Shown only when there is none yet. */
  steps?: React.ReactNode
}

function initialsOf(name: string | null): string {
  const parts = (name ?? '').split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

/**
 * The square tile that stands in for a company logo.
 *
 * SQUARE IS THE POINT. LinkedIn puts a logo here and we have none; a second
 * round avatar would read as another person, and this is an institution. One
 * letter on a hairline-bordered square says "an organisation" without
 * pretending to be its mark.
 */
function OrgTile({ name, icon }: { name: string | null; icon: IconName }) {
  const Icon = icons[icon]
  return (
    <span
      aria-hidden
      data-org-tile
      className="grid size-11 shrink-0 place-items-center rounded-md border border-border-subtle bg-bg-surface text-body-m text-text-secondary @sm/profile:size-12"
    >
      {name ? initialsOf(name) : <Icon size={18} className="text-text-muted" />}
    </span>
  )
}

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
function Section({
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

interface RecordRow {
  lead: string
  detail: string | null
  period: string | null
  meta?: string | null
  body?: string | null
  /**
   * The organisation the tile stands for, named explicitly.
   *
   * IT CANNOT BE INFERRED from `lead` and `detail`, and inferring it was
   * wrong: on an experience the organisation is the SUBTITLE (the employer,
   * under the job title) and on an education it is the LEAD (the school, above
   * the degree). Taking whichever was present produced a "BC" tile beside
   * Tarlac State University -- initials of "BS, Computer Science".
   */
  org: string | null
}

/**
 * Experience and education: a dated record with a body, read one at a time.
 *
 * THE TILE, THE STACK, THE DATE ON THE RIGHT -- LinkedIn's own arrangement,
 * and it scans faster than three stacked lines because one column answers
 * "what" and the other "when". Below the container's `sm` the date drops under
 * the title, where two columns would leave the role about 120px wide.
 */
function Records({
  rows,
  icon,
}: {
  rows: RecordRow[]
  icon: IconName
}) {
  return (
    <ul className="flex flex-col">
      {rows.map((row, index) => (
        <li
          key={`${row.lead}-${index}`}
          className="flex gap-3 border-b border-border-subtle py-4 first:pt-0 last:border-b-0 last:pb-0 @sm/profile:gap-4"
          data-profile-record
        >
          <OrgTile name={row.org} icon={icon} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-col gap-0.5 @md/profile:flex-row @md/profile:items-baseline @md/profile:justify-between @md/profile:gap-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                {/* THE TITLE IS THE BOLD LINE, as on a CV and on LinkedIn.
                    It can be empty: a signed-out LinkedIn profile routinely
                    withholds the job title, so the employer takes the lead
                    line rather than leaving a blank one above it. */}
                <p className="break-words text-body-m font-medium text-text-primary">
                  {row.lead || row.detail || 'untitled'}
                </p>
                {row.lead && row.detail && (
                  <p className="break-words text-body-s text-text-secondary">{row.detail}</p>
                )}
              </div>
              {row.period && (
                <p className="tabular shrink-0 text-caption text-text-muted @md/profile:text-right">
                  {row.period}
                </p>
              )}
            </div>
            {row.meta && <p className="text-caption text-text-muted">{row.meta}</p>}
            {/* `whitespace-pre-line` so the source's own line breaks survive --
                the bullets under a role are the point of importing it. */}
            {row.body && (
              <p className="whitespace-pre-line text-body-s leading-[1.6] text-text-secondary">
                {row.body}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

interface BulletRow {
  lead: string
  detail: string | null
  period: string | null
  body?: string | null
  href?: string | null
}

/**
 * Certifications and projects, as an actual bulleted list (Gabe, 2026-09-10).
 *
 * WHY THESE TWO AND NOT THE OTHER TWO. A role and a degree are dated records
 * with paragraphs under them; a certificate is one line and a project is
 * close to it. Eight certificates set as eight bordered records makes a short
 * list look like a long one and buries the two that matter.
 *
 * A REAL `list-disc` LIST, not a stack of rows with a glyph in front. The
 * marker is the browser's, the indent is the browser's, and a screen reader
 * announces "list, 4 items" -- which a div wearing a bullet character does
 * not.
 */
function Bullets({ rows }: { rows: BulletRow[] }) {
  return (
    <ul className="flex list-disc flex-col gap-3 pl-5 marker:text-text-muted">
      {rows.map((row, index) => (
        <li key={`${row.lead}-${index}`} className="pl-1" data-profile-bullet>
          <div className="flex flex-col gap-0.5 @md/profile:flex-row @md/profile:items-baseline @md/profile:justify-between @md/profile:gap-4">
            <p className="min-w-0 break-words text-body-m text-text-primary">
              {row.href ? (
                <a
                  href={row.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-default underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default"
                >
                  {row.lead}
                </a>
              ) : (
                row.lead
              )}
              {row.detail && (
                <span className="text-text-secondary">
                  {' — '}
                  {row.detail}
                </span>
              )}
            </p>
            {row.period && (
              <p className="tabular shrink-0 text-caption text-text-muted @md/profile:text-right">
                {row.period}
              </p>
            )}
          </div>
          {row.body && (
            <p className="mt-1 whitespace-pre-line text-body-s leading-[1.6] text-text-secondary">
              {row.body}
            </p>
          )}
        </li>
      ))}
    </ul>
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
function Identity({ profile, action }: { profile: UserProfile; action?: React.ReactNode }) {
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

function Loading() {
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

export function ProfileGroup({ state, source, steps }: ProfileGroupProps) {
  const profile = state.status === 'ready' ? state.profile : EMPTY_PROFILE
  const ready = state.status === 'ready'

  const facets =
    profile.skills.length > 0 ||
    profile.languages.length > 0 ||
    profile.websites.length > 0 ||
    !!profile.address ||
    !!profile.birthDate

  return (
    <div data-settings-group="profile" className="@container/profile">
      {state.status === 'loading' && <Loading />}

      {/* NO SECOND "profile" HEADING over the stack. The tab above already
          says profile and the page above that says settings; a third one
          between them named the same thing was a level of hierarchy with
          nothing in it. Each card now carries its own heading, which is the
          same shape the general tab has. */}
      {state.status === 'empty' && (
        <Card data-profile-state="empty">
          <CardHeader>
            <CardTitle icon="UserRound">
              <h3>profile</h3>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="max-w-prose text-body-m leading-[1.6] text-text-secondary">
              {state.message}
            </p>
            {steps}
            {source}
          </CardContent>
        </Card>
      )}

      {ready && (
      <div className="flex flex-col gap-6" data-profile-state="ready">
        <Identity profile={profile} action={source} />

        {/* ABOUT IS ITS OWN SECTION, as it is on LinkedIn, rather than a
            paragraph welded to the identity block. It is prose about a
            person and it belongs with the other things they wrote, not
            with their name and their photo. */}
        {profile.summary && (
          <Section title="about" icon="Info">
            <p className="max-w-prose whitespace-pre-line text-body-m leading-[1.6] text-text-secondary">
              {profile.summary}
            </p>
          </Section>
        )}

        {profile.experiences.length > 0 && (
          <Section title="experience" icon="Briefcase" count={profile.experiences.length}>
            <Records
              icon="Briefcase"
              rows={profile.experiences.map((e) => ({
                lead: e.title,
                detail: e.company,
                org: e.company,
                period: e.period,
                meta: e.location,
                body: e.description,
              }))}
            />
          </Section>
        )}

        {profile.education.length > 0 && (
          <Section title="education" icon="Documents" count={profile.education.length}>
            <Records
              icon="Documents"
              rows={profile.education.map((e) => ({
                lead: e.school,
                detail: e.degree,
                org: e.school,
                period: e.period,
              }))}
            />
          </Section>
        )}

        {profile.certifications.length > 0 && (
          <Section
            title="licenses & certifications"
            icon="ShieldCheck"
            count={profile.certifications.length}
          >
            <Bullets
              rows={profile.certifications.map((c) => ({
                lead: c.name,
                detail: c.authority,
                period: c.period,
              }))}
            />
          </Section>
        )}

        {profile.projects.length > 0 && (
          <Section title="projects" icon="Code" count={profile.projects.length}>
            <Bullets
              rows={profile.projects.map((p) => ({
                lead: p.title,
                detail: null,
                period: null,
                body: p.description,
                href: p.url,
              }))}
            />
          </Section>
        )}

        {facets && (
          <Section title="details" icon="Tag">
            {/* THE SHORT LISTS SHARE A ROW once there is width for it.
                Each is looked up rather than read, so four of them in
                one column is three scrolls for four facts. */}
            <div className="grid gap-5 @lg/profile:grid-cols-2 @3xl/profile:grid-cols-3">
              {profile.skills.length > 0 && (
                <Facet title="skills">
                  {/* Comma-joined prose, not chips: the system forbids
                      pills, and forty skills as forty boxes is a wall
                      either way. */}
                  <p className="text-body-s leading-[1.6] text-text-secondary">
                    {profile.skills.join(', ')}
                  </p>
                </Facet>
              )}
              {profile.languages.length > 0 && (
                <Facet title="languages">
                  <p className="text-body-s text-text-secondary">
                    {profile.languages.join(', ')}
                  </p>
                </Facet>
              )}
              {profile.websites.length > 0 && (
                <Facet title="websites">
                  <ul className="flex flex-col gap-1">
                    {profile.websites.map((site) => (
                      <li key={site} className="min-w-0">
                        <a
                          href={site}
                          target="_blank"
                          rel="noreferrer"
                          className="block break-all text-body-s text-accent-default underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default"
                        >
                          {site}
                        </a>
                      </li>
                    ))}
                  </ul>
                </Facet>
              )}
              {/* LABELLED FOR WHAT IT IS. A home address and a birth date
                  are a different category of fact from a job title, and
                  a source hands them over whether or not anyone wanted
                  them. Shown plainly, so a reader who does not want them
                  stored knows to clear the profile. */}
              {(profile.address || profile.birthDate) && (
                <Facet title="personal details">
                  <div className="flex flex-col gap-1">
                    {profile.address && (
                      <p className="text-body-s leading-[1.6] text-text-secondary">
                        {profile.address}
                      </p>
                    )}
                    {profile.birthDate && (
                      <p className="text-body-s text-text-secondary">
                        Born {profile.birthDate}
                      </p>
                    )}
                  </div>
                </Facet>
              )}
            </div>
          </Section>
        )}

        {!hasProfileContent(profile) && (
          <p className="text-body-s text-text-muted">This import came back empty.</p>
        )}

        {profile.fetchedAt && (
          <p className="text-caption text-text-muted">
            imported {new Date(profile.fetchedAt).toLocaleDateString()}
          </p>
        )}
        </div>
      )}
    </div>
  )
}

function Facet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-label-caps uppercase text-text-secondary">{title}</p>
      {children}
    </div>
  )
}
