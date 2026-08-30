import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KpiStat } from '../kpi-stat'
import { ApplicationRow } from '../application-row'
import { JobCard } from '../job-card'
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
    // used text-text-primary and inset the rule by 4px top and bottom. The
    // rule is a real w-[2px] h-full flex child (Figma's Active Bar), not an
    // absolutely-positioned overlay -- see the "offsets the index" test below
    // for why that distinction is load-bearing.
    const { container } = render(<Sidebar pathname="/applications" />)
    const active = container.querySelector('[data-nav-item][data-active]')!
    expect(active.className).toContain('text-accent-default')
    const rule = active.querySelector('[data-nav-rule]')!
    expect(rule.className).toContain('h-full')
    expect(rule.className).toContain('bg-accent-default')
  })

  it('never fills a nav item background', () => {
    // The Figma Nav Item description: "no filled background, which would spend
    // colour the status system needs." M5 added hover:bg-bg-inset.
    const { container } = render(<Sidebar pathname="/dashboard" />)
    for (const item of container.querySelectorAll('[data-nav-item]')) {
      expect(item.className, `${item.textContent} has a background fill`).not.toMatch(/\bbg-/)
    }
  })

  it('reserves space for the accent bar on inactive rows too, so nothing jogs sideways on navigation', () => {
    // Figma node 19:20/19:24: Active Bar is a real w-[2px] h-full flex child
    // in every row (bg-transparent when inactive), not an absolutely
    // positioned overlay that only appears on the active row.
    const { container } = render(<Sidebar pathname="/applications" />)
    const items = [...container.querySelectorAll('[data-nav-item]')]
    expect(items.length).toBeGreaterThanOrEqual(6) // five sections + settings
    for (const item of items) {
      const rule = item.querySelector('[data-nav-rule]')
      expect(rule, `${item.textContent} has no reserved rule slot`).toBeTruthy()
    }
    const inactive = items.filter((i) => !i.hasAttribute('data-active'))
    expect(inactive.length).toBeGreaterThan(0)
    for (const item of inactive) {
      expect(item.querySelector('[data-nav-rule]')!.className).toContain('bg-transparent')
    }
  })

  it('offsets the index from the accent bar by the bar width plus one gap, not flush against it', () => {
    // Figma 19:20: Active Bar (w-2) then gap-[12px] then the "01" text -- 14px
    // total from the item's left edge to where the index starts.
    const { container } = render(<Sidebar pathname="/applications" />)
    const item = container.querySelector('[data-nav-item][data-active]')!
    const rule = item.querySelector('[data-nav-rule]')!
    const index = item.querySelector('[data-nav-index]')!
    // The rule must be a normal flow sibling ahead of the index (not an
    // absolutely-positioned overlay sitting under it at the same x=0).
    expect(rule.className).not.toMatch(/\babsolute\b/)
    expect(rule.compareDocumentPosition(index) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('collapses to an icon rail: icons stay, indices and visible labels go, and nothing loses its accessible name', () => {
    // Gabe: "collapsing currently hides the whole nav and leaves an empty
    // column." Collapsed must keep every destination reachable, not blank
    // the sidebar out.
    render(<Sidebar pathname="/dashboard" />)
    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }))

    const links = screen.getAllByRole('link')
    const overview = links.find((l) => l.getAttribute('href') === '/dashboard')!
    expect(overview.querySelector('[data-nav-index]'), 'index should be hidden in the rail').toBeNull()
    expect(overview.querySelector('svg'), 'icon should still render').toBeTruthy()
    // The label is visually hidden (sr-only) but still in the DOM, so the
    // link keeps a real accessible name instead of depending on the tooltip.
    expect(overview.textContent).toContain('overview')
    expect(overview.className).not.toMatch(/\bbg-/)

    const settings = links.find((l) => l.getAttribute('href') === '/settings')!
    expect(settings, 'settings should still be reachable when collapsed').toBeTruthy()
  })

  it('shows a light/dark label beside the theme toggle, reflecting the current theme', () => {
    // Not in Figma (109:2402 is a bare hairline square, no text) -- Gabe
    // asked for an indicator so the icon is not orphaned. Chrome, so
    // lowercase, not an acronym.
    render(<Sidebar pathname="/dashboard" />)
    // next-themes is mocked resolvedTheme: 'light' at the top of this file.
    expect(screen.getByText('light')).toBeTruthy()
  })

  it('gives the theme section the same divider-and-section rhythm as settings', () => {
    const { container } = render(<Sidebar pathname="/dashboard" />)
    const nav = container.querySelector('nav')!
    const kids = Array.from(nav.children)
    const dividers = kids.filter((k) => k.tagName === 'HR')
    // One above settings (existing, data-sidebar-divider), one above the
    // theme section -- the same rhythm settings gets below the nav group.
    expect(dividers.length).toBeGreaterThanOrEqual(2)
    const themeLabelIdx = kids.findIndex((k) => k.textContent?.includes('light'))
    const lastDividerIdx = kids.map((k) => k.tagName === 'HR').lastIndexOf(true)
    expect(lastDividerIdx).toBeGreaterThan(-1)
    expect(themeLabelIdx).toBeGreaterThan(lastDividerIdx)
  })

  it('aligns every rail row on one axis: identical fixed-width boxes, not independently centred content', () => {
    // Gabe: "the brand mark sits hard against the left edge while the
    // trigger and the nav icons below it are centred... Everything in the
    // rail must centre on one axis, in identically-sized hit boxes."
    render(<Sidebar pathname="/dashboard" />)
    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }))

    const logoBox = document.querySelector('[data-sidebar-logo]')!.parentElement!
    const overview = screen.getAllByRole('link').find((l) => l.getAttribute('href') === '/dashboard')!
    const trigger = screen.getByRole('button', { name: /toggle sidebar/i })
    const themeToggle = document.querySelector('[data-theme-toggle]')!.parentElement!

    // Every rail row is the same 36px (w-9) box -- the expanded state's pl-6
    // must not leak into the collapsed state and give the mark a different
    // offset than everything below it.
    for (const [name, el] of [
      ['logo', logoBox],
      ['trigger', trigger.parentElement!],
      ['nav item', overview],
      ['theme toggle', themeToggle],
    ] as const) {
      expect(el.className.split(' '), `${name} row is not a w-9 box`).toContain('w-9')
    }
  })

  it('never boxes the collapsed rail active state -- a left-edge bar and an accent icon, no ring', () => {
    // Gabe: the screenshot showed "an orange rounded-rectangle outline",
    // which reads as a focus ring, not the design's vocabulary. src/index.css
    // gives every element a `ring-2 ring-ring` on :focus-visible, and
    // --color-ring is the accent orange -- exactly that box. Nav items
    // suppress it and reuse the bar instead.
    render(<Sidebar pathname="/applications" />)
    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }))
    const active = document.querySelector('[data-nav-item][data-active]')!
    expect(active.className).toContain('outline-none')
    expect(active.className.split(' ').some((c) => c.startsWith('ring-'))).toBe(false)
    const rule = active.querySelector('[data-nav-rule]')!
    expect(rule.className.split(' ')).toContain('absolute')
    expect(rule.className).toContain('left-0')
    expect(rule.className).toContain('bg-accent-default')
  })

  it('sizes the column to the viewport, not to the row it sits in, so a long page cannot stretch it', () => {
    // Reported broken twice: AppShell's row is `min-h-screen`, and its OTHER
    // flex item is the scrollable main. On /analytics (2560px in Figma) or
    // the /applications kanban, the row's own resolved height is the
    // CONTENT height, and a stretched sidebar stretches to match it --
    // thousands of pixels tall, with the theme control and footer far below
    // the fold. Verified live (this repo's real stylesheet, a real
    // 900px-tall AppShell-shaped DOM tree): with these classes, <nav>
    // measured exactly 900px (window.innerHeight) whether its sibling <main>
    // was 200px or 3000px tall -- the classes below are what produced that,
    // and jsdom cannot do real layout to re-check the pixels itself, so this
    // pins the CSS contract instead: sticky + a real viewport-height unit
    // (not a percentage that depends on an ancestor's resolved height) +
    // shrink-0 so a wide main cannot squeeze it + overflow-y-auto as the
    // fallback for a viewport shorter than the nav's own content.
    const { container } = render(<Sidebar pathname="/dashboard" />)
    const nav = container.querySelector('nav')!
    const classes = nav.className.split(' ')
    expect(classes, 'sticky').toContain('sticky')
    expect(classes, 'top-0').toContain('top-0')
    expect(classes, 'h-screen').toContain('h-screen')
    expect(classes, 'shrink-0').toContain('shrink-0')
    expect(classes, 'overflow-y-auto').toContain('overflow-y-auto')
    expect(
      classes.some((c) => c.includes('dvh')),
      'a dvh fallback for mobile browser chrome'
    ).toBe(true)
    // A percentage height here would silently reintroduce the original bug:
    // it depends on an ancestor having a *definite* height, which
    // AppShell's min-h-screen row does not reliably give on a long page.
    expect(classes.some((c) => c === 'h-full')).toBe(false)
  })
})
