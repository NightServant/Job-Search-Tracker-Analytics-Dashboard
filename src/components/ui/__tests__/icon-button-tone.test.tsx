import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IconButton } from '../icon-button'
import { DocumentsPage } from '@/components/documents/DocumentsPage'
import type { ResumeSummary } from '@/services/resumeService'

/**
 * Delete looks like delete.
 *
 * WHY THIS IS PINNED. Gabe reported it on 2026-09-15 -- "your document section
 * delete action must be a danger in desktop and laptop screens" -- and the
 * reason it was worth reporting is that the app had FOUR answers for one verb:
 * the applications table drew it red with hand-written classes, the
 * applications list drew it grey, the documents row drew it grey on a laptop
 * and RED on a phone, three inches away in the same component.
 *
 * That is the shape of defect that comes back. It is invisible in a test that
 * renders a row and checks the button exists, it is invisible in a type check,
 * and it is one `className` deletion away at every call site. So the tone is a
 * prop with a `data-tone` attribute, and these assert the attribute rather
 * than the colour -- a class list is Tailwind's to change, but "this control
 * is marked destructive" is ours.
 */
describe('the icon button tone', () => {
  it('is neutral unless the control destroys something', () => {
    // The default has to stay neutral: most icon buttons on a row are edit,
    // expand or drag, and a red one of those would be a false alarm.
    render(<IconButton aria-label="Edit" />)
    expect(screen.getByLabelText('Edit').dataset.tone).toBe('neutral')
  })

  it('marks a danger control as one, and rings in the danger colour', () => {
    // The ring matters as much as the glyph. Every other control in this app
    // rings in the accent, which is the colour the design system uses for "the
    // action we want you to take" -- pointing it at a delete is the wrong
    // sentence.
    render(<IconButton tone="danger" aria-label="Delete" />)
    const button = screen.getByLabelText('Delete')
    expect(button.dataset.tone).toBe('danger')
    expect(button.className).toContain('text-status-rejected-mark')
    expect(button.className).toContain('focus-visible:ring-status-rejected-mark')
    expect(button.className).not.toContain('focus-visible:ring-accent-default')
  })
})

describe("the documents row's delete", () => {
  const DOC = {
    id: 'cv-1',
    user_id: 'u1',
    title: 'Software Engineer CV',
    mode: 'word',
    content: { type: 'doc', content: [] },
    version: 4,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-12T00:00:00.000Z',
  } as unknown as ResumeSummary

  it('is a danger control on the desktop row', () => {
    /*
      THE SCREEN THIS IS ABOUT. `DocumentRow` renders the visible control only
      from `md` up and puts the same verb in an overflow menu below that, where
      it has been a `variant="destructive"` item all along -- so the two halves
      of one row disagreed about whether deleting a document is destructive,
      and the half that said it was harmless was the one on the bigger screen.

      Asserted through the PAGE rather than by rendering an IconButton
      directly, because the defect was never in the component: it was in the
      call site forgetting to say so. A test of the component alone would have
      passed throughout.
    */
    const { container } = render(<DocumentsPage docs={[DOC]} onDelete={() => {}} />)
    const action = container.querySelector('[data-row-actions] [data-icon-button]')
    expect(action, 'the desktop row has no delete control at all').not.toBeNull()
    expect((action as HTMLElement).dataset.tone).toBe('danger')
  })
})
