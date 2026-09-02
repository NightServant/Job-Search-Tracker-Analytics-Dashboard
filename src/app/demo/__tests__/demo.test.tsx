import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { DEMO_NAV } from '../nav'
import { DEMO } from '@/lib/demoFixture'

/**
 * A Supabase module that throws on ANY property access.
 *
 * The point is not that these routes happen not to query today -- it is that a
 * stray query added later fails here rather than silently working in dev
 * because the developer happened to be signed in, and then returning nothing
 * for every stranger who opens the demo.
 */
vi.mock('@/lib/supabase', () => {
  const boom = new Proxy(
    {},
    {
      get(_t, prop) {
        throw new Error(
          `A /demo route reached Supabase (property "${String(prop)}"). The demo renders a ` +
            `fixture and must not query: see src/lib/demoFixture.ts.`
        )
      },
    }
  )
  return { supabase: boom, default: boom }
})

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}))

const pathname = vi.hoisted(() => ({ value: '/demo/dashboard' }))
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  redirect: vi.fn(),
}))

import DemoDashboard from '../dashboard/page'
import DemoApplications from '../applications/page'
import DemoAnalytics from '../analytics/page'
import DemoCalendar from '../calendar/page'
import DemoDocuments from '../documents/page'
import DemoLayout from '../layout'

describe('every demo route renders its screen from the fixture', () => {
  it('renders the overview without touching Supabase', () => {
    render(<DemoDashboard />)
    // A company from the fixture, so this is about the data and not just that
    // a component mounted.
    expect(screen.getAllByText(/Northwind Pay/).length).toBeGreaterThan(0)
  })

  it('renders the applications list', () => {
    render(<DemoApplications />)
    expect(screen.getAllByText(/Meridian Labs/).length).toBeGreaterThan(0)
  })

  it('renders analytics with resolved metrics rather than skeletons', () => {
    const { container } = render(<DemoAnalytics />)
    // Nothing is loading, because there is no query to be loading.
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()
    expect(container.textContent?.length).toBeGreaterThan(0)
  })

  it('renders the calendar', () => {
    const { container } = render(<DemoCalendar />)
    expect(container.textContent?.length).toBeGreaterThan(0)
  })

  it('renders the documents screen with both CVs', () => {
    render(<DemoDocuments />)
    expect(screen.getByText('Software Engineer CV')).toBeInTheDocument()
    expect(screen.getByText('Software Engineer CV (LaTeX)')).toBeInTheDocument()
  })
})

describe('the demo shell', () => {
  it('keeps every nav destination inside /demo', () => {
    // A demo visitor clicking "applications" and landing on the real
    // /applications is bounced to /login by the (app) guard, which reads as
    // the demo being broken rather than as a boundary working.
    for (const entry of DEMO_NAV) {
      expect(entry.href, `${entry.label} escapes the demo`).toMatch(/^\/demo\//)
    }
    expect(DEMO_NAV).toHaveLength(5)
  })

  it('renders the banner above the content on every demo route', () => {
    render(
      <DemoLayout>
        <p>demo content</p>
      </DemoLayout>
    )
    expect(screen.getByText(/invented/i)).toBeInTheDocument()
    expect(screen.getByText('demo content')).toBeInTheDocument()
  })

  it('offers no settings link, because there is no account to configure', () => {
    const { container } = render(
      <DemoLayout>
        <p>demo content</p>
      </DemoLayout>
    )
    expect(container.querySelector('[data-settings-link]')).toBeNull()
    // Positive companion: the shell really did render its nav, so the absence
    // above is about settings and not about an empty layout.
    const nav = container.querySelector('nav[aria-label="Main"]')
    expect(nav).not.toBeNull()
    expect(within(nav as HTMLElement).getByText('overview')).toBeInTheDocument()
  })
})

describe('the demo shows a populated product, not an empty one', () => {
  // The fixture exists to make the app look like it works. A panel showing
  // "not enough data yet" is the worst possible first impression, so the
  // no-empty-state claim is asserted rather than assumed.
  it('puts every status on the overview', () => {
    render(<DemoDashboard />)
    for (const label of ['wishlist', 'applied', 'interviewing', 'offer', 'rejected']) {
      expect(screen.getAllByText(new RegExp(label, 'i')).length).toBeGreaterThan(0)
    }
  })

  it('renders no EmptyState anywhere on the overview or analytics', () => {
    // Asserted on the component's own [data-empty-state] hook rather than on
    // its prose. The copy ("no applications yet. add one and it shows up
    // here.") is a string a rewrite would change without changing the
    // behaviour, and this test needs to keep failing when a NEW panel is added
    // with no fixture data behind it -- which is exactly when someone needs
    // telling.
    const overview = render(<DemoDashboard />)
    expect(overview.container.querySelectorAll('[data-empty-state]')).toHaveLength(0)
    // Positive companion: the overview really rendered its panels, so the
    // absence above is meaningful rather than a blank page.
    expect(overview.getAllByText(/Northwind Pay/).length).toBeGreaterThan(0)
    overview.unmount()

    const analytics = render(<DemoAnalytics />)
    expect(analytics.container.querySelectorAll('[data-empty-state]')).toHaveLength(0)
    expect(analytics.container.textContent?.length).toBeGreaterThan(100)
  })
})

describe('the demo is honest about being read-only', () => {
  it('hands every write affordance a handler that explains itself', async () => {
    // The screens are the REAL screens and their write controls render
    // unconditionally, so they cannot be made to disappear without changing
    // the app to suit the demo. They therefore say what happened -- silence
    // would be indistinguishable from a broken button.
    const { demoReadOnlyAsync } = await import('../readOnly')
    await expect(demoReadOnlyAsync()).resolves.toBe(false)
  })

  it('ships no row that could be mistaken for a real person', () => {
    const emails = JSON.stringify(DEMO).match(/[\w.+-]+@[\w.-]+\.\w+/g) ?? []
    expect(emails.length).toBeGreaterThan(0)
    for (const email of emails) expect(email).toMatch(/@example\.(com|org)$/)
  })
})
