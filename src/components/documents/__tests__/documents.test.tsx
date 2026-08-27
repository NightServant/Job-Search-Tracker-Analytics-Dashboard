import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within, cleanup, fireEvent } from '@testing-library/react'
import type { ResumeSummary } from '@/services/resumeService'
import { formatTouchedDate } from '@/services/date'
import { DocumentRow } from '../DocumentRow'
import { VersionHistory } from '../VersionHistory'
import { DocumentsPage } from '../DocumentsPage'

afterEach(() => cleanup())

const STRUCTURED = {
  basics: {
    name: 'Gabe Cervantes',
    label: 'Software Engineer',
    email: 'gabe@example.com',
    phone: '+63 900 000 0000',
    location: 'Manila',
    summary: 'Builds web applications.',
  },
  work: [
    {
      company: 'Acme',
      position: 'Engineer',
      location: 'Remote',
      startDate: '2024-01',
      endDate: null,
      highlights: ['Shipped the billing rewrite'],
    },
  ],
  education: [],
  skills: ['TypeScript'],
  projects: [],
  awards: [],
}

function makeDoc(overrides: Partial<ResumeSummary> = {}): ResumeSummary {
  return {
    id: 'cv-1',
    title: 'Backend CV',
    mode: 'word',
    updated_at: '2026-08-20T10:00:00.000Z',
    sections: STRUCTURED,
    version: 3,
    ...overrides,
  }
}

const DOC = makeDoc()

