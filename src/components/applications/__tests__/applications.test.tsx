import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApplicationsPage } from '../ApplicationsPage'
import { ApplicationForm } from '../ApplicationForm'
import { StatusTabs, STATUS_TABS, type StatusTabValue } from '../StatusTabs'
import { makeJob } from '@/test/fixtures'
import type { Job } from '@/types'

const JOBS: Job[] = [
  makeJob({ id: '1', status: 'wishlist', company: 'Initech' }),
  makeJob({ id: '2', status: 'applied', company: 'Globex' }),
  makeJob({ id: '3', status: 'interviewing', company: 'Umbrella' }),
  makeJob({ id: '4', status: 'interviewing', company: 'Soylent' }),
  makeJob({ id: '5', status: 'offer', company: 'Hooli' }),
  makeJob({ id: '6', status: 'rejected', company: 'Vandelay' }),
]

afterEach(() => cleanup())

describe('ApplicationsPage', () => {
  it('renders the same flat list at every width, not a mobile-only fallback', () => {
    // Gabe, verbatim, correcting two earlier misreads of this task: "I said
    // remove the sorting itself, not redesign it" -- the kanban's five status
    // columns WERE the sorting. There is no board any more, at any
    // breakpoint, so there is nothing left to hide below 768px.
    const { container } = render(<ApplicationsPage jobs={JOBS} />)
    expect(container.querySelector('[data-kanban]')).toBeNull()
    expect(container.querySelector('[data-list]')!.className).not.toContain('md:hidden')
    expect(screen.getAllByTestId('application-row')).toHaveLength(JOBS.length)
  })

  it('filters the list by the selected status tab, all being every application ungrouped', () => {
    render(<ApplicationsPage jobs={JOBS} />)
    fireEvent.click(screen.getByRole('tab', { name: /interviewing/i }))
    const rows = screen.getAllByTestId('application-row')
    expect(rows).toHaveLength(JOBS.filter((j) => j.status === 'interviewing').length)
    fireEvent.click(screen.getByRole('tab', { name: /^all/i }))
    expect(screen.getAllByTestId('application-row')).toHaveLength(JOBS.length)
  })

  it('shows "not applied" on the row for a job with no applied date, never a raw fallback string', () => {
    // Regression for the list disagreeing with the dashboard about what an
    // unset date_applied renders as -- both now go through the same
    // formatAppliedDate rather than each inventing its own literal.
    // The second assertion used to forbid the lowercase literal, back when the
    // friendly label was title-case. Chrome is lowercase now (Item 10), so
    // that pair contradicted itself -- the label IS "not applied". Restored to
    // the original intent: show the label, never leak a raw timestamp or a
    // stringified null from created_at.
    const notYetApplied = makeJob({
      id: '7',
      status: 'wishlist',
      date_applied: null,
      created_at: '2026-08-20T14:23:01.123456+00:00',
    })
    render(<ApplicationsPage jobs={[notYetApplied]} />)
    expect(screen.getByText('not applied')).toBeTruthy()
    expect(screen.queryByText(/2026-08-20T/)).toBeNull()
    expect(screen.queryByText(/^null$/i)).toBeNull()
  })

  it('splits the rows across pages and moves between them', () => {
    // M5 Task 4 removed the original 20-per-page pagination along with the
    // advanced filters; Gabe asked for it back.
    const many = Array.from({ length: 45 }, (_, i) =>
      makeJob({ id: `p${i}`, status: 'applied', company: `Co ${i}` })
    )
    render(<ApplicationsPage jobs={many} />)
    expect(screen.getAllByTestId('application-row')).toHaveLength(10)
    expect(screen.getByText(/1.*10 of 45/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '5' }))
    // 45 rows over 10 a page leaves 5 on the last one -- a slice that returned
    // a full page here would mean the offset maths is wrong.
    expect(screen.getAllByTestId('application-row')).toHaveLength(5)
  })

  it('returns to the first page when a search changes the result set', () => {
    // Otherwise narrowing the list while on page 3 leaves the user staring at
    // an empty page with no indication why.
    const many = Array.from({ length: 45 }, (_, i) =>
      makeJob({ id: `p${i}`, status: 'applied', company: `Co ${i}` })
    )
    render(<ApplicationsPage jobs={many} />)
    fireEvent.click(screen.getByRole('button', { name: '5' }))
    expect(screen.getAllByTestId('application-row')).toHaveLength(5)

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Co 1' } })
    expect(screen.getAllByTestId('application-row').length).toBeGreaterThan(5)
  })

  it('marks the selected tab for a screen reader, not just visually', () => {
    render(<ApplicationsPage jobs={JOBS} />)
    const tab = screen.getByRole('tab', { name: /interviewing/i })
    fireEvent.click(tab)
    expect(tab.getAttribute('aria-selected')).toBe('true')
  })

  it('carries Add in the body header rather than the toolbar', () => {
    // The roadmap flagged Add sitting in the Top Bar as the last inconsistency
    // against Documents' "+ new cv". The body header is where it gets fixed.
    const { container } = render(<ApplicationsPage jobs={JOBS} />)
    const header = container.querySelector('[data-body-header]')!
    expect(header.querySelector('button')!.textContent).toContain('add')
  })

  it('narrows the list by the search box', () => {
    render(<ApplicationsPage jobs={JOBS} />)
    fireEvent.change(screen.getByLabelText('Search applications'), {
      target: { value: 'hooli' },
    })
    expect(screen.getAllByTestId('application-row')).toHaveLength(1)
  })

  it('keeps each tab\'s count of every application, not just the ones currently shown', () => {
    render(<ApplicationsPage jobs={JOBS} />)
    const offerTab = screen.getByRole('tab', { name: /offer/i })
    expect(offerTab.textContent).toContain(String(JOBS.filter((j) => j.status === 'offer').length))
  })

  it('shows a real empty state, not a blank panel, for a status with zero applications', async () => {
    const noRejected = JOBS.filter((job) => job.status !== 'rejected')
    render(<ApplicationsPage jobs={noRejected} />)
    await userEvent.click(screen.getByRole('tab', { name: /rejected/i }))
    expect(screen.queryAllByTestId('application-row')).toHaveLength(0)
    expect(screen.getByText(/no rejected applications yet/i)).toBeTruthy()
  })

  it('states the status with a rule and a label, never a pill', () => {
    const { container } = render(<ApplicationsPage jobs={JOBS} />)
    const rules = container.querySelectorAll('[data-status-rule]')
    expect(rules.length).toBeGreaterThan(0)
    rules.forEach((rule) => expect(rule.className).toContain('rounded-none'))
  })

  it('says there are no applications at all, before any tab or search narrows the list', () => {
    render(<ApplicationsPage jobs={[]} />)
    expect(screen.getByText(/no applications yet/i)).toBeTruthy()
  })

  it('keeps the form open with the typed data when the save is rejected', async () => {
    // The route handlers catch and used to swallow every failure, so the
    // promise always resolved and the panel always closed -- a pasted job
    // description vanished behind a toast on an RLS denial. onCreate now
    // resolves to false on that same caught failure, and the panel has to
    // stay open with the field intact instead of discarding it.
    const onCreate = vi.fn().mockResolvedValue(false)
    render(<ApplicationsPage jobs={JOBS} onCreate={onCreate} />)
    fireEvent.click(screen.getByRole('button', { name: 'add' }))
    fireEvent.change(screen.getByLabelText(/^company/), { target: { value: 'Acme' } })
    fireEvent.change(screen.getByLabelText(/^role/), { target: { value: 'Engineer' } })
    fireEvent.click(screen.getByRole('button', { name: /add application/i }))
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('heading', { name: /new application/i })).toBeTruthy()
    expect(screen.getByLabelText(/^company/)).toHaveValue('Acme')
  })

  it('closes the form only once the save resolves successfully', async () => {
    const onCreate = vi.fn().mockResolvedValue(true)
    render(<ApplicationsPage jobs={JOBS} onCreate={onCreate} />)
    fireEvent.click(screen.getByRole('button', { name: 'add' }))
    fireEvent.change(screen.getByLabelText(/^company/), { target: { value: 'Acme' } })
    fireEvent.change(screen.getByLabelText(/^role/), { target: { value: 'Engineer' } })
    fireEvent.click(screen.getByRole('button', { name: /add application/i }))
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /new application/i })).toBeNull()
    )
  })

  it('keeps the parsed CSV state when the import is rejected', async () => {
    const onImport = vi.fn().mockResolvedValue(false)
    const file = {
      name: 'jobs.csv',
      text: () => Promise.resolve('company,role\nAcme,Engineer'),
    } as unknown as File
    render(<ApplicationsPage jobs={JOBS} onImport={onImport} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await screen.findByText(/jobs\.csv/i)
    fireEvent.click(screen.getByRole('button', { name: /^import 1$/i }))
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1))
    expect(screen.getByText(/jobs\.csv/i)).toBeTruthy()
  })

  it('reports a failed CSV read instead of leaving an unhandled rejection', async () => {
    // handleCsvFile had no try/catch: a throw from file.text() or Papa became
    // an unhandled rejection with no user feedback, the same failure-eats-work
    // shape as a rejected save.
    const onCsvError = vi.fn()
    const brokenFile = {
      name: 'broken.csv',
      text: () => Promise.reject(new Error('disk error')),
    } as unknown as File
    render(<ApplicationsPage jobs={JOBS} onCsvError={onCsvError} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [brokenFile] } })
    await waitFor(() => expect(onCsvError).toHaveBeenCalledWith('disk error'))
    expect(screen.queryByText(/broken\.csv/i)).toBeNull()
  })

  it('moves focus into the dialog and onto the first field on Edit, with no scroll compensation needed', async () => {
    // A card low on a five-column board used to be off-screen from where the
    // inline section opened, so ApplicationsPage carried its own
    // scrollIntoView + .focus() effect to compensate. A dialog is centred in
    // the viewport regardless of where its trigger sits, and Base UI's own
    // focus trap moves focus in on open -- so that compensation is gone, and
    // this pins the dialog's own behaviour rather than assuming it.
    const user = userEvent.setup()
    render(<ApplicationsPage jobs={JOBS} />)
    await user.click(screen.getAllByRole('button', { name: /^edit/i })[0])
    expect(screen.getByLabelText(/^company/)).toHaveFocus()
  })

  it('returns focus to the Edit trigger that opened the dialog once it closes', async () => {
    const user = userEvent.setup()
    render(<ApplicationsPage jobs={JOBS} />)
    const trigger = screen.getAllByRole('button', { name: /^edit/i })[0]
    await user.click(trigger)
    expect(screen.getByLabelText(/^company/)).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })

  it('asks before discarding a dirty form on Escape, an overlay click or the header close button', async () => {
    const user = userEvent.setup()
    render(<ApplicationsPage jobs={JOBS} />)
    await user.click(screen.getByRole('button', { name: 'add' }))
    await user.type(screen.getByLabelText(/^company/), 'Acme')

    await user.keyboard('{Escape}')
    expect(screen.getByRole('alertdialog', { name: /discard/i })).toBeTruthy()
    // The form dialog is still open and the typed field is still intact --
    // Escape did not drop it, it only raised the question.
    expect(screen.getByLabelText(/^company/)).toHaveValue('Acme')

    await user.click(screen.getByRole('button', { name: 'cancel' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.getByLabelText(/^company/)).toHaveValue('Acme')

    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(screen.queryByLabelText(/^company/)).toBeNull()
  })

  it('closes an untouched form immediately on Escape, with no discard prompt', async () => {
    const user = userEvent.setup()
    render(<ApplicationsPage jobs={JOBS} />)
    await user.click(screen.getByRole('button', { name: 'add' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.queryByLabelText(/^company/)).toBeNull()
  })

  it('still lets Cancel close a dirty form immediately, the same as it always has', async () => {
    // Cancel predates the dialog and was never a defect Gabe raised -- only
    // the three dismiss paths a dialog adds (Escape, overlay, header close)
    // get the discard prompt.
    const user = userEvent.setup()
    render(<ApplicationsPage jobs={JOBS} />)
    await user.click(screen.getByRole('button', { name: 'add' }))
    await user.type(screen.getByLabelText(/^company/), 'Acme')
    await user.click(screen.getByRole('button', { name: 'cancel' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(screen.queryByLabelText(/^company/)).toBeNull()
  })

  it('wires the list as a labelled tabpanel for the selected status tab', () => {
    render(<ApplicationsPage jobs={JOBS} />)
    const panel = document.querySelector('[data-list]')!
    expect(panel.getAttribute('role')).toBe('tabpanel')
    expect(panel.getAttribute('aria-labelledby')).toBe('status-tab-all')
    fireEvent.click(screen.getByRole('tab', { name: /interviewing/i }))
    expect(panel.getAttribute('aria-labelledby')).toBe('status-tab-interviewing')
  })
})

function StatusTabsHarness({ initial }: { initial: StatusTabValue }) {
  const [value, setValue] = React.useState<StatusTabValue>(initial)
  const counts = Object.fromEntries(STATUS_TABS.map((tab) => [tab, 0])) as Record<
    StatusTabValue,
    number
  >
  return <StatusTabs value={value} onChange={setValue} counts={counts} />
}

const ZERO_COUNTS = Object.fromEntries(STATUS_TABS.map((tab) => [tab, 0])) as Record<
  StatusTabValue,
  number
>

// Base UI's composite commits the roving-tabindex focus move inside a
// `queueMicrotask` (it waits one tick for its own FocusManager), unlike the
// hand-rolled `handleKeyDown` this replaces, which called `.focus()`
// synchronously. `userEvent.keyboard` (rather than a raw `fireEvent.keyDown`)
// is what actually flushes that tick correctly -- it is already the
// act-aware, real-event path RTL recommends, and a raw `fireEvent` plus a
// manually awaited microtask left React warning about an update outside
// `act` even when the assertions passed.
async function pressKey(user: ReturnType<typeof userEvent.setup>, key: string) {
  await user.keyboard(`{${key}}`)
}

describe('StatusTabs', () => {
  it('moves focus and selection with ArrowRight/ArrowLeft, wrapping at the ends', async () => {
    const user = userEvent.setup()
    render(<StatusTabsHarness initial="all" />)
    const first = screen.getByRole('tab', { name: /^all/i })
    first.focus()
    await pressKey(user, 'ArrowRight')
    expect(screen.getByRole('tab', { name: /wishlist/i })).toHaveFocus()
    expect(screen.getByRole('tab', { name: /wishlist/i }).getAttribute('aria-selected')).toBe(
      'true'
    )
    await pressKey(user, 'ArrowLeft')
    expect(screen.getByRole('tab', { name: /^all/i })).toHaveFocus()
  })

  it('jumps to the first and last tab on Home and End', async () => {
    const user = userEvent.setup()
    render(<StatusTabsHarness initial="applied" />)
    const current = screen.getByRole('tab', { name: /applied/i })
    current.focus()
    await pressKey(user, 'End')
    expect(screen.getByRole('tab', { name: /rejected/i })).toHaveFocus()
    await pressKey(user, 'Home')
    expect(screen.getByRole('tab', { name: /^all/i })).toHaveFocus()
  })

  it('reaches every tab from the keyboard, not just the selected one', async () => {
    // Roving tabindex with no onKeyDown left five of six tabs unreachable by
    // Tab -- this pins that arrow-key traversal actually visits all six.
    const user = userEvent.setup()
    render(<StatusTabsHarness initial="all" />)
    let current = screen.getByRole('tab', { name: /^all/i })
    current.focus()
    const seen = new Set<string>()
    for (let i = 0; i < STATUS_TABS.length; i += 1) {
      seen.add(current.textContent ?? '')
      await pressKey(user, 'ArrowRight')
      current = document.activeElement as HTMLElement
    }
    expect(seen.size).toBe(STATUS_TABS.length)
  })

  it('is present at desktop widths, not only on mobile', () => {
    // Item 3. The board separates by status but cannot present a sorted view
    // of everything, so the tabs are the sort control at every width.
    const { container } = render(
      <StatusTabs value="all" onChange={vi.fn()} counts={ZERO_COUNTS} />
    )
    const list = container.querySelector('[role="tablist"]')!
    expect(list.className).not.toContain('md:hidden')
    // Positive companion: prove the element is the thing being asserted on.
    expect(list.querySelectorAll('[role="tab"]')).toHaveLength(6)
  })

  it('marks each status tab with its own status colour', () => {
    // Figma 60:674 -- a 6px ellipse per status tab, in the status hue. This is
    // a legend swatch, not the active marker; the active marker stays accent.
    const { container } = render(
      <StatusTabs value="all" onChange={vi.fn()} counts={ZERO_COUNTS} />
    )
    const applied = container.querySelector('#status-tab-applied [data-status-mark]')!
    expect(applied.className).toContain('bg-status-applied-mark')
    // The plan's draft of this test expected `''`, but React's typed
    // `aria-hidden` prop only accepts a `Booleanish` value, and the JSX
    // shorthand `aria-hidden` (as every other `aria-hidden` span in this
    // codebase already uses) renders `"true"`, not an empty string.
    expect(applied.getAttribute('aria-hidden')).toBe('true')
  })

  it('gives the all tab no status colour', () => {
    // "all" is not a status. A sixth hue on it would invent one.
    const { container } = render(
      <StatusTabs value="all" onChange={vi.fn()} counts={ZERO_COUNTS} />
    )
    expect(container.querySelector('#status-tab-all [data-status-mark]')).toBeNull()
  })

  it('keeps the active marker accent, not the status hue', () => {
    const { container } = render(
      <StatusTabs value="offer" onChange={vi.fn()} counts={ZERO_COUNTS} />
    )
    const rule = container.querySelector('#status-tab-offer [data-tab-rule]')!
    expect(rule.className).toContain('bg-accent-default')
    expect(rule.className).not.toContain('status-offer')
  })
})

describe('ApplicationForm', () => {
  it('starts a new application in the stored default currency', () => {
    // A PHP user typing a peso figure into a form defaulted to USD produces a
    // number that is wrong by a factor of 55 and looks plausible.
    render(<ApplicationForm defaultCurrency="PHP" />)
    expect((screen.getByLabelText('currency') as HTMLSelectElement).value).toBe('PHP')
  })

  it('disables submit and shows a spinner while saving', () => {
    render(<ApplicationForm defaultCurrency="PHP" saving />)
    const submit = screen.getByRole('button', { name: /saving/i })
    expect(submit).toHaveProperty('disabled', true)
    expect(submit.querySelector('[role="status"]')).toBeTruthy()
  })

  it('keeps the job own currency when editing rather than the account default', () => {
    // Re-defaulting an existing USD job to the account currency would relabel
    // a stored figure without changing it.
    const job = makeJob({ id: '9', status: 'applied', salary_currency: 'USD' })
    render(<ApplicationForm defaultCurrency="PHP" job={job} />)
    expect((screen.getByLabelText('currency') as HTMLSelectElement).value).toBe('USD')
  })

  it('refuses to submit a job with no company and says why', () => {
    const onSubmit = vi.fn()
    render(<ApplicationForm defaultCurrency="PHP" onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/^role/), { target: { value: 'Engineer' } })
    fireEvent.click(screen.getByRole('button', { name: /add application/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/company is required/i)).toBeTruthy()
  })

  it('submits the typed currency alongside the figures', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ApplicationForm defaultCurrency="PHP" onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/^company/), { target: { value: 'Acme' } })
    fireEvent.change(screen.getByLabelText(/^role/), { target: { value: 'Engineer' } })
    fireEvent.change(screen.getByLabelText('currency'), { target: { value: 'USD' } })
    fireEvent.click(screen.getByRole('button', { name: /add application/i }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      company: 'Acme',
      role: 'Engineer',
      salary_currency: 'USD',
    })
  })

  it('saves with a text button, never an icon', () => {
    // Save was one of the four glyphs M5 eliminated outright.
    const { container } = render(<ApplicationForm defaultCurrency="PHP" />)
    const submit = container.querySelector('button[type="submit"]')!
    expect(submit.textContent!.trim().length).toBeGreaterThan(0)
    expect(submit.querySelector('svg')).toBeNull()
  })
})
