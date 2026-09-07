import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApplicationForm, type PostingDigestResult } from '../ApplicationForm'
import { resolveDefaultCurrency } from '@/services/userPreferences'

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

async function digestWith(result: PostingDigestResult, typed = 'messy   posting  text') {
  const onDigest = vi.fn().mockResolvedValue(result)
  render(<ApplicationForm defaultCurrency={CURRENCY} onDigest={onDigest} />)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/job description/i), typed)
  await user.click(screen.getByRole('button', { name: /tidy and summarise/i }))
  return onDigest
}

/**
 * THE PATH FOR THE BOARDS NO SERVER CAN FETCH. Auto-fill needs a URL our
 * servers can read; several cannot be read at all -- JavaScript-rendered
 * postings, and sites that refuse datacenter traffic. Copying the posting into
 * the box always works, and this makes that paste as useful as a fetch.
 */
describe('tidy and summarise', () => {
  it('does nothing until there is a description to work on', () => {
    render(<ApplicationForm defaultCurrency={CURRENCY} onDigest={vi.fn()} />)
    expect(screen.getByRole('button', { name: /tidy and summarise/i })).toBeDisabled()
  })

  it('is absent entirely when the caller offers no handler', () => {
    render(<ApplicationForm defaultCurrency={CURRENCY} />)
    expect(screen.queryByRole('button', { name: /tidy and summarise/i })).toBeNull()
  })

  it('replaces the description with the tidied text', async () => {
    // Reformatting text the user pasted is the thing they asked for.
    await digestWith(RESULT())
    expect(await screen.findByDisplayValue(/- React/)).toBeInTheDocument()
  })

  it('fills empty fields but never overwrites a typed one', async () => {
    const onDigest = vi.fn().mockResolvedValue(
      RESULT({ fields: { company: 'Acme Corp', role: 'Senior Frontend Engineer' } })
    )
    render(<ApplicationForm defaultCurrency={CURRENCY} onDigest={onDigest} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/^company/i), 'My Own Entry')
    await user.type(screen.getByLabelText(/job description/i), 'posting')
    await user.click(screen.getByRole('button', { name: /tidy and summarise/i }))

    expect(screen.getByLabelText(/^company/i)).toHaveValue('My Own Entry')
    expect(await screen.findByDisplayValue('Senior Frontend Engineer')).toBeInTheDocument()
  })

  it('shows the summary it produced', async () => {
    // Scoped to the note: the same words are in the tidied description above
    // it, which is the point -- the summary is extracted, not written.
    await digestWith(RESULT())
    const note = await screen.findByText(/^Summary:/)
    expect(note.textContent).toContain('Senior Frontend Engineer at Acme Corp.')
  })

  it('says when the model returned values the posting does not contain', async () => {
    // A silent drop looks exactly like the model getting it right, and
    // whether anything was invented is the one thing worth knowing about a
    // generated field.
    await digestWith(RESULT({ dropped: ['company: "Google"', 'salary_min: 90000'] }))
    expect(await screen.findByText(/Ignored 2 values the posting does not actually contain/i))
      .toBeInTheDocument()
  })

  it('says so when nothing was invented', async () => {
    await digestWith(RESULT())
    expect(await screen.findByText(/Every field was found in the posting/i)).toBeInTheDocument()
  })

  it('surfaces a failure instead of silently doing nothing', async () => {
    const onDigest = vi.fn().mockRejectedValue(new Error('provider is down'))
    render(<ApplicationForm defaultCurrency={CURRENCY} onDigest={onDigest} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/job description/i), 'posting')
    await user.click(screen.getByRole('button', { name: /tidy and summarise/i }))
    expect(await screen.findByText(/provider is down/)).toBeInTheDocument()
  })

  it('ignores a currency the form cannot store', async () => {
    await digestWith(RESULT({ fields: { salary_min: 1000, salary_currency: 'XYZ' as never } }))
    expect(await screen.findByDisplayValue('1000')).toBeInTheDocument()
    expect(screen.getByLabelText(/currency/i)).not.toHaveTextContent('XYZ')
  })
})

/**
 * THE PATH THAT MAKES PRODUCTION WORK. The deployed extractor cannot render
 * JavaScript -- `playwright` installs on Vercel and its Chromium never does --
 * so JobStreet answers a challenge and Cloudstaff an empty shell. The browser
 * looking at the posting is a browser, so it can hand the page over. No
 * credential changes hands: the file is HTML.
 */
describe('uploading a saved page for auto-fill', () => {
  const AUTOFILL = { values: { company: 'Acme' }, confidence: {}, warnings: [] }

  it('is offered whenever auto-fill is', () => {
    render(<ApplicationForm defaultCurrency={CURRENCY} onAutofill={vi.fn()} />)
    expect(screen.getByRole('button', { name: /upload saved page/i })).toBeTruthy()
  })

  it('is absent when the caller offers no auto-fill at all', () => {
    render(<ApplicationForm defaultCurrency={CURRENCY} />)
    expect(screen.queryByRole('button', { name: /upload saved page/i })).toBeNull()
  })

  it('sends the file contents alongside the URL', async () => {
    const onAutofill = vi.fn().mockResolvedValue(AUTOFILL)
    const { container } = render(
      <ApplicationForm defaultCurrency={CURRENCY} onAutofill={onAutofill} />
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/posting URL/i), 'https://ph.jobstreet.com/job/1')

    // `fireEvent`, not `userEvent`: the input is `sr-only` and userEvent
    // refuses to interact with it. That is correct for a real user too -- they
    // never touch this input, they click the button, which calls `.click()`
    // on it. The change event is what the handler actually listens for.
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: {
        files: [
          new File(['<html><body>the posting</body></html>'], 'job.html', {
            type: 'text/html',
          }),
        ],
      },
    })

    await waitFor(() =>
      expect(onAutofill).toHaveBeenCalledWith(
        'https://ph.jobstreet.com/job/1',
        '<html><body>the posting</body></html>'
      )
    )
  })

  it('still needs a URL, because that is what the result is attributed to', async () => {
    const onAutofill = vi.fn().mockResolvedValue(AUTOFILL)
    const { container } = render(
      <ApplicationForm defaultCurrency={CURRENCY} onAutofill={onAutofill} />
    )
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['<html></html>'], 'job.html', { type: 'text/html' })] },
    })
    expect(await screen.findByText(/Enter a job posting URL first/i)).toBeInTheDocument()
    expect(onAutofill).not.toHaveBeenCalled()
  })
})
