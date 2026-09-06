import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApplicationForm } from '../ApplicationForm'
import { LinkedApplications } from '@/components/cv/LinkedApplications'
import { resolveDefaultCurrency } from '@/services/userPreferences'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}))

afterEach(() => cleanup())

const CURRENCY = resolveDefaultCurrency(null)
const RESUMES = [
  { id: 'r1', title: 'frontend cv' },
  { id: 'r2', title: 'backend cv' },
]

/**
 * The two ends of `application_documents`.
 *
 * Before this pair existed the table had a migration, a service and NO
 * CALLERS: `documentLinkService.pin` and `.unpin` were dead code, and
 * `LinkedCv` rendered "no CV linked" over an application there was no way to
 * link one to. These tests are what keep both ends wired.
 */
describe('the "CV submitted" field on an application', () => {
  it('offers every CV the user has written', async () => {
    render(<ApplicationForm defaultCurrency={CURRENCY} resumes={RESUMES} />)
    await userEvent.click(screen.getByLabelText(/cv submitted/i))
    expect(await screen.findByRole('option', { name: 'frontend cv' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'backend cv' })).toBeTruthy()
  })

  it('reports the chosen CV to the caller', async () => {
    // NOT through JobFormData: the link lives in a different table, keyed on a
    // job id that does not exist yet when creating one.
    const onLinkedResumeChange = vi.fn()
    render(
      <ApplicationForm
        defaultCurrency={CURRENCY}
        resumes={RESUMES}
        onLinkedResumeChange={onLinkedResumeChange}
      />
    )
    await userEvent.click(screen.getByLabelText(/cv submitted/i))
    await userEvent.click(await screen.findByRole('option', { name: 'backend cv' }))
    expect(onLinkedResumeChange).toHaveBeenCalledWith('r2')
  })

  it('reports "none" as null, not as an empty string', async () => {
    // The caller reads null as "remove the link" and undefined as "leave it
    // alone". An empty string would be neither.
    const onLinkedResumeChange = vi.fn()
    render(
      <ApplicationForm
        defaultCurrency={CURRENCY}
        resumes={RESUMES}
        linkedResumeId="r1"
        onLinkedResumeChange={onLinkedResumeChange}
      />
    )
    await userEvent.click(screen.getByLabelText(/cv submitted/i))
    await userEvent.click(await screen.findByRole('option', { name: 'none' }))
    expect(onLinkedResumeChange).toHaveBeenCalledWith(null)
  })

  it('starts on the CV already linked to this application', () => {
    render(
      <ApplicationForm defaultCurrency={CURRENCY} resumes={RESUMES} linkedResumeId="r2" />
    )
    expect(screen.getByLabelText(/cv submitted/i)).toHaveTextContent('backend cv')
  })

  it('says so, rather than offering an empty dropdown, before any CV exists', () => {
    // Somebody tracking their first application has not written a CV yet.
    render(<ApplicationForm defaultCurrency={CURRENCY} resumes={[]} />)
    const field = screen.getByLabelText(/cv submitted/i)
    expect(field).toBeDisabled()
    // Deliberately said twice: once as the field's hint, once as the only
    // thing the disabled control can show.
    expect(screen.getAllByText(/no CVs yet/i).length).toBeGreaterThan(0)
  })

  it('keeps the link out of the submitted job payload', async () => {
    // `resume_id` is not a column on `jobs`; sending it would put a non-column
    // straight into jobService.createJob.
    const onSubmit = vi.fn()
    render(
      <ApplicationForm
        defaultCurrency={CURRENCY}
        resumes={RESUMES}
        onSubmit={onSubmit}
        onLinkedResumeChange={vi.fn()}
      />
    )
    await userEvent.type(screen.getByLabelText(/^company/i), 'Acme')
    await userEvent.type(screen.getByLabelText(/^role/i), 'Engineer')
    await userEvent.click(screen.getByLabelText(/cv submitted/i))
    await userEvent.click(await screen.findByRole('option', { name: 'frontend cv' }))
    await userEvent.click(screen.getByRole('button', { name: /save|add/i }))

    expect(onSubmit).toHaveBeenCalled()
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('resume_id')
  })
})

describe('the applications dropdown in the document editor', () => {
  const LINKS = [
    { job_id: 'j1', company: 'Acme', role: 'Engineer', status: 'applied', sent_at: '2026-09-01' },
    { job_id: 'j2', company: 'Globex', role: 'Developer', status: 'interviewing', sent_at: '2026-08-20' },
  ]

  it('counts the applications this CV went to', () => {
    render(<LinkedApplications links={LINKS} />)
    expect(screen.getByText('sent to 2 applications')).toBeTruthy()
  })

  it('uses the singular for one', () => {
    render(<LinkedApplications links={[LINKS[0]]} />)
    expect(screen.getByText('sent to 1 application')).toBeTruthy()
  })

  it('links each entry to its application record', async () => {
    render(<LinkedApplications links={LINKS} />)
    await userEvent.click(screen.getByRole('button', { name: /applications this CV was sent to/i }))
    // Queried through the text and its anchor: Base UI sets role="menuitem"
    // on the element it renders, which overrides the <a>'s implicit link role.
    const entry = await screen.findByText(/Engineer · Acme/)
    expect(entry.closest('a')).toHaveAttribute('href', '/applications/j1')
  })

  it('stays inside /demo when the demo renders it', async () => {
    render(<LinkedApplications links={LINKS} basePath="/demo/applications" />)
    await userEvent.click(screen.getByRole('button', { name: /applications this CV was sent to/i }))
    const entry = await screen.findByText(/Engineer · Acme/)
    expect(entry.closest('a')).toHaveAttribute('href', '/demo/applications/j1')
  })

  it('says where the link is made when there are none', async () => {
    // Not an empty menu: the control that creates the link is on another
    // screen entirely, so the empty state has to name it.
    render(<LinkedApplications links={[]} />)
    expect(screen.getByText('not sent yet')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: /has not been sent/i }))
    expect(await screen.findByText(/record it in an application/i)).toBeTruthy()
  })
})
