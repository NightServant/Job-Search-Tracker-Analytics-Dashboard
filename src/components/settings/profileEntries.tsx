'use client'

import { icons, type IconName } from '@/components/icons'
import { initialsOf } from './initials'

/**
 * One entry in a profile list: a role, a degree, a certificate, a project.
 *
 * SPLIT OUT OF `ProfileGroup` ON 2026-09-11, which was 568 lines. The seam
 * here is NOT state -- this whole file has none, and neither did the component
 * it came from. It is what the pieces DRAW: these three render the contents of
 * a list, and `profileChrome` renders the frame around them. Before the split
 * both halves plus the composition shared one file, so "how is an experience
 * row laid out" and "what cards does the profile have" were the same question.
 *
 * THE GROUP IS CLOSED, which is what made this the right cut rather than a
 * tidy one: `OrgTile` is used only by `Records`, `RecordRow` and `BulletRow`
 * are used only here, and nothing outside needs any of them. Only the two list
 * components and `initialsOf` are exported.
 */


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



export interface RecordRow {
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
export function Records({
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

export interface BulletRow {
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
export function Bullets({ rows }: { rows: BulletRow[] }) {
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

