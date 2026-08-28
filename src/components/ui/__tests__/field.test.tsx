import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Field } from '../field'

afterEach(() => cleanup())

describe('Field', () => {
  it('labels its control by id, so the control is reachable by its label text', () => {
    render(
      <Field id="company" label="Company">
        <input id="company" />
      </Field>
    )
    expect(screen.getByLabelText('Company')).toBeTruthy()
  })

  it('marks a required field with a visual asterisk hidden from the accessibility tree', () => {
    render(
      <Field id="role" label="Role" required>
        <input id="role" />
      </Field>
    )
    const asterisk = screen.getByText('*', { exact: false })
    expect(asterisk.getAttribute('aria-hidden')).toBe('true')
  })

  it('omits the asterisk when the field is not required', () => {
    render(
      <Field id="notes" label="Notes">
        <input id="notes" />
      </Field>
    )
    expect(screen.queryByText('*', { exact: false })).toBeNull()
  })

  it('renders a hint under the control when given one', () => {
    render(
      <Field id="currency" label="Currency" hint="Figures are stored in this currency.">
        <input id="currency" />
      </Field>
    )
    expect(screen.getByText('Figures are stored in this currency.')).toBeTruthy()
  })

  it('renders no hint paragraph when none is given', () => {
    const { container } = render(
      <Field id="tags" label="Tags">
        <input id="tags" />
      </Field>
    )
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })

  it('spans two columns on a two-column grid when asked', () => {
    const { container } = render(
      <Field id="url" label="Posting URL" span>
        <input id="url" />
      </Field>
    )
    expect(container.firstElementChild!.className).toContain('sm:col-span-2')
  })
})
