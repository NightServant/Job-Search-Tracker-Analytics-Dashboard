import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddApplicationDialog } from '../record/AddApplicationDialog'
import { ApplicationRecordView } from '../record/ApplicationRecordView'
import type { PostingDigestResult } from '../record/digest'
import { resolveDefaultCurrency } from '@/services/userPreferences'
import type { Job } from '@/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}))

afterEach(() => cleanup())

const CURRENCY = resolveDefaultCurrency(null)

const RESULT = (over: Partial<PostingDigestResult> = {}): PostingDigestResult => ({
  formatted: 'Senior Frontend Engineer at Acme Corp.\n\n- React\n- TypeScript',
  summary: 'Senior Frontend Engineer at Acme Corp.',
  fields: {},
  usedModel: true,
  dropped: [],
  ...over,
})

/**
 * Walks the add wizard to its review step with `onAutofill` returning a
 * description, so the digest has something to run on.
 *
 * THE DIGEST HAS NO BUTTON ANY MORE (Gabe, 2026-09-10: "Remove the tidy and
 * summarize button for both add and view application dialog since the model
 * auto-summarizes the job description"). It runs once, automatically, on the
 * posting the extractor fetched -- so this is the only path that reaches it,
 * and testing it here is testing the thing that actually ships.
 */
async function digestWith(result: PostingDigestResult, description = 'messy   posting  text') {
  const onDigest = vi.fn().mockResolvedValue(result)
  const onAutofill = vi.fn().mockResolvedValue({
    values: { description },
    confidence: {},
    warnings: [],
  })
  render(
    <AddApplicationDialog
      open
      onOpenChange={vi.fn()}
      defaultCurrency={CURRENCY}
      onSubmit={vi.fn()}
      onAutofill={onAutofill}
      onDigest={onDigest}
    />
  )
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/job posting url/i), 'https://careers.example.com/j/1')
  await user.click(screen.getByRole('button', { name: /continue/i }))
  await user.click(screen.getByRole('button', { name: /fill it in/i }))
  await screen.findByRole('button', { name: /save application/i })
  return onDigest
}

/**
 * THE PATH FOR THE BOARDS NO SERVER CAN FETCH. The wizard needs a URL our
 * servers can read; several cannot be read at all -- JavaScript-rendered
 * postings, and sites that refuse datacenter traffic. Where the fetch does
 * work, this is what turns eight hundred words of advert into something worth
 * reading before it is ever saved.
 */
describe('the posting is tidied and summarised on the way in', () => {
  it('runs without being asked, and offers no button to ask with', async () => {
    const onDigest = await digestWith(RESULT())
    expect(onDigest).toHaveBeenCalledTimes(1)
    expect(onDigest).toHaveBeenCalledWith('messy   posting  text')
    expect(screen.queryByRole('button', { name: /tidy and summarise/i })).toBeNull()
  })

  it('replaces the description with the tidied text', async () => {
    await digestWith(RESULT())
    expect(screen.getByText(/React/)).toBeInTheDocument()
  })

  it('shows the summary above the posting it summarises', async () => {
    // SCOPED TO THE SUMMARY BLOCK. The tidied posting opens with the same
    // sentence -- that is what an extractive summary IS -- so a bare text
    // query finds it twice and proves nothing about where it landed.
    await digestWith(RESULT())
    const summary = document.querySelector('[data-posting-summary]')!
    expect(summary.textContent).toContain('Senior Frontend Engineer at Acme Corp.')
    const body = document.querySelector('[data-posting-body]')
    expect(body && summary.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy()
  })

  it('fills empty fields from what the digest mined out of the posting', async () => {
    await digestWith(RESULT({ fields: { company: 'Acme Corp', role: 'Senior Frontend Engineer' } }))
    expect(screen.getByLabelText(/^company/i)).toHaveValue('Acme Corp')
    expect(screen.getByLabelText(/^position/i)).toHaveValue('Senior Frontend Engineer')
  })

  it('never overwrites what the extractor already found', async () => {
    // THE ORDERING TRAP THIS EXISTS FOR. Auto-fill and the digest run in one
    // pass, so a caller comparing against the draft it closed over would read
    // the state from BEFORE auto-fill landed -- and the digest, which mines
    // the same fields less reliably, would win. `fillEmpty` uses the
    // functional updater precisely so it cannot.
    const onDigest = vi.fn().mockResolvedValue(RESULT({ fields: { company: 'Guessed Corp' } }))
    const onAutofill = vi.fn().mockResolvedValue({
      values: { company: 'Extracted Corp', description: 'posting body' },
      confidence: {},
      warnings: [],
    })
    render(
      <AddApplicationDialog
        open
        onOpenChange={vi.fn()}
        defaultCurrency={CURRENCY}
        onSubmit={vi.fn()}
        onAutofill={onAutofill}
        onDigest={onDigest}
      />
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/job posting url/i), 'https://careers.example.com/j/1')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /fill it in/i }))
    await screen.findByRole('button', { name: /save application/i })

    expect(screen.getByLabelText(/^company/i)).toHaveValue('Extracted Corp')
  })

  it('ignores a currency the record cannot store', async () => {
    // It arrives from a remote page, and an unrecognised code would fail the
    // jobs_salary_currency_check constraint at the insert rather than here.
    await digestWith(RESULT({ fields: { salary_min: 1000, salary_currency: 'XYZ' as never } }))
    expect(screen.getByLabelText(/min salary/i)).toHaveValue(1000)
    expect(screen.getByLabelText(/currency/i)).not.toHaveTextContent('XYZ')
  })

  it('keeps the fetched description when the summary itself fails', async () => {
    // Its own try/catch in `goRead`: a provider outage must not throw away a
    // posting the fetch did recover, which is the expensive half.
    const onDigest = vi.fn().mockRejectedValue(new Error('provider is down'))
    const onAutofill = vi.fn().mockResolvedValue({
      values: { description: 'the untidied posting body' },
      confidence: {},
      warnings: [],
    })
    render(
      <AddApplicationDialog
        open
        onOpenChange={vi.fn()}
        defaultCurrency={CURRENCY}
        onSubmit={vi.fn()}
        onAutofill={onAutofill}
        onDigest={onDigest}
      />
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/job posting url/i), 'https://careers.example.com/j/1')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /fill it in/i }))
    await screen.findByRole('button', { name: /save application/i })

    expect(screen.getByText(/the untidied posting body/)).toBeInTheDocument()
  })

  it('is not attempted at all when the fetch returned no posting body', async () => {
    const onDigest = vi.fn()
    const onAutofill = vi.fn().mockResolvedValue({
      values: { company: 'Acme' },
      confidence: {},
      warnings: [],
    })
    render(
      <AddApplicationDialog
        open
        onOpenChange={vi.fn()}
        defaultCurrency={CURRENCY}
        onSubmit={vi.fn()}
        onAutofill={onAutofill}
        onDigest={onDigest}
      />
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/job posting url/i), 'https://careers.example.com/j/1')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /fill it in/i }))
    await screen.findByRole('button', { name: /save application/i })

    expect(onDigest).not.toHaveBeenCalled()
  })
})

