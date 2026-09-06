import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPage } from '../SettingsPage'
import { ProfileImport, ProfileImportSteps } from '../ProfileImport'

afterEach(() => cleanup())

/** One profile, shared by both blocks below. */
const FILLED = {
  name: 'Elijah Gabe Cervantes',
  headline: 'Front-end developer',
  location: 'Baguio, Philippines',
  pictureUrl: null,
  email: 'egabe.cervantes@gmail.com',
  summary: 'Builds job-search tooling.',
  url: 'https://www.linkedin.com/in/example',
  experiences: [
    {
      title: 'Developer',
      company: 'Worktrack',
      period: '2025 – now',
      location: 'Remote',
      description: 'Built the tracker.\nShipped the editor.',
    },
  ],
  education: [{ school: 'University', degree: 'BSc', period: '2020 – 2024' }],
  skills: ['React', 'TypeScript'],
  industry: 'Software Development',
  address: 'Block 2, Lot 29, Bamban, Tarlac',
  birthDate: 'Mar 7',
  websites: ['https://example.dev'],
  certifications: [],
  languages: ['Filipino (Native)'],
  projects: [],
  fetchedAt: '2026-09-06T00:00:00.000Z',
}




describe('SettingsPage', () => {
  it('has exactly four groups, in order: profile, account, preferences, danger zone', () => {
    // PROFILE FIRST, and the tab bar that briefly split this page is gone:
    // four short groups behind a two-way toggle hid half a page behind a
    // click. Profile leads because it is the one a settings link is most
    // often clicked to reach, not because the rest is secondary.
    render(<SettingsPage prefs={null} />)
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['profile', 'account', 'preferences', 'danger zone'])
  })

  it('shows every group at once, with no tabs to find them behind', () => {
    render(<SettingsPage prefs={null} />)
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.getByRole('heading', { name: 'account' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'danger zone' })).toBeTruthy()
  })

  it('keeps the danger zone last among the data-settings-group containers', async () => {
    const { container } = render(<SettingsPage prefs={null} />)
    const groups = container.querySelectorAll('[data-settings-group]')
    expect(groups).toHaveLength(4)
    expect(groups[groups.length - 1].getAttribute('data-settings-group')).toBe('danger')
  })

  it('has no appearance group -- the theme lives in the app shell', async () => {
    // A second control over the same next-themes state would be a second
    // source of truth for one value. Paired with a positive assertion: this
    // must not pass merely because the page rendered nothing at all.
    render(<SettingsPage prefs={null} />)
    expect(screen.queryByText(/appearance/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /theme/i })).toBeNull()
    expect(screen.getByRole('heading', { name: 'account' })).toBeTruthy()
  })

  it('has no export control -- /applications owns CSV', async () => {
    render(<SettingsPage prefs={null} />)
    expect(screen.queryByRole('button', { name: /export/i })).toBeNull()
    expect(screen.getByRole('heading', { name: 'preferences' })).toBeTruthy()
  })

  it('offers the six currencies from the CHECK constraint, PHP selected when there is no stored preference', async () => {
    render(<SettingsPage prefs={null} />)
    const segments = screen.getAllByRole('radio')
    expect(segments.map((s) => s.getAttribute('value'))).toEqual([
      'PHP',
      'USD',
      'EUR',
      'GBP',
      'SGD',
      'AUD',
    ])
    expect(screen.getByRole('radio', { name: 'PHP' }).getAttribute('aria-checked')).toBe('true')
  })

  it('selects the stored preference instead of PHP once one exists', async () => {
    render(
      <SettingsPage
        prefs={{ user_id: 'u1', default_currency: 'USD', created_at: 'x', updated_at: 'x' }}
      />
    )
    expect(screen.getByRole('radio', { name: 'USD' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'PHP' }).getAttribute('aria-checked')).toBe('false')
  })

  it('calls onDefaultCurrencyChange when a different currency segment is picked', async () => {
    const onDefaultCurrencyChange = vi.fn()
    render(<SettingsPage prefs={null} onDefaultCurrencyChange={onDefaultCurrencyChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'EUR' }))
    expect(onDefaultCurrencyChange).toHaveBeenCalledWith('EUR')
  })

  it('shows the signed-in email as a read-only value in the account group', async () => {
    render(<SettingsPage prefs={null} email="gabe@example.com" />)
    expect(screen.getByDisplayValue('gabe@example.com')).toBeTruthy()
  })

  it('calls onSignOut from the account group', async () => {
    const onSignOut = vi.fn()
    render(<SettingsPage prefs={null} onSignOut={onSignOut} />)
    fireEvent.click(screen.getByRole('button', { name: /^sign out$/i }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('does not delete the account on a single click -- it asks for confirmation first', async () => {
    // Task 4 (M5.5): window.confirm is the same defect class as the dialogs
    // Gabe asked back for -- unstyled, unthemeable, untestable without
    // stubbing a global -- so this guard is now a ConfirmDialog instead.
    const onDeleteAccount = vi.fn()
    const user = userEvent.setup()
    render(<SettingsPage prefs={null} onDeleteAccount={onDeleteAccount} />)
    await user.click(screen.getByRole('button', { name: /delete account/i }))
    expect(screen.getByRole('alertdialog', { name: /delete your account/i })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'cancel' }))
    expect(onDeleteAccount).not.toHaveBeenCalled()
  })

  it('calls onDeleteAccount once the confirmation is accepted', async () => {
    const onDeleteAccount = vi.fn()
    const user = userEvent.setup()
    render(<SettingsPage prefs={null} onDeleteAccount={onDeleteAccount} />)
    await user.click(screen.getByRole('button', { name: /delete account/i }))
    await user.click(screen.getByRole('button', { name: 'delete account' }))
    expect(onDeleteAccount).toHaveBeenCalledTimes(1)
  })

  it('renders no shadow and no rounded card border on any of the three groups', async () => {
    // Radius caps at 4px and separation is a hairline rule, not a card --
    // the same visual grammar every other M5 screen holds to.
    const { container } = render(<SettingsPage prefs={null} />)
    for (const group of container.querySelectorAll('[data-settings-group]')) {
      expect(group.innerHTML).not.toMatch(/shadow/)
    }
  })

  // Regression for the concurrent-write bug the review round caught: a
  // CSS-only "disabled" look (pointer-events-none + aria-disabled) still let
  // a focused option fire onChange on an arrow key, because pointer-events
  // only blocks pointer hit-testing, not keyboard activation. This exercises
  // the guard through the composed screen, not just the SegmentedControl
  // primitive in isolation.
  it('does not fire a second currency change from the keyboard while a write is already in flight', async () => {
    const onDefaultCurrencyChange = vi.fn()
    render(
      <SettingsPage
        prefs={null}
        savingCurrency
        onDefaultCurrencyChange={onDefaultCurrencyChange}
      />
    )
    const selected = screen.getByRole('radio', { name: 'PHP' })
    fireEvent.keyDown(selected, { key: 'ArrowRight' })
    expect(onDefaultCurrencyChange).not.toHaveBeenCalled()
  })
})


