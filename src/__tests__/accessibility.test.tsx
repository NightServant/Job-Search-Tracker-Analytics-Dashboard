import { describe, it, expect, vi } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'

// Mock hooks used by JobForm to avoid network calls and react-query complexity.
vi.mock('@/hooks/useJobs', () => ({
  useAutofillJobFromUrl: () => ({
    mutateAsync: async (_url: string) => ({ values: {}, warnings: [] }),
    isPending: false,
  }),
  useJobStatusHistory: (_jobId?: string) => ({ data: [], isLoading: false }),
}))

import JobForm from '@/components/jobs/JobForm'

describe('accessibility checks', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('JobForm basic accessibility checks (labels, button names)', async () => {
    const onSubmit = vi.fn(async () => {})
    render(<JobForm isOpen={true} onClose={() => {}} onSubmit={onSubmit} />)

    // Ensure all form controls with ids have associated labels
    const controls = document.querySelectorAll('input[id], select[id], textarea[id]')
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

    // Sanity: dialog header exists
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy()
  })
})
