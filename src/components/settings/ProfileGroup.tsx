'use client'

import * as React from 'react'
import { PanelSection } from '@/components/ui/panel-section'
import { Card, CardHeader, CardAction, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { EMPTY_PROFILE, hasProfileContent, type UserProfile } from '@/services/profile'

/**
 * Settings -> Profile: who you are, as the CV tools see you.
 *
 * IT RENDERS A `UserProfile` AND HAS NO OPINION ABOUT WHERE IT CAME FROM.
 * That has been worth it twice over: this screen outlived a Composio connector
 * and a page scraper without changing shape, and the LinkedIn export plugged
 * in by filling the same type.
 *
 * THE LAYOUT IS A CV, NOT A SETTINGS LIST, and that is the design argument.
 * The first version stacked experience, education, skills and websites as four
 * identical bordered lists, so a reader scanning for their work history had to
 * read headings to find it -- everything carried the same weight. A profile
 * has two kinds of content and they want different treatment:
 *
 *   RECORDS   experience, education, certifications, projects. Dated things
 *             with bodies. They get the main column and the room to breathe.
 *   FACETS    skills, languages, websites, personal details. Short lists that
 *             are looked up rather than read. They get a narrower aside.
 *
 * ADAPTIVE MEANS BOTH TRACKS, WHICH THE FIRST VERSION GOT HALF RIGHT. It
 * hid the aside when empty but always reserved the main column -- so a
 * Profile.csv on its own, which carries no roles and no education, rendered
 * "personal details" alone in the right-hand track beside a column with
 * nothing in it. Gabe called it weird layout, and it was. The two-column grid
 * now exists ONLY when both sides have content; with facets alone they lay out
 * as their own multi-column grid and fill the width they are given.
 *
 * BY CONTAINER, NOT VIEWPORT. This panel is full width on the settings page
 * today and could be narrowed tomorrow; a viewport query would keep the two
 * columns after the panel itself had stopped being wide enough for them.
 *
 * THE IDENTITY IS A CARD, at Gabe's instruction, and it earns the exception:
 * the settings groups are otherwise separated by hairlines rather than boxes,
 * because they are lists of controls. This one is a person, it is the first
 * thing on the page, and a bounded block is what stops the name, the headline
 * and the import buttons reading as three unrelated rows. The repo's `Card` is
 * already restyled to this system -- no shadow, radius at the 4px cap -- so it
 * does not smuggle in a second visual language.
 *
 * NO PHOTO. The export is CSVs and carries no image, and the scraper that
 * could reach one is gone. Initials are honest; a grey circle waiting for
 * something that will never arrive is not.
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
   * steps; once a profile exists it becomes a secondary action in the panel
   * header, because re-importing is rare and should not sit at the end of a
   * long profile where it reads like the next thing to do.
   */
  source?: React.ReactNode
  /** How to get an export. Shown only when there is no profile yet. */
  steps?: React.ReactNode
}

