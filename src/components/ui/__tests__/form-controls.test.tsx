import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Select } from '../select'
import { Textarea } from '../textarea'

describe('Select', () => {
  it('is a native select, not a hand-built listbox', () => {
    // Five statuses and six currency codes do not justify re-implementing the
    // platform keyboard model, the mobile wheel and the ARIA.
    const { container } = render(
      <Select id="currency" aria-label="Currency">
        <option value="PHP">PHP</option>
      </Select>
    )
    expect(container.querySelector('select')).toBeTruthy()
    expect(container.querySelector('[role="listbox"]')).toBeNull()
  })

  it('wires its error message to the field the way Input does', () => {
    render(
      <Select id="status" aria-label="Status" error="Pick one">
        <option value="">--</option>
      </Select>
    )
    const field = screen.getByLabelText('Status')
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(field.getAttribute('aria-describedby')).toBe('status-error')
    expect(screen.getByText('Pick one')).toBeTruthy()
  })
})

describe('Textarea', () => {
  it('grows from a minimum rather than being pinned to a row count', () => {
    const { container } = render(<Textarea id="notes" aria-label="Notes" />)
    const field = container.querySelector('textarea')!
    expect(field.className).toContain('min-h-24')
    expect(field.className).toContain('resize-y')
  })

  it('wires its error message to the field the way Input does', () => {
    render(<Textarea id="notes" aria-label="Notes" error="Too long" />)
    const field = screen.getByLabelText('Notes')
    expect(field.getAttribute('aria-describedby')).toBe('notes-error')
    expect(screen.getByText('Too long')).toBeTruthy()
  })
})
