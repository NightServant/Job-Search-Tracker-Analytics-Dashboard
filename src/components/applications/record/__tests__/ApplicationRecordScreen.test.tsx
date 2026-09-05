import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ApplicationRecordScreen } from '../ApplicationRecordScreen'
import { makeJob } from '@/test/fixtures'

const JOB = makeJob({ id: 'j1', company: 'Acme', role: 'Frontend engineer', status: 'applied' })

function renderScreen(overrides: Partial<Parameters<typeof ApplicationRecordScreen>[0]> = {}) {
  return render(
    <ApplicationRecordScreen
      job={JOB}
      mode="view"
      onModeChange={vi.fn()}
      backHref="/applications"
      defaultCurrency="PHP"
      onSubmit={vi.fn()}
      {...overrides}
    />
  )
}

/**
 * The mobile surface for one application. This route was the one nested screen
 * in the app with no breadcrumb -- the CV editor has had one since M6 -- and it
 * had a bare "< applications" link instead, which says where you would end up
 * but not where you are.
 */
describe('the way out of a record on a phone', () => {
  it('shows the trail, not just the way back', () => {
    renderScreen()
    const trail = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(within(trail).getByRole('link', { name: 'applications' })).toHaveAttribute(
      'href',
      '/applications'
    )
    // The leaf is the current page, so it is text rather than a link -- a link
    // to where you already are is a dead control that still takes a tab stop.
    expect(within(trail).queryByRole('link', { name: JOB.role })).toBeNull()
    expect(within(trail).getByText(JOB.role)).toHaveAttribute('aria-current', 'page')
  })

  it('follows the route it was given rather than a hardcoded one', () => {
    // /demo renders this same screen, and a hardcoded /applications would walk
    // a demo visitor out of the demo and into the auth guard.
    renderScreen({ backHref: '/demo/applications' })
    const trail = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(within(trail).getByRole('link', { name: 'applications' })).toHaveAttribute(
      'href',
      '/demo/applications'
    )
  })

  it('keeps a thumb-sized target on the crumb that is a link', () => {
    // What the 44px back button used to supply. It lives in Breadcrumb now, so
    // the document editor's trail gets it too -- and it is scoped to a coarse
    // pointer, so the desktop trail keeps its compact rhythm.
    renderScreen()
    const link = within(screen.getByRole('navigation', { name: /breadcrumb/i })).getByRole('link')
    expect(link.className).toContain('[@media(pointer:coarse)]:min-h-11')
  })
})

describe('the record header', () => {
  it('still names the role as the page heading', () => {
    // The breadcrumb leaf repeats it on purpose -- a trail only reads as a
    // path if it ends where you are -- but the <h1> is what names the page.
    renderScreen()
    expect(screen.getByRole('heading', { level: 1, name: JOB.role })).toBeTruthy()
  })

  it('offers edit and delete as full-width controls while viewing', () => {
    renderScreen({ onDelete: vi.fn() })
    expect(screen.getByRole('button', { name: 'edit' })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: `Delete ${JOB.role} at ${JOB.company}` })
    ).toBeTruthy()
  })

  it('swaps them for the form when editing', () => {
    renderScreen({ mode: 'edit', onDelete: vi.fn() })
    expect(screen.queryByRole('button', { name: 'edit' })).toBeNull()
    expect(screen.getByLabelText(/company/i)).toBeTruthy()
  })
})