function initialsOf(profile: UserProfile): string {
  const parts = (profile.name ?? '').split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

/** A heading with the count beside it, so a list never hides its own length. */
function Heading({ title, count }: { title: string; count?: number }) {
  return (
    <p className="text-label-caps uppercase text-text-muted">
      {title}
      {count !== undefined && count > 0 && <span className="tabular ml-1">({count})</span>}
    </p>
  )
}

interface Record {
  lead: string
  detail: string | null
  period: string | null
  body?: string | null
}

function Records({ title, rows }: { title: string; rows: Record[] }) {
  if (!rows.length) return null
  return (
    <div className="flex flex-col gap-2">
      <Heading title={title} count={rows.length} />
      <ul className="flex flex-col">
        {rows.map((row, index) => (
          <li
            key={`${row.lead}-${index}`}
            className="flex flex-col gap-1 border-b border-border-subtle py-4 first:pt-1 last:border-b-0 last:pb-0"
          >
            {/* THE DATE SITS OPPOSITE THE TITLE, which is how every CV sets
                this and why it scans so much faster than a third stacked line:
                one column answers "what" and the other "when". It stacks below
                the container's `sm`, where two columns would leave the role
                about 120px wide. */}
            <div className="flex flex-col gap-0.5 @sm/profile:flex-row @sm/profile:items-baseline @sm/profile:justify-between @sm/profile:gap-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-body-m text-text-primary">{row.lead}</p>
                {row.detail && (
                  <p className="break-words text-body-s text-text-secondary">{row.detail}</p>
                )}
              </div>
              {row.period && (
                <p className="shrink-0 text-caption tabular text-text-muted @sm/profile:text-right">
                  {row.period}
                </p>
              )}
            </div>
            {/* `whitespace-pre-line` so the export's own line breaks survive --
                the bullets under a role are the point of importing it. */}
            {row.body && (
              <p className="whitespace-pre-line text-body-s leading-[1.6] text-text-secondary">
                {row.body}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Facet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Heading title={title} />
      {children}
    </div>
  )
}

function Banner({
  profile,
  action,
}: {
  profile: UserProfile
  action?: React.ReactNode
}) {
  const meta = [profile.industry, profile.location].filter(Boolean).join(' · ')
  return (
    <Card data-profile-banner>
      <CardHeader>
        <div className="flex flex-col items-start gap-3 @sm/profile:flex-row @sm/profile:items-center @sm/profile:gap-4">
          <Avatar className="size-16 shrink-0 @sm/profile:size-20">
            <AvatarFallback className="text-body-l">{initialsOf(profile)}</AvatarFallback>
          </Avatar>
          {/* `min-w-0` so a long name wraps inside the row rather than setting
              the row's minimum width and pushing the avatar off a 320px
              screen. The headline out of a LinkedIn export is routinely a
              whole sentence, so it gets a measure rather than a line. */}
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-heading-m text-text-primary">{profile.name ?? 'unnamed'}</p>
            {profile.headline && (
              <p className="max-w-prose text-body-m leading-[1.5] text-text-secondary">
                {profile.headline}
              </p>
            )}
            {meta && <p className="text-caption text-text-muted">{meta}</p>}
          </div>
        </div>
        {/* Full width under the identity on a narrow card, top-right once
            there is room. CardAction moves itself into the second column at
            its own breakpoint; the width here is what lets the buttons fill
            before that happens, rather than sitting half-width and left. */}
        {action && (
          <CardAction className="w-full @sm/card-header:w-auto">{action}</CardAction>
        )}
      </CardHeader>
      {profile.summary && (
        <CardContent>
          <p className="max-w-prose whitespace-pre-line text-body-m leading-[1.6] text-text-secondary">
            {profile.summary}
          </p>
        </CardContent>
      )}
    </Card>
  )
}

function Loading() {
  return (
    <div className="flex flex-col gap-4" data-profile-state="loading">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Skeleton className="size-16 shrink-0 rounded-full sm:size-20" />
        <div className="flex w-full min-w-0 flex-col gap-2">
          <Skeleton className="h-4 w-40 max-w-full" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

export function ProfileGroup({ state, source, steps }: ProfileGroupProps) {
  const profile = state.status === 'ready' ? state.profile : EMPTY_PROFILE
  const ready = state.status === 'ready'

  const records =
    profile.experiences.length > 0 ||
    profile.education.length > 0 ||
    profile.certifications.length > 0 ||
    profile.projects.length > 0

  const facets =
    profile.skills.length > 0 ||
    profile.languages.length > 0 ||
    profile.websites.length > 0 ||
    !!profile.address ||
    !!profile.birthDate

  return (
    <div data-settings-group="profile">
      <PanelSection
        title="profile"
        icon="UserRound"
        titleSize="m"
      >
        <div className="@container/profile">
          {state.status === 'loading' && <Loading />}

          {state.status === 'empty' && (
            <div className="flex flex-col gap-4" data-profile-state="empty">
              <p className="max-w-prose text-body-m leading-[1.6] text-text-secondary">
                {state.message}
              </p>
              {steps}
              {source}
            </div>
          )}

          {ready && (
            <div className="flex flex-col gap-6" data-profile-state="ready">
              {/* The import lives in the banner once there is a profile:
                  re-importing is rare, and at the end of a long profile it
                  reads as the next thing to do rather than a correction. */}
              <Banner profile={profile} action={source} />

              {/* The aside track exists only when something is in it. */}
              {/* TWO TRACKS ONLY WHEN BOTH HAVE SOMETHING IN THEM. A
                  Profile.csv on its own has no roles and no education, and
                  reserving the main column for them put "personal details"
                  alone in a right-hand track beside a void. */}
              <div
                className={
                  records && facets
                    ? 'grid gap-6 @3xl/profile:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] @3xl/profile:gap-10'
                    : 'flex flex-col gap-6'
                }
              >
                {records && (
                <div className="flex min-w-0 flex-col gap-6">
                  <Records
                    title="experience"
                    rows={profile.experiences.map((e) => ({
                      lead: e.title,
                      detail: e.company,
                      period: [e.period, e.location].filter(Boolean).join(' · ') || null,
                      body: e.description,
                    }))}
                  />
                  <Records
                    title="education"
                    rows={profile.education.map((e) => ({
                      lead: e.school,
                      detail: e.degree,
                      period: e.period,
                    }))}
                  />
                  <Records
                    title="certifications"
                    rows={profile.certifications.map((c) => ({
                      lead: c.name,
                      detail: c.authority,
                      period: c.period,
                    }))}
                  />
                  <Records
                    title="projects"
                    rows={profile.projects.map((p) => ({
                      lead: p.title,
                      detail: p.url,
                      period: null,
                      body: p.description,
                    }))}
                  />
                </div>
                )}

                {!hasProfileContent(profile) && (
                  <p className="text-body-s text-text-muted">This import came back empty.</p>
                )}

                {facets && (
                  <aside
                    data-profile-facets
                    className={
                      records
                        ? 'flex min-w-0 flex-col gap-6'
                        : // Alone, they are the content rather than a margin
                          // note, so they spread instead of forming one
                          // narrow strip down the left.
                          'grid min-w-0 gap-6 @sm/profile:grid-cols-2 @3xl/profile:grid-cols-3'
                    }
                  >
                    {/* Comma-joined prose, not chips. The Global Constraint
                        forbids pills, and forty skills as forty boxes is a
                        wall either way. */}
                    {profile.skills.length > 0 && (
                      <Facet title="skills">
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
                            <li key={site} className="break-all text-body-s text-text-secondary">
                              {site}
                            </li>
                          ))}
                        </ul>
                      </Facet>
                    )}
                    {/* LABELLED FOR WHAT IT IS. A home address and a birth date
                        are a different category of fact from a job title, and
                        the export hands them over whether or not anyone wanted
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
                  </aside>
                )}
              </div>

              {profile.fetchedAt && (
                <p className="text-caption text-text-muted">
                  imported {new Date(profile.fetchedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      </PanelSection>
    </div>
  )
}
