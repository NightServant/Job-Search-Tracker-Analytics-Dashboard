import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentWorkspace } from '../DocumentWorkspace'
import { useDocumentView } from '../documentView'

vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/cv') }))

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

const original = window.matchMedia
afterEach(() => {
  window.matchMedia = original
})

/** Reads the view from inside `children`, which is the only place it exists. */
function Probe() {
  return <p>drawn as {useDocumentView()}</p>
}

function renderWorkspace(props: Partial<React.ComponentProps<typeof DocumentWorkspace>> = {}) {
  return render(
    <DocumentWorkspace
      kindLabel="word"
      documentsHref="/documents"
      title="My CV"
      onTitleChange={() => {}}
      savedLabel="saved 7:43 am"
      actions={<button type="button">save</button>}
      tools={<button type="button">bold</button>}
      leftRail={<p>pick a posting</p>}
      rightRail={<p>match analysis</p>}
      {...props}
    >
      <Probe />
    </DocumentWorkspace>
  )
}

/**
 * The docked tab panel and the scroll/print toggle (Gabe, 2026-09-13:
 * "floating icon button for scroll view and print view... also consider to
 * relocate tools and toolbar in tablet mobile view -- my suggestion is proper
 * tab navigation").
 *
 * WHAT IS WORTH ASSERTING is not the arrangement but the three rules the
 * arrangement exists to serve: a tab appears for each surface that was
 * actually passed and for no other, the document gets the whole screen back
 * when you tap the open tab again, and a phone opens on the readable view
 * rather than on a letter page scaled to 46%.
 *
 * A closed panel is `inert`, which takes it out of the accessibility tree --
 * so `queryByRole` returning null IS the assertion that the document has the
 * screen, not a weaker proxy for it.
 */
describe('the docked panel below lg', () => {
  beforeEach(() => setViewport(true))

  it('shows a tab per surface passed, and none for the props omitted', () => {
    renderWorkspace()
    expect(screen.getByRole('tab', { name: 'format' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'outline' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'tailor' })).toBeInTheDocument()
  })

  it('gives the LaTeX editor one tab, because it passes one surface', () => {
    // No `tools` and no `rightRail`: two tabs that opened an empty panel would
    // be two lies about what this editor can do.
    renderWorkspace({ tools: undefined, rightRail: undefined })
    expect(screen.queryByRole('tab', { name: 'format' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'tailor' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'outline' })).toBeInTheDocument()
  })

  it('opens closed, because the document is what the screen was opened for', () => {
    renderWorkspace()
    expect(screen.queryByRole('button', { name: 'bold' })).toBeNull()
    expect(screen.queryByText('pick a posting')).toBeNull()
    expect(screen.queryByText('match analysis')).toBeNull()
  })

  it('closes the panel when the open tab is pressed again', async () => {
    // base-ui never re-commits the value that is already current, so this path
    // is the chrome's own onClick rather than the library's -- which is
    // exactly why it needs a test.
    const user = userEvent.setup()
    renderWorkspace()
    await user.click(screen.getByRole('tab', { name: 'format' }))
    expect(screen.getByRole('button', { name: 'bold' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'format' }))
    expect(screen.queryByRole('button', { name: 'bold' })).toBeNull()
  })

  it('swaps one surface for another without closing', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    await user.click(screen.getByRole('tab', { name: 'outline' }))
    expect(screen.getByText('pick a posting')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'tailor' }))
    expect(screen.getByText('match analysis')).toBeInTheDocument()
    expect(screen.queryByText('pick a posting')).toBeNull()
  })
})

describe('the scroll/print toggle', () => {
  beforeEach(() => setViewport(true))

  it('draws the document as scroll view by default', () => {
    renderWorkspace({ paged: true })
    expect(screen.getByText(/drawn as scroll/)).toBeInTheDocument()
  })

  it('flips the view, and names the view it will switch TO', async () => {
    const user = userEvent.setup()
    renderWorkspace({ paged: true })
    await user.click(screen.getByRole('button', { name: 'Switch to print view' }))
    expect(screen.getByText(/drawn as print/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Switch to scroll view' }))
    expect(screen.getByText(/drawn as scroll/)).toBeInTheDocument()
  })

  it('is not offered where there is no paper to toggle', () => {
    // The LaTeX canvas is a textarea and a compiled PDF in an iframe: no page
    // geometry, no zoom, no seams, so nothing for the button to do.
    renderWorkspace()
    expect(screen.queryByRole('button', { name: /switch to .* view/i })).toBeNull()
    expect(screen.getByText(/drawn as print/)).toBeInTheDocument()
  })
})

describe('the desktop chrome', () => {
  beforeEach(() => setViewport(false))

  it('is always print, because it provides nothing and the default is print', () => {
    // Not an oversight: the desktop well is 816px of letter page at
    // zoom-to-fit, which is the proof this editor exists to show.
    renderWorkspace({ paged: true })
    expect(screen.getByText(/drawn as print/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /switch to .* view/i })).toBeNull()
  })
})
