import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApplicationForm } from '../ApplicationForm'
import { resolveDefaultCurrency } from '@/services/userPreferences'

/**
 * Auto-fill applies `work_mode`.
 *
 * IT NEVER DID, for as long as the feature has existed. The extractor computed
 * it -- from JSON-LD's `jobLocationType` and from the page text, with a
 * confidence score attached -- and `JobAutofillResult` did not declare the
 * field, so the form could not read it and dropped it every time. Nothing
 * failed; a select just never filled in. Found by M7's field-parity test
 * (scraper/tests/test_contract.py), which now makes the two sides unable to
 * disagree.
 */
describe('auto-fill and work mode', () => {
  const fill = (values: Record<string, unknown>) =>
    vi.fn().mockResolvedValue({ values, confidence: {}, warnings: [] })

  async function autofillWith(values: Record<string, unknown>) {
    const onAutofill = fill(values)
    render(
      <ApplicationForm defaultCurrency={resolveDefaultCurrency(null)} onAutofill={onAutofill} />
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/posting URL/i), 'https://careers.example.com/j/1')
    await user.click(screen.getByRole('button', { name: /auto-?fill/i }))
    return onAutofill
  }

  it('fills the work mode the extractor found', async () => {
    await autofillWith({ company: 'Acme', role: 'Engineer', work_mode: 'remote' })
    expect(await screen.findByDisplayValue(/remote/i)).toBeInTheDocument()
  })

  it('ignores a work mode that is not one of the three the form knows', async () => {
    // It arrives from a remote page. An unrecognised string would put the
    // select into a state none of its options match, which renders as an empty
    // control the user cannot explain.
    await autofillWith({ company: 'Acme', role: 'Engineer', work_mode: 'from-the-moon' })
    expect(screen.queryByDisplayValue(/from-the-moon/i)).toBeNull()
  })
})

/**
 * The same defect class, found the same way, on 2026-09-06.
 *
 * Auto-fill reported "Salary was not found in page metadata" on a page that
 * stated one plainly: the extractor's range pattern was dollar-only, so a
 * Philippine posting's `₱50,000 - ₱70,000` could never match. Fixing the
 * pattern surfaced the second half of the problem -- a currency the contract
 * had no field for, which would have stored pesos under whichever default
 * happened to be set.
 *
 * The description was simply never extracted at all, and it is the field that
 * matters most: the ATS keyword match reads it and AI tailoring is given it,
 * so both were working from an empty string.
 */
describe('auto-fill, salary currency and the posting body', () => {
  const fill = (values: Record<string, unknown>) =>
    vi.fn().mockResolvedValue({ values, confidence: {}, warnings: [] })

  async function autofillWith(values: Record<string, unknown>) {
    render(
      <ApplicationForm
        defaultCurrency={resolveDefaultCurrency(null)}
        onAutofill={fill(values)}
      />
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/posting URL/i), 'https://careers.example.com/j/1')
    await user.click(screen.getByRole('button', { name: /auto-?fill/i }))
  }

  it('fills the currency the salary was quoted in', async () => {
    await autofillWith({ salary_min: 50000, salary_max: 70000, salary_currency: 'PHP' })
    expect(await screen.findByDisplayValue('50000')).toBeInTheDocument()
    expect(screen.getByLabelText(/currency/i)).toHaveTextContent('PHP')
  })

  it('takes a foreign currency rather than assuming the default', async () => {
    // The whole point: a USD posting must not be stored as pesos because that
    // is what this user's default happens to be.
    await autofillWith({ salary_min: 120000, salary_max: 150000, salary_currency: 'USD' })
    expect(await screen.findByDisplayValue('120000')).toBeInTheDocument()
    expect(screen.getByLabelText(/currency/i)).toHaveTextContent('USD')
  })

  it('ignores a currency the form cannot store', async () => {
    // It arrives from a remote page, and an unrecognised code would fail the
    // jobs_salary_currency_check constraint at the insert rather than here.
    await autofillWith({ salary_min: 1000, salary_max: 2000, salary_currency: 'XYZ' })
    expect(await screen.findByDisplayValue('1000')).toBeInTheDocument()
    expect(screen.getByLabelText(/currency/i)).not.toHaveTextContent('XYZ')
  })

  it('fills the posting body', async () => {
    await autofillWith({ description: 'Build things. React, TypeScript.' })
    expect(await screen.findByDisplayValue(/Build things\./)).toBeInTheDocument()
  })

  it('does not overwrite a description already typed', async () => {
    render(
      <ApplicationForm
        defaultCurrency={resolveDefaultCurrency(null)}
        onAutofill={fill({ description: 'scraped body' })}
      />
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/job description/i), 'my own notes')
    await user.type(screen.getByLabelText(/posting URL/i), 'https://careers.example.com/j/1')
    await user.click(screen.getByRole('button', { name: /auto-?fill/i }))
    expect(screen.getByLabelText(/job description/i)).toHaveValue('my own notes')
  })
})

describe('auto-fill, tech stack and tags', () => {
  const fill = (values: Record<string, unknown>) =>
    vi.fn().mockResolvedValue({ values, confidence: {}, warnings: [] })

  async function autofillWith(values: Record<string, unknown>) {
    render(
      <ApplicationForm
        defaultCurrency={resolveDefaultCurrency(null)}
        onAutofill={fill(values)}
      />
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/posting URL/i), 'https://careers.example.com/j/1')
    await user.click(screen.getByRole('button', { name: /auto-?fill/i }))
  }

  it('fills the tech stack as a comma list', async () => {
    // `tech_stack` is what the ATS keyword match reads, so an empty one scored
    // a CV against nothing.
    await autofillWith({ tech_stack: ['React', 'TypeScript', 'GraphQL'] })
    expect(await screen.findByDisplayValue('React, TypeScript, GraphQL')).toBeInTheDocument()
  })

  it('fills the tags', async () => {
    await autofillWith({ tags: ['full-time', 'Software'] })
    expect(await screen.findByDisplayValue('full-time, Software')).toBeInTheDocument()
  })

  it('does not overwrite a tech stack already typed', async () => {
    render(
      <ApplicationForm
        defaultCurrency={resolveDefaultCurrency(null)}
        onAutofill={fill({ tech_stack: ['Scraped'] })}
      />
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/tech stack/i), 'my own list')
    await user.type(screen.getByLabelText(/posting URL/i), 'https://careers.example.com/j/1')
    await user.click(screen.getByRole('button', { name: /auto-?fill/i }))
    expect(screen.getByLabelText(/tech stack/i)).toHaveValue('my own list')
  })

  it('ignores empty arrays rather than clearing the field', async () => {
    await autofillWith({ tech_stack: [], tags: [] })
    expect(screen.getByLabelText(/tech stack/i)).toHaveValue('')
  })
})
