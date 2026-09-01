import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    hasVersions: true,
    ...overrides,
  }
}

const DOC = makeDoc()

describe('DocumentRow', () => {
  it('puts the row controls inside the grid, not beside it', () => {
    // Item 4: "version and delete button, does not align properly". The two
    // controls used to hang outside the grid in a flex wrapper, so the grid's
    // 1fr first column was measured from a width the stack had already taken
    // -- by a different amount per row, which is why the four content columns
    // landed at a different x on each one. As a real cell the grid measures
    // them like everything else.
    const { container } = render(
      <DocumentRow doc={DOC} actions={<button type="button">versions</button>} />
    )
    const row = container.querySelector('[data-document-row]')!
    const actions = row.querySelector('[data-row-actions]')!
    expect(actions.parentElement).toBe(row)
    expect(row.className).toContain('md:grid-cols-[1fr_7rem_6rem_6rem_auto]')
  })

  it('renders no actions cell when a caller passes none', () => {
    const { container } = render(<DocumentRow doc={DOC} />)
    expect(container.querySelector('[data-row-actions]')).toBeNull()
  })

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
    render(<DocumentRow doc={makeDoc({ version: null, hasVersions: false })} />)
    expect(screen.getByText(/no versions/i)).toBeTruthy()
  })

  it('calls a pre-backfill snapshot unnumbered, the same word its own panel uses', () => {
    // Expanding this row lists one entry labelled "Unnumbered". The row saying
    // "No versions" over the top of that is the two surfaces disagreeing about
    // the same column.
    render(<DocumentRow doc={makeDoc({ version: null, hasVersions: true })} />)
    expect(screen.getByText(/unnumbered/i)).toBeTruthy()
    expect(screen.queryByText(/no versions/i)).toBeNull()
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
    render(<VersionHistory editHref="/cv?draft=cv-1" versions={VERSIONS} />)
    expect(screen.getByText('v3')).toBeTruthy()
    expect(screen.getByText('v2')).toBeTruthy()
  })

  it('sends restoring to the editor, which is the only surface that can do it', () => {
    // This is the documents-list surface: it answers "what versions exist",
    // not "put one back". The editor's own history control owns restore, and
    // duplicating it here would mean two ways to overwrite a CV.
    render(<VersionHistory editHref="/cv?draft=cv-1" versions={VERSIONS} />)
    expect(screen.queryByRole('button', { name: /restore/i })).toBeNull()
    expect(screen.getByRole('link', { name: /editor/i }).getAttribute('href')).toBe('/cv?draft=cv-1')
  })

  it('says the read failed rather than claiming there are no versions', () => {
    render(<VersionHistory editHref="/cv?draft=cv-1" versions={[]} error />)
    expect(screen.queryByText(/no versions saved yet/i)).toBeNull()
    expect(screen.getByText(/could not load/i)).toBeTruthy()
  })

  it('says so plainly when a CV has never been snapshotted', () => {
    render(<VersionHistory editHref="/cv?draft=cv-1" versions={[]} />)
    expect(screen.getByText(/no versions saved yet/i)).toBeTruthy()
  })

  it('shows a pending state rather than an empty one while the read is in flight', () => {
    const { container } = render(
      <VersionHistory editHref="/cv?draft=cv-1" versions={[]} loading />
    )
    expect(container.querySelector('[data-versions-loading]')).toBeTruthy()
    expect(screen.queryByText(/no versions saved yet/i)).toBeNull()
  })
})

