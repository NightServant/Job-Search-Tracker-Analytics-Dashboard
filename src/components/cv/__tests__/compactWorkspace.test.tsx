import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentWorkspace } from '../DocumentWorkspace'

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

const renderWorkspace = () =>
  render(
    <DocumentWorkspace
      kindLabel="word"
      documentsHref="/documents"
      title="My CV"
      onTitleChange={() => {}}
      savedLabel="saved 7:43 am"
      actions={<button type="button">save</button>}
      destructiveActions={<button type="button">delete</button>}
      tools={<button type="button">bold</button>}
      leftRail={<p>pick a posting</p>}
      rightRail={<p>match analysis</p>}
    >
      <p>the document</p>
    </DocumentWorkspace>
  )

/**
 * The compact editor chrome (Gabe, 2026-09-06), modelled on Word for Android.
 *
 * THE INVARIANT WORTH PROTECTING is not the visual arrangement -- it is that
 * NOTHING WAS DROPPED on the way to a phone. Every desktop capability has to
 * remain reachable, and the two that matter most are the ones Gabe named:
 * AI tailoring and the CV check. A mobile layout that quietly loses features
 * is the standard failure of this pattern, so each is asserted by name.
 */
describe('the editor below lg', () => {
  beforeEach(() => setViewport(true))

  it('takes the whole viewport, with the name centred as Word puts it', () => {
    const { container } = renderWorkspace()
    const shell = container.querySelector('[data-document-workspace]')!
    expect(shell.hasAttribute('data-compact')).toBe(true)
    expect(shell.className).toContain('fixed')
    expect(shell.className).toContain('inset-0')
    // Still the h1, still typed into in place -- the document names the screen.
    expect(screen.getByLabelText('CV title')).toHaveValue('My CV')
  })

  it('keeps a way out, the save state, and the formatting bar', () => {
    renderWorkspace()
    expect(screen.getByRole('link', { name: 'Done' })).toHaveAttribute('href', '/documents')
    expect(screen.getByText('saved 7:43 am')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'bold' })).toBeInTheDocument()
  })

  it('reaches AI tailoring and the CV check from the command row', async () => {
    // Gabe's requirement, and the one most easily lost. The control is its own
    // button rather than an item three taps deep in the overflow: burying the
    // app's one piece of real intelligence under a `...` is how a feature
    // stops existing.
    const user = userEvent.setup()
    renderWorkspace()
    await user.click(screen.getByRole('button', { name: /tailoring and cv check/i }))
    expect(screen.getByRole('tab', { name: /the posting/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /the check/i })).toBeInTheDocument()
    expect(screen.getByText('pick a posting')).toBeInTheDocument()
  })

  it('keeps every other desktop action, in the overflow sheet', async () => {
    const user = userEvent.setup()
    renderWorkspace()
    // Not on the bar to begin with -- that is what makes it an overflow.
    expect(screen.queryByRole('button', { name: 'save' })).toBeNull()
    await user.click(screen.getByRole('button', { name: /more actions/i }))
    expect(screen.getByRole('button', { name: 'save' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'delete' })).toBeInTheDocument()
  })

  it('lays the action sheet out as one column on a phone and two row shapes from sm', async () => {
    // Gabe, 2026-09-06, over three passes. The first cut was one tall column
    // (~400px of sheet over a document the reader was mid-edit in); the second
    // was two columns everywhere, which at 390px left each action ~175px --
    // cramped for `export .docx` and two thumb targets side by side; the third
    // put save alone on its own row with a hole beside it.
    //
    // SIX TRACKS, not three, because the sheet holds two row shapes: the three
    // exports at two tracks each, then save and delete at three each. Three
    // tracks cannot express halves.
    const user = userEvent.setup()
    const { container } = renderWorkspace()
    await user.click(screen.getByRole('button', { name: /more actions/i }))
    const grid = container.ownerDocument.querySelector('[data-slot="sheet-content"] .grid')!
    expect(grid.className).toContain('grid-cols-1')
    expect(grid.className).toContain('sm:grid-cols-6')
    expect(grid.className).toContain('sm:[&>button]:col-span-2')
    // Save is the caller's last <button>; delete is nested in its own div and
    // is deliberately not one of them.
    expect(grid.className).toContain('sm:[&>button:last-of-type]:col-span-3')
  })

  it('keeps the destructive rule on a phone and drops it where the row is shared', async () => {
    // A real trade, recorded rather than smoothed over: desktop separates
    // delete from save with a rule because a destructive action does not
    // belong beside a save. Gabe asked for the two to share a row here, and a
    // rule between two cells of one row would have to break the row to draw.
    // Stacked on a phone it costs nothing, so it stays there.
    const user = userEvent.setup()
    const { container } = renderWorkspace()
    await user.click(screen.getByRole('button', { name: /more actions/i }))
    const sep = container.ownerDocument.querySelector('[data-slot="sheet-content"] [data-slot="separator"]')
    expect(sep, 'the phone rule is gone entirely').not.toBeNull()
    expect(sep!.className).toContain('sm:hidden')
  })

  it('gives every action a boundary and a 44px floor', async () => {
    // The caller ranks these for a DESKTOP BAR, where mostly-ghost buttons on
    // one line are correct. Stacked in a sheet, `reset` and `export .docx` had
    // no boundary at all and read as captions rather than controls.
    const user = userEvent.setup()
    const { container } = renderWorkspace()
    await user.click(screen.getByRole('button', { name: /more actions/i }))
    const grid = container.ownerDocument.querySelector('[data-slot="sheet-content"] .grid')!
    expect(grid.className).toContain('[&_button]:min-h-11')
    expect(grid.className).toContain('[&_button]:border')
    // Background is deliberately NOT set: this selector outranks a utility
    // class and would repaint Save's accent fill, flattening the ranking.
    expect(grid.className).not.toMatch(/\[&_button\]:bg-/)
  })

  it('renders one tree, not two', () => {
    // The reason the breakpoint is JS and not a `lg:` class. Two trees would
    // put two of every control in the accessibility tree; a screen reader
    // would read the whole toolbar twice.
    renderWorkspace()
    expect(screen.getAllByLabelText('CV title')).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'bold' })).toHaveLength(1)
  })
})

describe('the editor at desktop', () => {
  beforeEach(() => setViewport(false))

  it('is unchanged: breadcrumb, both rails, no compact chrome', () => {
    const { container } = renderWorkspace()
    const shell = container.querySelector('[data-document-workspace]')!
    expect(shell.hasAttribute('data-compact')).toBe(false)
    expect(screen.getByText('pick a posting')).toBeInTheDocument()
    expect(screen.getByText('match analysis')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /more actions/i })).toBeNull()
  })
})