/**
 * A blank record, for the description column's own behaviour below.
 */
function renderRecord(props: Partial<React.ComponentProps<typeof ApplicationRecordView>> = {}) {
  return render(
    <ApplicationRecordView
      job={null}
      defaultCurrency={CURRENCY}
      onSubmit={vi.fn()}
      {...props}
    />
  )
}

/**
 * The description at rest, which is NOT a textarea (Gabe, 2026-09-09: "Remove
 * the text area but display the job description with proper format").
 */
describe('the job description at rest', () => {
  const JOB: Job = {
    id: 'j1',
    user_id: 'u1',
    company: 'Acme',
    role: 'Frontend Engineer',
    salary_min: null,
    salary_max: null,
    salary_currency: 'PHP',
    url: null,
    description: 'Key Responsibilities:\n- Ship the editor\n- Keep the tests green\n\nA closing paragraph.',
    status: 'applied',
    date_applied: '2026-08-25',
    notes: null,
    contact_name: null,
    contact_email: null,
    contact_linkedin: null,
    contact_notes: null,
    location: null,
    work_mode: null,
    source: null,
    is_referral: false,
    tags: [],
    tech_stack: [],
    created_at: '2026-08-20T00:00:00.000Z',
    updated_at: '2026-08-25T00:00:00.000Z',
  }

  it('renders the posting as a document, not as a field', () => {
    const { container } = renderRecord({ job: JOB })
    expect(container.querySelector('textarea#description')).toBeNull()
    expect(container.querySelector('[data-posting-body]')).toBeTruthy()
    // Consecutive bullets become ONE list. Eight paragraphs each starting with
    // a dash is not a list, it just looks like one until you copy it.
    const items = container.querySelectorAll('[data-posting-body] li')
    expect([...items].map((li) => li.textContent)).toEqual([
      'Ship the editor',
      'Keep the tests green',
    ])
    // A short line ending in a colon is a heading; the closing paragraph is not.
    expect(screen.getByRole('heading', { name: 'Key Responsibilities' })).toBeTruthy()
    expect(screen.getByText('A closing paragraph.').tagName).toBe('P')
  })

  it('becomes a field on the edit icon, and back again', async () => {
    const user = userEvent.setup()
    const { container } = renderRecord({ job: JOB })
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(container.querySelector('textarea#description')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /^done$/i }))
    expect(container.querySelector('textarea#description')).toBeNull()
  })

  it('opens as a field when there is nothing to read', () => {
    // A person looking at a blank column should not have to work out that a
    // button turns it into one.
    const { container } = renderRecord({ job: { ...JOB, description: null } })
    expect(container.querySelector('textarea#description')).toBeTruthy()
  })
})