describe('DocumentRow', () => {
  it('lays out four columns on desktop and stacks on mobile', () => {
    // Desktop is Info, ATS Check, version, date across 1104px. At 335px the
    // marker, version and date drop onto their own line beneath the title.
    const { container } = render(<DocumentRow doc={DOC} />)
    expect(container.firstElementChild!.className).toMatch(/grid-cols-1 .*md:grid-cols-\[/)
  })

  it('keeps the marker, version and date together on one line beneath the title at 335px', () => {
    // jsdom has no layout engine, so the break is asserted where it is
    // actually declared: one wrapper holds the three trailing cells, and it
    // dissolves into the grid at md so the same markup is four columns on
    // desktop and two lines on mobile.
    const { container } = render(<DocumentRow doc={DOC} />)
    const meta = container.querySelector('[data-row-meta]')!
    expect(meta.className).toContain('md:contents')
    expect(within(meta as HTMLElement).getByText('v3')).toBeTruthy()
    expect(within(meta as HTMLElement).getByText(formatTouchedDate(DOC.updated_at))).toBeTruthy()
  })

  it('separates rows with a hairline rule, not a card border', () => {
    const { container } = render(<DocumentRow doc={DOC} />)
    const row = container.firstElementChild as HTMLElement
    expect(row.className).toContain('border-b')
    expect(row.className).not.toMatch(/(^|\s)border(\s|$)/)
  })

  it('opens the CV in the editor through the ?draft= contract', () => {
    render(<DocumentRow doc={DOC} />)
    expect(screen.getByRole('link', { name: /backend cv/i }).getAttribute('href')).toBe('/cv?draft=cv-1')
  })

  it('shows the ATS verdict for a structured CV as a rule and a label', () => {
    const { container } = render(<DocumentRow doc={DOC} />)
    expect(container.querySelector('[data-ats]')).toBeTruthy()
  })

  it('says a legacy draft was never checked rather than showing it as a failure', () => {
    const { container } = render(<DocumentRow doc={makeDoc({ sections: null })} />)
    expect(container.querySelector('[data-ats]')).toBeNull()
    expect(screen.getByText(/not checked/i)).toBeTruthy()
  })

  it('marks the row with an ATS verdict, never with an application status', () => {
    // A document is not an application, so the row speaks the ATS Check
    // vocabulary (pass/review/fail) and not the five-status one. Both halves
    // are asserted: the verdict actually rendered has to be the one the linter
    // returns for this CV, and no StatusMarker may appear beside it.
    const clean = render(<DocumentRow doc={DOC} />)
    expect(clean.container.querySelector('[data-ats]')!.getAttribute('data-ats')).toBe('pass')
    expect(clean.container.querySelector('[data-status]')).toBeNull()
    cleanup()

    const thin = render(<DocumentRow doc={makeDoc({ sections: { ...STRUCTURED, skills: [] } })} />)
    expect(thin.container.querySelector('[data-ats]')!.getAttribute('data-ats')).toBe('review')
  })

  it('reads updated_at in the viewer zone, because it is an instant and not a calendar day', () => {
    const { container } = render(<DocumentRow doc={DOC} />)
    expect(container.textContent).toContain(formatTouchedDate('2026-08-20T10:00:00.000Z'))
  })

  it('says a CV has no saved versions rather than calling it v0', () => {
    render(<DocumentRow doc={makeDoc({ version: null })} />)
    expect(screen.getByText(/no versions/i)).toBeTruthy()
  })

  it('names which editor a draft opens in', () => {
    render(<DocumentRow doc={makeDoc({ mode: 'latex' })} />)
    expect(screen.getByText('LaTeX')).toBeTruthy()
  })
})

describe('VersionHistory', () => {
  const VERSIONS = [
    { id: 's-3', version: 3, created_at: '2026-08-20T10:00:00.000Z' },
    { id: 's-2', version: 2, created_at: '2026-08-19T10:00:00.000Z' },
  ]

  it('lists the saved versions of one CV', () => {
    render(<VersionHistory title="Backend CV" editHref="/cv?draft=cv-1" versions={VERSIONS} />)
    expect(screen.getByText('v3')).toBeTruthy()
    expect(screen.getByText('v2')).toBeTruthy()
  })

  it('sends restoring to the editor, which is the only surface that can do it', () => {
    // This is the documents-list surface: it answers "what versions exist",
    // not "put one back". The editor's own history control owns restore, and
    // duplicating it here would mean two ways to overwrite a CV.
    render(<VersionHistory title="Backend CV" editHref="/cv?draft=cv-1" versions={VERSIONS} />)
    expect(screen.queryByRole('button', { name: /restore/i })).toBeNull()
    expect(screen.getByRole('link', { name: /editor/i }).getAttribute('href')).toBe('/cv?draft=cv-1')
  })

  it('says the read failed rather than claiming there are no versions', () => {
    render(<VersionHistory title="Backend CV" editHref="/cv?draft=cv-1" versions={[]} error />)
    expect(screen.queryByText(/no versions saved yet/i)).toBeNull()
    expect(screen.getByText(/could not load/i)).toBeTruthy()
  })

  it('says so plainly when a CV has never been snapshotted', () => {
    render(<VersionHistory title="Backend CV" editHref="/cv?draft=cv-1" versions={[]} />)
    expect(screen.getByText(/no versions saved yet/i)).toBeTruthy()
  })

  it('shows a pending state rather than an empty one while the read is in flight', () => {
    const { container } = render(
      <VersionHistory title="Backend CV" editHref="/cv?draft=cv-1" versions={[]} loading />
    )
    expect(container.querySelector('[role="status"]')).toBeTruthy()
    expect(screen.queryByText(/no versions saved yet/i)).toBeNull()
  })
})

describe('DocumentsPage', () => {
  it('carries + new cv in the body header, matching Applications Add', () => {
    render(<DocumentsPage docs={[DOC]} />)
    const header = document.querySelector('[data-body-header]') as HTMLElement
    expect(within(header).getByRole('link', { name: /new cv/i })).toBeTruthy()
  })

  it('offers exactly one way to start a CV, and it is the body header control', () => {
    // Content controls belong to the content, not to the Top Bar, which is
    // chrome and identical on five of the seven app screens. This fails both
    // if the control leaves the header and if a second one appears elsewhere.
    const { container } = render(<DocumentsPage docs={[DOC]} />)
    const create = [...container.querySelectorAll('a[href="/cv?draft=new"]')]
    expect(create).toHaveLength(1)
    expect(container.querySelector('[data-body-header]')!.contains(create[0])).toBe(true)
  })

  it('renders one row per CV', () => {
    const { container } = render(
      <DocumentsPage docs={[DOC, makeDoc({ id: 'cv-2', title: 'Frontend CV' })]} />
    )
    expect(container.querySelectorAll('[data-document-row]')).toHaveLength(2)
  })

  it('offers a way to start one rather than an empty page when there are no CVs', () => {
    render(<DocumentsPage docs={[]} />)
    expect(screen.getByText(/no cvs yet/i)).toBeTruthy()
    expect(screen.getAllByRole('link', { name: /new cv/i }).length).toBeGreaterThan(0)
  })

  it('shows one CV version history at a time, beside the row it belongs to', () => {
    const onToggleVersions = vi.fn()
    const { rerender } = render(
      <DocumentsPage docs={[DOC]} onToggleVersions={onToggleVersions} />
    )
    expect(screen.queryByText(/no versions saved yet/i)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /versions/i }))
    expect(onToggleVersions).toHaveBeenCalledWith(DOC)

    rerender(<DocumentsPage docs={[DOC]} openVersionsFor="cv-1" versions={[]} />)
    expect(screen.getByText(/no versions saved yet/i)).toBeTruthy()
  })

  it('asks the caller to delete rather than deleting anything itself', () => {
    const onDelete = vi.fn()
    render(<DocumentsPage docs={[DOC]} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: /delete backend cv/i }))
    expect(onDelete).toHaveBeenCalledWith(DOC)
  })
})
