import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle } from '../card'
import { PanelSection } from '../panel-section'
import { AppDialog } from '../app-dialog'
import { ConfirmDialog } from '../confirm-dialog'
import { Input } from '../input'
import { Select } from '../select'

/**
 * Gabe's 2026-09-05 ask: icons before card titles, dialog headings, inputs and
 * CTA buttons.
 *
 * Every assertion here is about the same rules, because a glyph that breaks
 * any of them is worse than no glyph:
 *
 *   1. IT DOES NOT CHANGE WHAT THE SCREEN SAYS. A dialog is announced by its
 *      title; a card is found by its heading. Both stay exactly the string the
 *      caller passed.
 *   2. IT DOES NOT MOVE THE TEXT ONTO IT. A leading glyph inside a field means
 *      the field's padding has to move with it.
 *   3. IT DOES NOT TAKE THE CLICK. A field whose icon eats the pointer is a
 *      field that sometimes will not focus.
 *
 * ONE NOTE ON WHAT A TEST HERE CANNOT CATCH, because it cost a mutation round
 * to find out: moving a glyph INSIDE `DialogTitle` does not break the
 * accessible name. These icons render an `<svg>` carrying no text, so the name
 * is the same either way. The structural assertion below is therefore a
 * structural one and says so, rather than dressing up as an accessibility
 * guard it is not.
 */

/** The glyph the icon barrel renders, as it appears in the DOM. */
function glyphIn(el: Element | null): SVGElement | null {
  return el?.querySelector('svg') ?? null
}

describe('a card title', () => {
  it('puts the glyph before the heading and leaves the name alone', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle icon="Calendar">
            <h2>upcoming events</h2>
          </CardTitle>
        </CardHeader>
      </Card>
    )
    const heading = screen.getByRole('heading', { name: 'upcoming events' })
    expect(heading.textContent).toBe('upcoming events')

    const title = document.querySelector('[data-slot="card-title"]')!
    expect(glyphIn(title)).toBeTruthy()
    // Before, not after: `compareDocumentPosition` returns FOLLOWING (4) when
    // the argument comes after the node it is called on.
    expect(glyphIn(title)!.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy()
  })

  it('renders no glyph at all when none is named', () => {
    // Every existing call site passes no icon, and none of them should have
    // grown an empty box.
    render(
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>by status</h2>
          </CardTitle>
        </CardHeader>
      </Card>
    )
    expect(glyphIn(document.querySelector('[data-slot="card-title"]'))).toBeNull()
  })
})

describe('a panel heading', () => {
  it('carries the glyph inside the h2 without naming it', () => {
    render(
      <PanelSection title="next event" icon="Calendar">
        <p>nothing scheduled</p>
      </PanelSection>
    )
    const heading = screen.getByRole('heading', { name: 'next event' })
    expect(glyphIn(heading)).toBeTruthy()
    expect(heading.textContent).toBe('next event')
  })

  it('still replaces its content with the failed-read treatment', () => {
    // The error branch predates the icon and is the thing most likely to be
    // broken by editing this component.
    render(
      <PanelSection title="activity" icon="Clock" error="could not load it.">
        <p data-testid="body">should not render</p>
      </PanelSection>
    )
    expect(screen.queryByTestId('body')).toBeNull()
    expect(screen.getByText('could not load it.')).toBeTruthy()
  })
})

