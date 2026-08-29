import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppDialog } from '../app-dialog'

function TriggerHarness() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <AppDialog open={open} onOpenChange={setOpen} title="New application">
        <button>inside</button>
      </AppDialog>
    </>
  )
}

describe('AppDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <AppDialog open={false} onOpenChange={vi.fn()} title="New application">
        <p>body</p>
      </AppDialog>
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    // Positive companion, in the same test, so this cannot pass by never
    // rendering at all:
    expect(screen.queryByText('body')).toBeNull()
  })

  it('is a modal dialog with an accessible name when open', () => {
    render(
      <AppDialog open onOpenChange={vi.fn()} title="New application">
        <p>body</p>
      </AppDialog>
    )
    const dialog = screen.getByRole('dialog', { name: 'New application' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByText('body')).toBeTruthy()
  })

  it('closes on Escape', async () => {
    const onOpenChange = vi.fn()
    render(
      <AppDialog open onOpenChange={onOpenChange} title="New application">
        <p>body</p>
      </AppDialog>
    )
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('carries no shadow and no radius above the 4px cap', () => {
    // shadcn's DialogContent ships rounded-lg + shadow-lg. Separation in this
    // system is a hairline rule.
    render(
      <AppDialog open onOpenChange={vi.fn()} title="New application">
        <p>body</p>
      </AppDialog>
    )
    const cls = screen.getByRole('dialog').className
    expect(cls).not.toMatch(/\bshadow-/)
    expect(cls).not.toMatch(/\brounded-(lg|xl|2xl|3xl|full)\b/)
    expect(cls).toContain('rounded-md')
  })

  it('returns focus to the trigger on close', async () => {
    render(<TriggerHarness />)
    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    expect(screen.getByRole('button', { name: 'inside' })).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })
})