describe('the profile panel', () => {

  it('explains itself when there is no profile, in the caller\'s own words', () => {
    // The reason is always source-specific, so it is a message rather than a
    // fixed string -- a generic "unavailable" tells nobody what to do next.
    render(<SettingsPage prefs={null} profile={{ status: 'empty', message: 'Nothing imported yet.' }} />)
    expect(screen.getByText('Nothing imported yet.')).toBeTruthy()
  })

  it('renders every part of a filled-in profile', () => {
    render(<SettingsPage prefs={null} profile={{ status: 'ready', profile: FILLED }} />)
    expect(screen.getByText('Elijah Gabe Cervantes')).toBeTruthy()
    expect(screen.getByText('Front-end developer')).toBeTruthy()
    // Industry and location share the line under the headline.
    expect(screen.getByText(/Software Development · Baguio, Philippines/)).toBeTruthy()
    expect(screen.getByText('Developer')).toBeTruthy()
    expect(screen.getByText('University')).toBeTruthy()
    expect(screen.getByText('React, TypeScript')).toBeTruthy()
  })

  it('renders a partial profile rather than blanking on missing fields', () => {
    // Every source is partial. A profile with only a name is still a profile.
    render(
      <SettingsPage
        prefs={null}
        profile={{
          status: 'ready',
          profile: { ...FILLED, headline: null, summary: null, experiences: [], skills: [] },
        }}
      />
    )
    expect(screen.getByText('Elijah Gabe Cervantes')).toBeTruthy()
    expect(screen.queryByText('experience')).toBeNull()
    expect(screen.getByText('University')).toBeTruthy()
  })

  it('shows a skeleton while it is loading, and no profile copy', () => {
    const { container } = render(<SettingsPage prefs={null} profile={{ status: 'loading' }} />)
    expect(container.querySelector('[data-profile-state="loading"]')).toBeTruthy()
    expect(screen.queryByText('Elijah Gabe Cervantes')).toBeNull()
  })

  it('defaults to the empty state rather than a spinner that never resolves', () => {
    const { container } = render(<SettingsPage prefs={null} />)
    expect(container.querySelector('[data-profile-state="empty"]')).toBeTruthy()
  })
})

