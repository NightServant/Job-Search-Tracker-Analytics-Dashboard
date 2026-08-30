import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '../confirm-dialog'

describe('ConfirmDialog', () => {
  it('uses the alertdialog role, not dialog', () => {
    // An alertdialog interrupts and requires a choice; it does not dismiss on
    // an outside click. window.confirm had that property and a plain Dialog
    // does not, so losing it would be a regression dressed as an improvement.
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Delete Engineer at Acme?"
        body="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={vi.fn()}
      />
    )
    expect(screen.getByRole('alertdialog', { name: 'Delete Engineer at Acme?' })).toBeTruthy()
  })

  it('calls onConfirm only when the confirm control is pressed', async () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Delete this CV?"
        body="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={onConfirm}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
    // Positive companion in the same test:
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('paints a destructive confirm with the rejected status colour, not orange', () => {
    // Orange is never a status and never a severity. Destructive reuses
    // status/rejected, the same way route-states does for a page error.
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Delete your account?"
        body="Everything goes."
        confirmLabel="Delete account"
        destructive
        onConfirm={vi.fn()}
      />
    )
    const confirm = screen.getByRole('button', { name: 'Delete account' })
    expect(confirm.className).toMatch(/status-rejected|destructive/)
    expect(confirm.className).not.toMatch(/accent/)
  })
})
