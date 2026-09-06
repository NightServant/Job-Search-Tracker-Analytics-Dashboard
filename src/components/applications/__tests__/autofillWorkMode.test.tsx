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
