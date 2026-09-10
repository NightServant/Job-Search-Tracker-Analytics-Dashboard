import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { ApplicationRecordView } from '@/components/applications/record/ApplicationRecordView'
import { AppDialog } from '@/components/ui/app-dialog'
import type { Job } from '@/types'

// The record needs no hook mocks: it is a pure component over props, and every
// mutation it can start arrives as a callback the route supplies. That is why
// this file mocks nothing -- there is nothing here to mock.
//
// IT RENDERS `ApplicationRecordView`, not the `ApplicationForm` it used to.
// That component was deleted on 2026-09-09: the record shows and edits the
// same surface now, so a separate form in a separate dialog no longer exists
// to check. The controls being checked are the same controls.

const JOB: Job = {
  id: 'j1',
  user_id: 'u1',
  company: 'Acme',
  role: 'Frontend Engineer',
  salary_min: 60000,
  salary_max: 90000,
  salary_currency: 'PHP',
  url: 'https://careers.acme.com/1',
  description: 'We need React and TypeScript.',
  status: 'applied',
  date_applied: '2026-08-25',
  notes: null,
  contact_name: null,
  contact_email: null,
  contact_linkedin: null,
  contact_notes: null,
  location: 'Manila',
  work_mode: 'remote',
  source: 'LinkedIn',
  is_referral: false,
  tags: ['fintech'],
  tech_stack: ['react'],
  created_at: '2026-08-20T00:00:00.000Z',
  updated_at: '2026-08-25T00:00:00.000Z',
}

describe('accessibility checks', () => {
  afterEach(() => cleanup())

  it('the application record: labels, button names, and one heading per column', () => {
    // Wrapped in the AppDialog it actually ships inside. The record has no
    // heading of its own -- the dialog supplies the accessible name, the same
    // way a CardContent does not duplicate its CardHeader's heading -- so
    // rendering it bare would test an isolation it never appears in.
    render(
      <AppDialog open onOpenChange={() => {}} title="Frontend Engineer" size="xl">
        <ApplicationRecordView
          job={JOB}
          defaultCurrency="PHP"
          onSubmit={async () => {}}
        />
      </AppDialog>
    )

    // Ensure all form controls with ids have associated labels.
    //
    // `aria-hidden` controls are excluded, and that is a correction rather
    // than a loophole. Base UI's Select renders a 1px, `tabindex="-1"`,
    // `aria-hidden="true"` input purely so a native form submission carries
    // the value -- it is not in the accessibility tree and cannot be reached
    // by keyboard. Labelling it would put a control into the tree that should
    // not be there, which is the opposite of what this test is protecting.
    // Anything a user can actually reach is still covered.
    const controls = Array.from(
      document.querySelectorAll('input[id], select[id], textarea[id]')
    ).filter((el) => el.getAttribute('aria-hidden') !== 'true')
    expect(controls.length).toBeGreaterThan(0)
    for (const el of controls) {
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

    // The dialog names itself, and the two columns that are not a run of
    // fields name themselves too. Asserted by name rather than by count: a
    // number is something nobody can read a reason into.
    expect(screen.getByRole('heading', { level: 2, name: 'Frontend Engineer' })).toBeTruthy()
    for (const column of ['job description', 'ATS match']) {
      expect(screen.getByRole('heading', { name: column })).toBeTruthy()
    }

    // The pipeline bar is an ordered list with a name, not a row of coloured
    // rules a screen reader walks past in silence.
    expect(screen.getByLabelText('Application progress')).toBeTruthy()
  })
})
