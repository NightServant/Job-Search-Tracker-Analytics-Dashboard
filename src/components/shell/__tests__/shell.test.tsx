import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { AppShell } from '../AppShell'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))
vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/dashboard') }))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn(), signIn: vi.fn(), signUp: vi.fn() }),
}))

describe('AppShell', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/dashboard')
  })

  it('gives the mobile top bar 44px controls in a 64px bar', () => {
    const { container } = render(
      <AppShell>
        <p>body</p>
      </AppShell>
    )
    const bar = container.querySelector('[data-top-bar]')!
    expect(bar.className).toContain('h-16') // 64px
    for (const b of bar.querySelectorAll('button, a')) {
      expect(b.className).toMatch(/h-11/) // 44px
    }
  })

  it('carries theme toggle then settings, in that order', () => {
    const { container } = render(
      <AppShell>
        <p>body</p>
      </AppShell>
    )
    const bar = container.querySelector('[data-top-bar]')!
    const controls = [...bar.querySelectorAll('[data-theme-toggle], [data-settings-link]')]
    expect(controls[0].hasAttribute('data-theme-toggle')).toBe(true)
    expect(controls[1].hasAttribute('data-settings-link')).toBe(true)
  })

  it('renders exactly five bottom-nav destinations, numbered 01-05 on desktop only', () => {
    const { container } = render(
      <AppShell>
        <p>body</p>
      </AppShell>
    )
    const nav = container.querySelector('[data-bottom-nav]')!
    const items = nav.querySelectorAll('[data-nav-item]')
    expect(items).toHaveLength(5)
    // The mobile bar drops the number; five-up at 375px has no room for both.
    expect(nav.querySelector('[data-nav-index]')).toBeNull()
  })

  it('has no active bottom-nav item on settings, which is chrome not a destination', () => {
    vi.mocked(usePathname).mockReturnValue('/settings')
    const { container } = render(
      <AppShell>
        <p>body</p>
      </AppShell>
    )
    const active = container.querySelectorAll('[data-bottom-nav] [data-active]')
    expect(active).toHaveLength(0)
    expect(container.querySelector('[data-settings-link][data-active]')).toBeTruthy()
  })

  it('highlights apps for a child route of applications', () => {
    vi.mocked(usePathname).mockReturnValue('/applications/abc-123')
    const { container } = render(
      <AppShell>
        <p>body</p>
      </AppShell>
    )
    const active = container.querySelectorAll('[data-bottom-nav] [data-active]')
    expect(active).toHaveLength(1)
    expect(active[0].getAttribute('href')).toBe('/applications')
  })
})