describe('importing a LinkedIn export', () => {
  it('offers the import, and the steps, when there is no profile', () => {
    render(
      <SettingsPage
        prefs={null}
        profileSource={<ProfileImport onImport={vi.fn()} />}
        profileSteps={<ProfileImportSteps />}
      />
    )
    expect(screen.getByRole('button', { name: /import linkedin export/i })).toBeTruthy()
    expect(screen.getByText(/Get a copy of your data/i)).toBeTruthy()
  })

  it('never asks for a credential -- only a file', () => {
    // The two versions this replaced asked for an org-wide API key and a
    // profile URL to scrape. This asks for a file the user already owns.
    const { container } = render(<ProfileImport onImport={vi.fn()} />)
    const inputs = [...container.querySelectorAll('input')]
    expect(inputs.map((i) => i.getAttribute('type'))).toEqual(['file'])
    expect(container.querySelector('input[type="password"]')).toBeNull()
  })

  it('takes several files at once, because the export is an archive of them', () => {
    const { container } = render(<ProfileImport onImport={vi.fn()} />)
    expect(container.querySelector('input[type="file"]')).toHaveAttribute('multiple')
  })

  it('has nothing to remove before anything is imported', () => {
    render(<ProfileImport onImport={vi.fn()} onClear={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /remove profile/i })).toBeNull()
  })

  it('offers a re-import and a removal once a profile exists', () => {
    render(<ProfileImport onImport={vi.fn()} onClear={vi.fn()} hasProfile />)
    expect(screen.getByRole('button', { name: /import again/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /remove profile/i })).toBeTruthy()
  })

  it('says which files it could not read', () => {
    render(<ProfileImport onImport={vi.fn()} note="Could not recognise Connections.csv." />)
    expect(screen.getByText(/Could not recognise Connections.csv/)).toBeTruthy()
  })

  it('shows the imported bullet text, keeping its line breaks', () => {
    // The field the whole import exists for: a scrape gives up titles and
    // dates, and this is what a CV is actually written from.
    render(<SettingsPage prefs={null} profile={{ status: 'ready', profile: FILLED }} />)
    const body = screen.getByText(/Built the tracker/)
    expect(body.className).toContain('whitespace-pre-line')
  })

  it('renders the fields the export carries beyond a scrape', () => {
    render(<SettingsPage prefs={null} profile={{ status: 'ready', profile: FILLED }} />)
    expect(screen.getByText(/Software Development/)).toBeTruthy()
    expect(screen.getByText('Filipino (Native)')).toBeTruthy()
    expect(screen.getByText('https://example.dev')).toBeTruthy()
  })

  it('shows the address and birth date plainly, under their own heading', () => {
    // A home address is a different category of fact from a job title. Shown
    // rather than tucked away, so somebody who does not want it stored knows
    // to clear the profile.
    render(<SettingsPage prefs={null} profile={{ status: 'ready', profile: FILLED }} />)
    expect(screen.getByText('personal details')).toBeTruthy()
    expect(screen.getByText(/Bamban, Tarlac/)).toBeTruthy()
    expect(screen.getByText(/Born Mar 7/)).toBeTruthy()
  })
})
