import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiStat } from '../kpi-stat'
import { ApplicationRow } from '../application-row'
import { JobCard } from '../job-card'
import { KanbanColumn } from '../kanban-column'
import { NavItem } from '../nav-item'
import { Sidebar, NAV } from '../sidebar'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }))

describe('KpiStat', () => {
  it('renders its value with tabular figures', () => {
    // Proportional digits reflow as the number changes and the strip jitters.
    const { container } = render(<KpiStat label="Applied" value={128} />)
    expect(container.querySelector('[data-kpi-value]')!.className).toContain('tabular')
  })

  it('states the delta direction in words, not colour alone', () => {
    render(<KpiStat label="Applied" value={128} delta={{ value: '+12', direction: 'up' }} />)
    expect(screen.getByText('up', { exact: false })).toBeTruthy()
  })
})

describe('ApplicationRow', () => {
  const base = {
    company: 'Acme',
    role: 'Engineer',
    status: 'applied' as const,
    salaryMin: 90000,
    salaryMax: 120000,
    currency: 'USD',
    date: '2026-08-01',
  }

  it('shows the status as a rule, never a pill', () => {
    const { container } = render(<ApplicationRow {...base} />)
    const rule = container.querySelector('[data-status-rule]')
    expect(rule).toBeTruthy()
    expect(rule!.className).toContain('rounded-none')
  })

  it('separates rows with a hairline rule rather than boxing each one', () => {
    const { container } = render(<ApplicationRow {...base} />)
    const row = container.firstElementChild as HTMLElement
    expect(row.className).toContain('border-b')
    expect(row.className).not.toMatch(/(^|\s)border(\s|$)/)
  })

  it('formats salary in the job own currency', () => {
    render(<ApplicationRow {...base} currency="PHP" salaryMin={60000} salaryMax={90000} />)
    expect(screen.getByText(/₱60,000/)).toBeTruthy()
  })
})

describe('JobCard', () => {
  it('separates with a hairline border and no shadow', () => {
    const { container } = render(
      <JobCard company="Acme" role="Engineer" status="offer" currency="USD" />
    )
    const card = container.querySelector('article')!
    expect(card.className).toContain('border-border-subtle')
    expect(card.className).not.toMatch(/shadow-/)
    expect(card.className).toContain('rounded-md')
  })
})

describe('KanbanColumn', () => {
  it('renders its count with tabular figures', () => {
    const { container } = render(<KanbanColumn title="Applied" count={12} />)
    expect(container.querySelector('[data-column-count]')!.className).toContain('tabular')
  })
})

describe('NavItem', () => {
  it('marks the active entry with a rule and aria-current', () => {
    const { container } = render(
      <NavItem href="/jobs" label="Applications" icon="Applications" index={2} active />
    )
    expect(container.querySelector('[data-nav-rule]')!.className).toContain('rounded-none')
    expect(screen.getByRole('link').getAttribute('aria-current')).toBe('page')
  })

  it('zero-pads the sidebar number', () => {
    const { container } = render(<NavItem href="/jobs" label="Jobs" icon="Applications" index={2} />)
    expect(container.querySelector('[data-nav-index]')!.textContent).toBe('02')
  })

  it('drops the number on the mobile bottom bar', () => {
    // Five entries at 375px cannot fit icon, number and label without the
    // label truncating, and the label is the part that carries meaning.
    const { container } = render(
      <NavItem href="/jobs" label="Jobs" icon="Applications" index={2} variant="bottom" />
    )
    expect(container.querySelector('[data-nav-index]')).toBeNull()
  })

  it('keeps the bottom bar target at 44px', () => {
    const { container } = render(
      <NavItem href="/jobs" label="Jobs" icon="Applications" variant="bottom" />
    )
    const cls = container.querySelector('a')!.className
    expect(cls).toContain('h-11')
    expect(cls).toContain('min-w-11')
  })
})

describe('Sidebar', () => {
  it('places the theme toggle last, before the footer note', () => {
    const { container } = render(<Sidebar />)
    const nav = container.querySelector('nav')!
    const kids = Array.from(nav.children)
    const toggleIdx = kids.findIndex((k) => k.querySelector('[data-theme-toggle]'))
    const footerIdx = kids.findIndex((k) => k.hasAttribute('data-sidebar-footer'))
    expect(toggleIdx).toBeGreaterThan(-1)
    expect(footerIdx).toBe(kids.length - 1)
    expect(toggleIdx).toBe(footerIdx - 1)
  })

  it('puts a growing spacer above the toggle so it pins to the bottom', () => {
    const { container } = render(<Sidebar />)
    expect(container.querySelector('[data-sidebar-spacer]')!.className).toContain('flex-1')
  })

  it('keeps settings below the divider, apart from the five sections', () => {
    const { container } = render(<Sidebar />)
    const nav = container.querySelector('nav')!
    const kids = Array.from(nav.children)
    const dividerIdx = kids.findIndex((k) => k.hasAttribute('data-sidebar-divider'))
    const settingsIdx = kids.findIndex((k) => k.getAttribute('href') === '/settings')
    expect(NAV).toHaveLength(5)
    expect(settingsIdx).toBe(dividerIdx + 1)
  })

  it('marks only the current route active', () => {
    render(<Sidebar pathname="/applications" />)
    const active = screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current'))
    expect(active).toHaveLength(1)
    expect(active[0].getAttribute('href')).toBe('/applications')
  })

  it('highlights the section for a child route, not just an exact match', () => {
    // /applications/abc-123 is a detail route, not one of the five NAV hrefs
    // -- this is the case activeNavHref exists for, and the one that shipped
    // broken when Sidebar computed active state off a bare pathname === href.
    render(<Sidebar pathname="/applications/abc-123" />)
    const active = screen.getAllByRole('link').filter((l) => l.getAttribute('aria-current'))
    expect(active).toHaveLength(1)
    expect(active[0].getAttribute('href')).toBe('/applications')
  })

  it('shows the mark beside the wordmark', () => {
    // Item 1: the Figma Logo (19:4) is a 23px 2x2 mark plus the wordmark. The
    // M5 sidebar rendered the word alone.
    const { container } = render(<Sidebar pathname="/dashboard" />)
    const logo = container.querySelector('[data-sidebar-logo]')!
    expect(logo.querySelector('svg'), 'the brand mark is missing').toBeTruthy()
    expect(logo.textContent).toContain('worktrack')
  })

  it('offers a control that collapses it', () => {
    // Not in the Figma -- Gabe asked for it, and it comes from shadcn's
    // SidebarTrigger. Asserted here so it cannot quietly disappear.
    render(<Sidebar pathname="/dashboard" />)
    expect(screen.getByRole('button', { name: /toggle sidebar/i })).toBeTruthy()
  })

  it('paints the active item in the accent colour with a full-height rule', () => {
    // Figma: active is an orange left bar plus accent text. The M5 version
    // used text-text-primary and inset the rule by 4px top and bottom.
    const { container } = render(<Sidebar pathname="/applications" />)
    const active = container.querySelector('[data-nav-item][data-active]')!
    expect(active.className).toContain('text-accent-default')
    const rule = active.querySelector('[data-nav-rule]')!
    expect(rule.className).toContain('inset-y-0')
  })

  it('never fills a nav item background', () => {
    // The Figma Nav Item description: "no filled background, which would spend
    // colour the status system needs." M5 added hover:bg-bg-inset.
    const { container } = render(<Sidebar pathname="/dashboard" />)
    for (const item of container.querySelectorAll('[data-nav-item]')) {
      expect(item.className, `${item.textContent} has a background fill`).not.toMatch(/\bbg-/)
    }
  })
})
