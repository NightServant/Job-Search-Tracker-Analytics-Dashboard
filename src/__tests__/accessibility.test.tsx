import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { ApplicationForm } from '@/components/applications/ApplicationForm'
import { AppDialog } from '@/components/ui/app-dialog'

// ApplicationForm needs no hook mocks: it is a pure component over props, and
// the auto-fill mutation the old JobForm reached for directly now arrives as a
// callback the route supplies. That is why this file no longer mocks
// @/hooks/useJobs -- there is nothing left here to mock.

describe('accessibility checks', () => {
  afterEach(() => cleanup())

  it('ApplicationForm basic accessibility checks (labels, button names)', () => {
    // Task 4 (M5.5) moved ApplicationForm into a dialog and deleted its own
    // internal <h2> -- the AppDialog it always renders inside of now supplies
    // that name, the same way a CardContent does not duplicate its
    // CardHeader's heading. Wrapping it here tests what the app actually
    // renders rather than the form in an isolation it no longer ships in.
    render(
      <AppDialog open onOpenChange={() => {}} title="New application" size="l">
        <ApplicationForm defaultCurrency="PHP" onSubmit={async () => {}} />
      </AppDialog>
    )

    // Ensure all form controls with ids have associated labels
    const controls = document.querySelectorAll('input[id], select[id], textarea[id]')
    expect(controls.length).toBeGreaterThan(0)
    for (const el of Array.from(controls)) {
      const id = el.getAttribute('id')
      if (!id) continue
      const labelled = document.querySelector(`label[for="${id}"]`) || el.closest('label')
      expect(labelled, `Form control with id="${id}" should have a label`).toBeTruthy()
    }

    // Ensure buttons have accessible names
    const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[]
    for (const btn of buttons) {
      const name = btn.getAttribute('aria-label') || btn.textContent || ''
      expect(name.trim().length, 'Buttons should have accessible names').toBeGreaterThan(0)
    }

    // Sanity: the form names itself
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy()
  })
})
