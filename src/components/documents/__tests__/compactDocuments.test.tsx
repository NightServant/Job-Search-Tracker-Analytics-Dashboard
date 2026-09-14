import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentsPage } from '../DocumentsPage'
import { TemplatesScreen } from '../TemplatesScreen'
import { DocumentsNotice } from '../DocumentsNotice'
import type { ResumeSummary } from '@/services/resumeService'

vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/documents') }))

/**
 * The compact Documents surface (Gabe, 2026-09-06).
 *
 * `useBelowDesktop` reads `matchMedia`, which jsdom stubs as "no match" -- so
 * the default render here is the DESKTOP tree, and the compact tree has to be
 * asked for by making the query match. That asymmetry is the point of the
 * hook: the server renders desktop, so desktop is what a test gets unless it
 * says otherwise.
 */
function setViewport(belowDesktop: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: belowDesktop && query.includes('max-width'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

const DOCS: ResumeSummary[] = [
  {
    id: 'w1',
    title: 'Word CV',
    mode: 'word',
    updated_at: new Date().toISOString(),
    sections: null,
    version: 1,
  } as ResumeSummary,
  {
    id: 'l1',
    title: 'Northwind cover letter',
    mode: 'cover_letter',
    updated_at: new Date().toISOString(),
    sections: null,
    version: 1,
  } as ResumeSummary,
]

const original = window.matchMedia
afterEach(() => {
  window.matchMedia = original
})

describe('documents below lg', () => {
  beforeEach(() => setViewport(true))

  it('leads with the documents, not with a template rail', () => {
    // The rail is eleven cards. Above the user's own CVs it pushed every one
    // of them below the fold on a phone, which is the wrong thing to put first
    // on a screen called "documents".
    const { container } = render(<DocumentsPage docs={DOCS} />)
    expect(container.querySelector('[data-template-gallery]')).toBeNull()
    expect(container.querySelectorAll('[data-document-row]')).toHaveLength(2)
  })

  it('sends the CTA to the templates page instead of opening the chooser', () => {
    // A navigation, so it is a link: middle-clickable, openable in a new tab,
    // and announced as a link rather than a button that happens to navigate.
    //
    // It does NOT ask which kind on the way: every card on the destination
    // names its own kind, so the question would be answered better there.
    render(<DocumentsPage docs={DOCS} />)
    const cta = screen.getByRole('link', { name: /new document/i })
    expect(cta).toHaveAttribute('href', '/documents/templates')
  })

})

describe('documents at desktop', () => {
  beforeEach(() => setViewport(false))

  it('is unchanged: the rail is there and the CTA opens the chooser', () => {
    // Gabe was explicit that desktop does not change. This is the guard on
    // that, because every rule above is one `compact` flag away from leaking.
    const { container } = render(<DocumentsPage docs={DOCS} />)
    expect(container.querySelector('[data-template-gallery]')).not.toBeNull()
    expect(screen.queryByRole('link', { name: /new document/i })).toBeNull()
    expect(screen.getByRole('button', { name: /new document/i })).toBeInTheDocument()
  })

  it('opens every row, whichever kind it is', () => {
    // Was "still opens a LaTeX CV", from when one of these two rows was a
    // LaTeX document that the compact tree refused to open. Nothing is
    // withheld by kind any more -- a cover letter is the same row and the same
    // editor as a CV -- so the guard is that both rows link into the editor.
    const { container } = render(<DocumentsPage docs={DOCS} />)
    expect(container.querySelector('[data-document-unavailable]')).toBeNull()
    expect(container.querySelectorAll('a[href*="/cv?draft="]')).toHaveLength(2)
  })
})

describe('the templates screen', () => {
  beforeEach(() => setViewport(true))

  it('offers a blank document first, then both kinds of template', () => {
    // Was "and no LaTeX at all": a LaTeX template here would have created a
    // document that could not be opened on the device that made it. Cover
    // letters have no such problem, so this screen carries both sets -- which
    // is also what gives its search and dropdown something to narrow.
    const { container } = render(<TemplatesScreen />)
    const cards = [...container.querySelectorAll('[data-template-card]')].map((c) =>
      c.getAttribute('data-template-card')
    )
    expect(cards[0]).toBe('blank')
    expect(cards.some((id) => id?.startsWith('word-'))).toBe(true)
    expect(cards.some((id) => id?.startsWith('cover-'))).toBe(true)
  })

  it('puts the search and the dropdown on the template page itself', () => {
    // Gabe, verbatim: "In mobile and tablet screens, search bar and dropdown
    // will appear at the template page." Below `lg` the gallery is not on
    // /documents at all, so this is the only screen that can carry them.
    render(<TemplatesScreen />)
    expect(screen.getByLabelText(/search templates by name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/filter templates by kind/i)).toBeInTheDocument()
  })

  it('asks which kind the blank card means rather than assuming a CV', async () => {
    // Every other card names its kind under the thumbnail. A blank page is
    // whichever kind you say it is, so it is the one card that has to ask.
    const onChooseBlank = vi.fn()
    const user = userEvent.setup()
    const { container } = render(<TemplatesScreen onChooseBlank={onChooseBlank} />)

    await user.click(container.querySelector('[data-template-card="blank"]')!)
    await user.click(screen.getByRole('button', { name: /cover letter/i }))
    expect(onChooseBlank).toHaveBeenCalledWith('cover_letter')
  })

  it('is a grid, not a rail: nothing is hidden behind a drag', () => {
    const { container } = render(<TemplatesScreen />)
    expect(container.querySelector('[data-template-grid]')).not.toBeNull()
  })

  it('offers the way back it was reached from', () => {
    render(<TemplatesScreen />)
    expect(screen.getByRole('link', { name: /documents/i })).toHaveAttribute('href', '/documents')
  })
})

describe('the documents notice', () => {
  it('renders nothing when there is nothing to say', () => {
    const { container } = render(<DocumentsNotice notice={null} onDismiss={() => {}} />)
    expect(container.querySelector('[data-documents-notice]')).toBeNull()
  })

  it('states the failure and can be dismissed, rather than timing out', () => {
    // The reason a banner replaced the toast here: "that file could not be
    // imported" is an explanation, and a four-second explanation is one the
    // reader has to reproduce the failure to read again.
    render(
      <DocumentsNotice
        notice={{ kind: 'error', title: 'Import failed', message: 'Could not read the document' }}
        onDismiss={() => {}}
      />
    )
    expect(screen.getByRole('status')).toHaveTextContent('Import failed')
    expect(screen.getByText(/could not read the document/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
  })

  it('never shows on desktop, where sonner still owns this job', () => {
    const { container } = render(
      <DocumentsNotice notice={{ kind: 'info', title: 'Draft created' }} onDismiss={() => {}} />
    )
    expect(container.querySelector('[data-documents-notice]')!.className).toContain('lg:hidden')
  })

  it('drops the pager and lists every document, because a phone scrolls', () => {
    // Gabe, 2026-09-13: "remove the pagination and maintain the scroll in
    // tablet and mobile screens". Paging a scrolling surface asks somebody to
    // tap a number to reach the eleventh of twelve CVs when a thumb would have
    // got there on its own -- and it puts a row of tap targets between them and
    // the thing they came for.
    //
    // THE ROWS HAVE TO BE ALL OF THEM, not five with the pager hidden: that
    // would leave the rest filtered, counted and unreachable, with no control
    // on screen admitting it.
    setViewport(true)
    const many = Array.from({ length: 11 }, (_, i) => ({
      ...DOCS[0],
      id: `m${i}`,
      title: `CV ${i}`,
    })) as ResumeSummary[]

    render(<DocumentsPage docs={many} />)

    expect(screen.getAllByRole('link', { name: /^CV \d+$/ })).toHaveLength(11)
    expect(screen.queryByRole('navigation', { name: /pagination/i })).toBeNull()
    expect(screen.queryByRole('button', { name: '2' })).toBeNull()
    // The count stays, and states the total rather than describing a window
    // that does not exist.
    expect(screen.getByText('11 documents')).toBeTruthy()
  })
})
