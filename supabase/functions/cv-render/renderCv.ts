// Pure HTML generation for cv-render.
//
// Kept free of Deno APIs on purpose: it is the part with real logic — escaping,
// section suppression, date handling — so it is imported by the app's vitest
// suite and covered there rather than only exercised by deploying the function.

export interface CvBasics {
  name: string
  label: string
  email: string
  phone: string
  location: string
  summary: string
}

export interface CvRole {
  company: string
  position: string
  location: string
  startDate: string
  endDate: string | null
  highlights: string[]
}

export interface CvEducationEntry extends CvRole {
  institution: string
  studyType: string
  area: string
}

export interface RenderableCv {
  basics: CvBasics
  work: CvRole[]
  education: Array<Partial<CvEducationEntry>>
  skills: string[]
  projects: string[]
  awards: string[]
}

/**
 * Escapes text destined for HTML.
 *
 * Every string here is user-authored CV content. Interpolating it raw would let
 * a CV inject markup into its own PDF, and would break the document on any
 * ampersand or angle bracket typed in good faith.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const e = escapeHtml

/** An empty section is omitted entirely — a heading with nothing under it reads as an error. */
function section(heading: string, body: string): string {
  return body.trim() ? `<h2>${e(heading)}</h2>${body}` : ''
}

function dateRange(start: string, end: string | null): string {
  if (!start.trim()) return ''
  return `${e(start)} — ${end?.trim() ? e(end) : 'Present'}`
}

function bullets(items: string[]): string {
  const rendered = items.filter((h) => h.trim()).map((h) => `<li>${e(h)}</li>`).join('')
  return rendered ? `<ul>${rendered}</ul>` : ''
}

function roleBlock(role: CvRole): string {
  const title = [role.position, role.company].filter((p) => p?.trim()).map(e).join(' · ')
  const meta = [dateRange(role.startDate ?? '', role.endDate ?? null), role.location?.trim() ? e(role.location) : '']
    .filter(Boolean)
    .join(' · ')
  return `<article><h3>${title}</h3>${meta ? `<p class="meta">${meta}</p>` : ''}${bullets(role.highlights ?? [])}</article>`
}

export function renderCvHtml(doc: RenderableCv, title: string): string {
  const b = doc.basics
  const contact = [b.email, b.phone, b.location].filter((v) => v?.trim()).map(e).join(' · ')

  const body = [
    `<header><h1>${e(b.name)}</h1>${b.label?.trim() ? `<p class="label">${e(b.label)}</p>` : ''}${contact ? `<p class="meta">${contact}</p>` : ''}</header>`,
    section('Summary', b.summary?.trim() ? `<p>${e(b.summary)}</p>` : ''),
    section('Experience', (doc.work ?? []).map(roleBlock).join('')),
    section(
      'Education',
      (doc.education ?? [])
        .map((ed) =>
          roleBlock({
            company: ed.institution ?? ed.company ?? '',
            position: [ed.studyType, ed.area].filter(Boolean).join(' '),
            location: ed.location ?? '',
            startDate: ed.startDate ?? '',
            endDate: ed.endDate ?? null,
            highlights: ed.highlights ?? [],
          })
        )
        .join('')
    ),
    section('Skills', bullets(doc.skills ?? [])),
    section('Projects', bullets(doc.projects ?? [])),
    section('Awards', bullets(doc.awards ?? [])),
  ].join('')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${e(title)}</title>
    <style>
      @page { size: Letter; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #fff; color: #111827;
             font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
      .page { width: 8.5in; min-height: 11in; margin: 0 auto; padding: 0.8in; }
      h1 { margin: 0 0 0.06in; font-size: 24pt; line-height: 1.1; }
      h2 { margin: 0.28in 0 0.08in; font-size: 10pt; text-transform: uppercase;
           letter-spacing: 0.08em; border-bottom: 1px solid #d4d4d8; padding-bottom: 0.04in; }
      h3 { margin: 0.12in 0 0.02in; font-size: 11.5pt; }
      p { margin: 0.04in 0; font-size: 10.5pt; line-height: 1.5; }
      .label { font-size: 12pt; }
      .meta { color: #52525b; font-size: 9.5pt; }
      ul { margin: 0.04in 0; padding-left: 0.22in; }
      li { margin: 0.03in 0; font-size: 10.5pt; line-height: 1.45; }
    </style>
  </head>
  <body><main class="page">${body}</main></body>
</html>`
}
