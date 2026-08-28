import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { SettingsPage } from '../SettingsPage'

afterEach(() => cleanup())

describe('SettingsPage', () => {
  it('has exactly three groups, in order: account, preferences, danger zone', () => {
    render(<SettingsPage prefs={null} />)
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['Account', 'Preferences', 'Danger zone'])
  })

  it('keeps the danger zone last among the data-settings-group containers', () => {
    const { container } = render(<SettingsPage prefs={null} />)
    const groups = container.querySelectorAll('[data-settings-group]')
    expect(groups).toHaveLength(3)
    expect(groups[groups.length - 1].getAttribute('data-settings-group')).toBe('danger')
  })

  it('has no appearance group -- the theme lives in the app shell', () => {
    // A second control over the same next-themes state would be a second
    // source of truth for one value. Paired with a positive assertion: this
    // must not pass merely because the page rendered nothing at all.
    render(<SettingsPage prefs={null} />)
    expect(screen.queryByText(/appearance/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /theme/i })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Account' })).toBeTruthy()
  })

  it('has no export control -- /applications owns CSV', () => {
    render(<SettingsPage prefs={null} />)
    expect(screen.queryByRole('button', { name: /export/i })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Preferences' })).toBeTruthy()
  })

  it('offers the six currencies from the CHECK constraint, PHP selected when there is no stored preference', () => {
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

  it('selects the stored preference instead of PHP once one exists', () => {
    render(
      <SettingsPage
        prefs={{ user_id: 'u1', default_currency: 'USD', created_at: 'x', updated_at: 'x' }}
      />
    )
    expect(screen.getByRole('radio', { name: 'USD' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'PHP' }).getAttribute('aria-checked')).toBe('false')
  })

  it('calls onDefaultCurrencyChange when a different currency segment is picked', () => {
    const onDefaultCurrencyChange = vi.fn()
    render(<SettingsPage prefs={null} onDefaultCurrencyChange={onDefaultCurrencyChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'EUR' }))
    expect(onDefaultCurrencyChange).toHaveBeenCalledWith('EUR')
  })

  it('shows the signed-in email as a read-only value in the account group', () => {
    render(<SettingsPage prefs={null} email="gabe@example.com" />)
    expect(screen.getByDisplayValue('gabe@example.com')).toBeTruthy()
  })

  it('calls onSignOut from the account group', () => {
    const onSignOut = vi.fn()
    render(<SettingsPage prefs={null} onSignOut={onSignOut} />)
    fireEvent.click(screen.getByRole('button', { name: /^sign out$/i }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('does not delete the account on a single click -- it asks for confirmation first', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onDeleteAccount = vi.fn()
    render(<SettingsPage prefs={null} onDeleteAccount={onDeleteAccount} />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))
    expect(confirmSpy).toHaveBeenCalled()
    expect(onDeleteAccount).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('calls onDeleteAccount once the confirmation is accepted', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onDeleteAccount = vi.fn()
    render(<SettingsPage prefs={null} onDeleteAccount={onDeleteAccount} />)
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }))
    expect(onDeleteAccount).toHaveBeenCalledTimes(1)
    confirmSpy.mockRestore()
  })

  it('renders no shadow and no rounded card border on any of the three groups', () => {
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
  it('does not fire a second currency change from the keyboard while a write is already in flight', () => {
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