describe('a dialog heading', () => {
  it('names the dialog by its title and keeps the glyph a sibling of it', () => {
    render(
      <AppDialog open onOpenChange={() => {}} title="new CV" icon="Documents">
        <p>body</p>
      </AppDialog>
    )
    const dialog = screen.getByRole('dialog', { name: 'new CV' })
    const title = dialog.querySelector('[data-slot="dialog-title"]')!
    expect(title.textContent).toBe('new CV')
    // A sibling, not a descendant: DialogTitle carries the type scale, and a
    // glyph inheriting heading-m's line-height sits wrong in its own box.
    expect(glyphIn(title)).toBeNull()
    expect(glyphIn(title.parentElement)).toBeTruthy()
  })

  it('warns a destructive confirmation in colour as well as in words', () => {
    // The one place the glyph is not decoration: somebody who has stopped
    // reading the body text still has to be told this deletes something.
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="delete this application?"
        body="It cannot be undone."
        confirmLabel="delete"
        destructive
        onConfirm={vi.fn()}
      />
    )
    const dialog = screen.getByRole('alertdialog', { name: 'delete this application?' })
    const glyph = glyphIn(dialog)!
    expect(glyph).toBeTruthy()
    expect(glyph.parentElement!.className).toContain('text-status-rejected-mark')
  })

  it('uses a quiet glyph when nothing is being destroyed', () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="discard your changes?"
        body="They have not been saved."
        confirmLabel="discard"
        onConfirm={vi.fn()}
      />
    )
    const glyph = glyphIn(screen.getByRole('alertdialog'))!
    expect(glyph.parentElement!.className).toContain('text-text-muted')
    expect(glyph.parentElement!.className).not.toContain('rejected')
  })
})

describe('a field with a leading glyph', () => {
  it('moves the text off it rather than drawing over it', () => {
    // `pl-10` instead of `px-3`. Without this the placeholder starts
    // underneath the icon, which is a defect and not a style.
    render(<Input id="email" icon="Mail" aria-label="Email" />)
    const field = screen.getByLabelText('Email')
    expect(field.className).toContain('pl-10')
    expect(field.className).not.toContain('px-3')
  })

  it('leaves the padding alone when there is no glyph', () => {
    render(<Input id="plain" aria-label="Plain" />)
    const field = screen.getByLabelText('Plain')
    expect(field.className).toContain('px-3')
    expect(field.className).not.toContain('pl-10')
  })

  it('does not take the click', () => {
    render(<Input id="email" icon="Mail" aria-label="Email" />)
    const glyph = glyphIn(document.querySelector('.relative'))!
    expect(glyph.closest('[aria-hidden]')!.className).toContain('pointer-events-none')
  })

  it('gives a search box the lens gesture, and nothing else it', () => {
    // Derived from `type`, not chosen by the caller -- `zoom` is the one
    // variant whose stylesheet rule also answers `:focus-within`, because
    // search is the one field whose trigger is the box itself.
    const { unmount } = render(
      <Input id="q" type="search" icon="Search" aria-label="Search" />
    )
    expect(document.querySelector('.icon-motion-zoom')).toBeTruthy()
    unmount()

    render(<Input id="email" type="text" icon="Mail" aria-label="Email" />)
    expect(document.querySelector('.icon-motion-zoom')).toBeNull()
  })

  it('still renders the error message and wires it up', () => {
    render(<Input id="email" icon="Mail" aria-label="Email" error="that is not an email." />)
    const field = screen.getByLabelText('Email')
    expect(field.getAttribute('aria-describedby')).toBe('email-error')
    expect(screen.getByText('that is not an email.')).toBeTruthy()
  })
})

describe('a select with a leading glyph', () => {
  it('sits its text on the same line a field would', () => {
    // The whole reason this prop exists: a form row is a mix of the two, and a
    // glyph on one but not the other puts their text on different lines.
    render(
      <Select
        id="status"
        aria-label="Status"
        icon="Applications"
        value="applied"
        onValueChange={() => {}}
        items={[{ value: 'applied', label: 'applied' }]}
      />
    )
    expect(screen.getByLabelText('Status').className).toContain('pl-10')
  })

  it('keeps pl-3 without one', () => {
    render(
      <Select
        id="status"
        aria-label="Status"
        value="applied"
        onValueChange={() => {}}
        items={[{ value: 'applied', label: 'applied' }]}
      />
    )
    const trigger = screen.getByLabelText('Status')
    expect(trigger.className).toContain('pl-3')
    expect(trigger.className).not.toContain('pl-10')
  })
})