describe('DocumentsPage', () => {
  it('carries + new cv in the body header, matching Applications Add', () => {
    render(<DocumentsPage docs={[DOC]} />)
    const header = document.querySelector('[data-body-header]') as HTMLElement
    expect(within(header).getByRole('button', { name: /new cv/i })).toBeTruthy()
  })

  it('puts `new CV` in the body header exactly once, never in the Top Bar', () => {
    // Renamed: the old name said "exactly one way to start a CV", which stopped
    // being true when the template gallery and import arrived. It never
    // checked that anyway -- it checks that the HEADER carries one `new CV`
    // and no more. Content controls belong to the content, not to the Top Bar,
    // which is chrome and identical on five of the seven app screens.
    const { container } = render(<DocumentsPage docs={[DOC]} />)
    const header = container.querySelector('[data-body-header]')!
    const triggers = within(header as HTMLElement).getAllByRole('button', { name: /new cv/i })
    expect(triggers).toHaveLength(1)
  })

  it('opens the mode chooser as a dialog over the list, not a new page', async () => {
    // Item 2's second half: M5 turned this into a full page at
    // /cv?draft=new, reasoning a dialog would float over nothing. Gabe
    // overruled that. Opening it here, without navigating away, is what
    // makes the Documents list the thing the dialog actually sits over.
    const user = userEvent.setup()
    render(<DocumentsPage docs={[DOC]} />)
    await user.click(screen.getByRole('button', { name: /new cv/i }))
    expect(screen.getByRole('dialog', { name: 'new CV' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /word editor/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /latex editor/i })).toBeTruthy()
  })

  it('reports the chosen mode to the caller, which owns the write and the navigation', async () => {
    const onCreateDraft = vi.fn()
    const user = userEvent.setup()
    render(<DocumentsPage docs={[DOC]} onCreateDraft={onCreateDraft} />)
    await user.click(screen.getByRole('button', { name: /new cv/i }))
    await user.click(screen.getByRole('button', { name: /latex editor/i }))
    expect(onCreateDraft).toHaveBeenCalledWith('latex')
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
    expect(screen.getAllByRole('button', { name: /new cv/i }).length).toBeGreaterThan(0)
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

describe('the Word-style start screen', () => {
  it('offers templates only, both engines in one row, and no blank card', () => {
    // The gallery is why the in-editor dropdown could go: templates are now a
    // starting point rather than an overwrite of what is already open.
    const { container } = render(<DocumentsPage docs={[]} />)
    const cards = [...container.querySelectorAll('[data-template-card]')].map(
      (c) => (c as HTMLElement).dataset.templateCard
    )
    // No blank card: `new CV` is already a primary button on this screen, so a
    // blank card would be a third route to the same blank document.
    expect(cards.some((c) => c!.startsWith('blank'))).toBe(false)
    // Word and LaTeX in one row, not behind two tabs: the choice of engine and
    // the choice of layout are the same decision made once.
    expect(cards.some((c) => c!.startsWith('word-'))).toBe(true)
    expect(cards.some((c) => c!.startsWith('latex-'))).toBe(true)
  })

  it('reports which template was picked, with its mode', async () => {
    const onChooseTemplate = vi.fn()
    const user = userEvent.setup()
    const { container } = render(<DocumentsPage docs={[]} onChooseTemplate={onChooseTemplate} />)

    await user.click(container.querySelector('[data-template-card="word-classic"]')!)
    expect(onChooseTemplate.mock.calls[0][0].mode).toBe('word')
    expect(onChooseTemplate.mock.calls[0][0].template.id).toBe('word-classic')

    await user.click(container.querySelector('[data-template-card="latex-compact"]')!)
    expect(onChooseTemplate.mock.calls[1][0].mode).toBe('latex')
    expect(onChooseTemplate.mock.calls[1][0].template.id).toBe('latex-compact')
  })

  it('keeps `new CV` out of the header until there is a list to act on', () => {
    // Gabe's rule. With no documents the empty state already owns the screen
    // and already carries the call to action; a second identical button in the
    // corner is the same offer made twice, three inches apart.
    const empty = render(<DocumentsPage docs={[]} />)
    expect(empty.container.querySelector('[data-body-header]')!.textContent).not.toMatch(/new CV/)
    empty.unmount()

    render(<DocumentsPage docs={[DOC]} />)
    expect(screen.getByRole('heading', { level: 1 }).closest('[data-body-header]')!.textContent).toMatch(
      /new CV/
    )
  })

  it('gives the empty state the primary button, and import beside it', () => {
    const { container } = render(<DocumentsPage docs={[]} />)
    const state = container.querySelector('[data-empty-state]')!
    const newCv = [...state.querySelectorAll('button')].find((b) => b.textContent?.includes('new CV'))!
    const importBtn = [...state.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('import')
    )!
    // With the header action gone this is the only call to action on the
    // screen, so a secondary here would leave the page with no primary at all.
    expect(newCv.className).not.toMatch(/border-border/)
    expect(importBtn).toBeTruthy()
  })

  it('hands the picked file straight to the caller and resets the input', () => {
    // Reset unconditionally, or picking the same file twice in a row fires
    // change once and the second import silently does nothing.
    const onImport = vi.fn()
    const { container } = render(<DocumentsPage docs={[]} onImport={onImport} />)
    const input = container.querySelector('[data-import-input]') as HTMLInputElement
    const file = new File(['hello'], 'cv.txt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onImport).toHaveBeenCalledWith(file)
    expect(input.value).toBe('')
  })

  it('labels the document columns, which nothing did before', () => {
    const { container } = render(<DocumentsPage docs={[DOC]} />)
    const columns = container.querySelector('[data-document-columns]')!
    expect(columns.textContent).toMatch(/name/)
    expect(columns.textContent).toMatch(/version/)
    expect(columns.textContent).toMatch(/modified/)
  })
})
