import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
    title: 'LaTeX CV',
    mode: 'latex',
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

  it('sends the CTA to the templates page instead of opening the mode chooser', () => {
    // A navigation, so it is a link: middle-clickable, openable in a new tab,
    // and announced as a link rather than a button that happens to navigate.
    render(<DocumentsPage docs={DOCS} />)
    const cta = screen.getByRole('link', { name: /new cv/i })
    expect(cta).toHaveAttribute('href', '/documents/templates')
  })

  it('lists a LaTeX CV but refuses to open it', () => {
    // Gabe, 2026-09-06: the row SHOWS, and says it cannot be opened. Hiding it
    // would read as data loss to the one person who knows it exists.
    const { container } = render(<DocumentsPage docs={DOCS} />)
    const rows = [...container.querySelectorAll('[data-document-row]')]
    const latex = rows.find((r) => within(r as HTMLElement).queryByText('LaTeX CV'))!
    expect(latex.querySelector('[data-document-unavailable]')).not.toBeNull()
    expect(latex.querySelector('a[href*="/cv?draft="]')).toBeNull()
    expect(within(latex as HTMLElement).getByText(/larger screen/i)).toBeInTheDocument()

    // Positive companion: the Word row beside it is still a working link, so
    // the absence above is about LaTeX and not about a broken list.
    const word = rows.find((r) => within(r as HTMLElement).queryByText('Word CV'))!
    expect(word.querySelector('a[href*="/cv?draft="]')).not.toBeNull()
  })
})

describe('documents at desktop', () => {
  beforeEach(() => setViewport(false))

  it('is unchanged: the rail is there and the CTA opens the chooser', () => {
    // Gabe was explicit that desktop does not change. This is the guard on
    // that, because every rule above is one `compact` flag away from leaking.
    const { container } = render(<DocumentsPage docs={DOCS} />)
    expect(container.querySelector('[data-template-gallery]')).not.toBeNull()
    expect(screen.queryByRole('link', { name: /new cv/i })).toBeNull()
    expect(screen.getByRole('button', { name: /new cv/i })).toBeInTheDocument()
  })

  it('still opens a LaTeX CV', () => {
    const { container } = render(<DocumentsPage docs={DOCS} />)
    expect(container.querySelector('[data-document-unavailable]')).toBeNull()
    expect(container.querySelectorAll('a[href*="/cv?draft="]')).toHaveLength(2)
  })
})

describe('the templates screen', () => {
  beforeEach(() => setViewport(true))

  it('offers a blank document first, and no LaTeX at all', () => {
    // A LaTeX template here would create a document that cannot be opened on
    // the device that made it.
    const { container } = render(<TemplatesScreen />)
    const cards = [...container.querySelectorAll('[data-template-card]')].map((c) =>
      c.getAttribute('data-template-card')
    )
    expect(cards[0]).toBe('blank')
    expect(cards.some((id) => id?.startsWith('latex'))).toBe(false)
    expect(cards.some((id) => id?.startsWith('word'))).toBe(true)
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
})
