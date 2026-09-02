import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Landing } from '../Landing'
import { SCREENS } from '../screens'
import { FAQ, HERO, CLOSING_CTA } from '../content'

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}))

const reduced = vi.hoisted(() => ({ value: false }))
vi.mock('@/hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => reduced.value,
}))

beforeEach(() => {
  reduced.value = false
})

function renderLanding() {
  return render(<Landing screens={SCREENS} heroPosterSrc="/hero-poster.png" />)
}

describe('the landing page structure', () => {
  it('renders all six sections in the order Gabe specified', () => {
    // ORDER, not merely presence. A page that renders the FAQ above the
    // problem statement passes a presence check and fails the reader: the
    // whole argument is "here is your problem, here is what it costs, here is
    // the thing that fixes it, here is proof, here is how to try it".
    const { container } = renderLanding()
    const sections = Array.from(container.querySelectorAll('[data-landing-section]')).map(
      (el) => el.getAttribute('data-landing-section')
    )
    expect(sections).toEqual([
      'hero',
      'social-proof',
      'problem',
      'solution',
      'faq',
      'cta',
    ])
  })

  it('gives the two nav anchors real targets to jump to', () => {
    // The nav links are in-page anchors. An anchor pointing at an id nothing
    // carries is a link that silently does nothing.
    const { container } = renderLanding()
    expect(container.querySelector('#how-it-works')).not.toBeNull()
    expect(container.querySelector('#faq')).not.toBeNull()
  })
})

describe('the hero', () => {
  it('carries all three calls to action, pointing where they claim', () => {
    // A CTA that goes nowhere is the one failure that makes the whole page
    // pointless, so the hrefs are asserted rather than the labels alone.
    renderLanding()
    expect(screen.getByRole('link', { name: HERO.primaryCta.label })).toHaveAttribute(
      'href',
      '/demo/dashboard'
    )
    expect(screen.getByRole('link', { name: HERO.secondaryCta.label })).toHaveAttribute(
      'href',
      '/signup'
    )
    expect(screen.getByRole('link', { name: HERO.tertiaryCta.label })).toHaveAttribute(
      'href',
      HERO.tertiaryCta.href
    )
  })

  it('is the one display-size heading on the page', () => {
    renderLanding()
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent(HERO.headline)
  })
})

describe('social proof, which must stay true', () => {
  // This project has one author and no users. The section that most tempts a
  // builder into inventing traction is the one with the hardest guard on it.
  function proofSection() {
    const { container } = renderLanding()
    const section = container.querySelector('[data-landing-section="social-proof"]')
    expect(section).not.toBeNull()
    return section as HTMLElement
  }

  it('shows four tiles that a visitor can actually verify', () => {
    // Positive companion to the two guards below: without it they would both
    // hold for a section that rendered nothing at all.
    const section = proofSection()
    expect(within(section).getAllByRole('link').length).toBe(4)
  })

  it('contains no testimonial: no avatar and no quoted text', () => {
    // Fails the moment someone adds a testimonial, which is the point.
    const section = proofSection()
    expect(section.querySelector('img')).toBeNull()
    expect(section.querySelector('blockquote')).toBeNull()
    expect(section.textContent ?? '').not.toMatch(/["“”]/)
  })

  it('quotes no figure that could go stale', () => {
    // The locked decision chose the qualitative claim over a generated test
    // count. A "931 tests" line that says 931 forever is the same lie as a
    // fabricated testimonial, only slower.
    const section = proofSection()
    expect(section.textContent ?? '').not.toMatch(/\d/)
  })
})

describe('the FAQ', () => {
  it('asks exactly five questions', () => {
    // Five is a requirement, so it is a test. A sixth means one of the five
    // was not worth asking.
    renderLanding()
    expect(FAQ.entries).toHaveLength(5)
    const triggers = screen.getAllByRole('button', { name: /\?$/ })
    expect(triggers).toHaveLength(5)
  })

  it('opens an answer and closes the previous one', async () => {
    // type="single" collapsible. Asserted by behaviour rather than by reading
    // the prop off the component, which would pass whatever it rendered.
    renderLanding()
    const [first, second] = screen.getAllByRole('button', { name: /\?$/ })

    await userEvent.click(first)
    expect(await screen.findByText(FAQ.entries[0].answer)).toBeVisible()

    await userEvent.click(second)
    expect(await screen.findByText(FAQ.entries[1].answer)).toBeVisible()
    expect(screen.queryByText(FAQ.entries[0].answer)).toBeNull()
  })
})

describe('the closing call to action', () => {
  it('offers the demo and the signup, and says what the demo is', () => {
    // Scoped to the section rather than queried page-wide. The navbar no
    // longer carries a demo button (removed 2026-09-02), so this label is
    // currently unique -- but the hero's "try the live demo" points at the
    // same route, and scoping keeps the assertion about THIS section's link
    // rather than about whichever one the query happens to find first.
    const { container } = renderLanding()
    const section = container.querySelector(
      '[data-landing-section="cta"]'
    ) as HTMLElement
    expect(section).not.toBeNull()

    expect(
      within(section).getByRole('link', { name: CLOSING_CTA.primary.label })
    ).toHaveAttribute('href', '/demo/dashboard')
    expect(
      within(section).getByRole('link', { name: CLOSING_CTA.secondary.label })
    ).toHaveAttribute('href', '/signup')
    expect(within(section).getByText(CLOSING_CTA.demoNote)).toBeInTheDocument()
  })
})

describe('the landing page under prefers-reduced-motion', () => {
  it('still renders every section, in flow', () => {
    // The path that rots, because nobody with motion enabled ever sees it.
    reduced.value = true
    const { container } = renderLanding()
    const sections = Array.from(container.querySelectorAll('[data-landing-section]'))
    expect(sections).toHaveLength(6)
    // Positive companion: the carousel is still there and still reachable,
    // it is simply conventional rather than scroll-driven.
    expect(screen.getByTestId('screen-carousel')).toBeInTheDocument()
  })

  it('leaves the carousel touchable, because nothing is driving it', () => {
    reduced.value = true
    renderLanding()
    expect(screen.getByTestId('screen-carousel')).toHaveAttribute(
      'data-scroll-driven',
      'false'
    )
  })
})
