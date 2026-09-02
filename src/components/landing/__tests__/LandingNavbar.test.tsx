import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LandingNavbar } from '../LandingNavbar'
import { NAV_LINKS, NAV_ACTIONS } from '../content'

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}))

function renderNav(overHero: boolean) {
  const { container } = render(<LandingNavbar overHero={overHero} />)
  const bar = container.querySelector('[data-landing-nav]')
  expect(bar).not.toBeNull()
  return bar as HTMLElement
}

describe('LandingNavbar over the hero', () => {
  // The hero is dark in BOTH themes -- a background video under a scrim from
  // rgba(5,5,7,0.92) to rgba(5,5,7,0.3). A themed bar on it is illegible.
  it('blends into the hero: no background, no bottom border', () => {
    const bar = renderNav(true)
    expect(bar).toHaveAttribute('data-over-hero', 'true')
    expect(bar.className).not.toContain('bg-bg-canvas')
    expect(bar.className).not.toContain('border-b')
  })

  it('carries its own scrim, because the hero is bright on the right', () => {
    // Figma's navbar is opaque white, so its links never sat on video. Ours
    // do, and the controls are on the RIGHT of the bar, where the hero scrim
    // has decayed to 0.3 alpha. Without this the blend is legible only over
    // the dark left third -- which is where the headline is and the nav is not.
    const bar = renderNav(true)
    expect(bar.querySelector('[data-nav-scrim]')).not.toBeNull()
  })
})

describe('the brand lockup over the hero', () => {
  // Gabe, 2026-09-02: the Worktrack icon must render its dark-mode version in
  // the hero. The hero is dark in BOTH themes, so the light theme's
  // accent-700 (#c2410c) accent cell sits on near-black -- the same contrast
  // problem that made the frame's hero eyebrow accent-400.
  it('renders the mark in its dark-mode colours whatever the page theme is', () => {
    const bar = renderNav(true)
    const lockup = bar.querySelector('svg')?.parentElement
    expect(lockup).not.toBeNull()
    // The wordmark.
    expect(lockup!.className).toContain('text-[#fafafa]')
    // And the three currentColor cells, which need their OWN override:
    // BrandMark declares text-text-primary on its <svg>, so the container's
    // colour never reaches them. Without this the mark is invisible against
    // the hero in the light theme and correct-by-accident in the dark one --
    // which is exactly how it shipped broken the first time.
    expect(lockup!.className).toContain('[&>svg]:text-[#fafafa]')
    // The accent cell, which is fill="var(--color-accent-default)". The token
    // is redefined for the subtree rather than the component being forked.
    expect(lockup!.className).toContain('[--color-accent-default:var(--color-accent-400)]')
  })

  it('leaves the lockup on the theme tokens past the hero', () => {
    // Positive companion: proves the override is scoped to the blended
    // treatment and is not simply always on, which would break light mode.
    const bar = renderNav(false)
    const lockup = bar.querySelector('svg')?.parentElement
    expect(lockup!.className).not.toContain('text-[#fafafa]')
    expect(lockup!.className).not.toContain('--color-accent-default')
  })
})

describe('LandingNavbar past the hero', () => {
  it('takes the themed treatment: canvas background and a hairline rule', () => {
    const bar = renderNav(false)
    expect(bar).toHaveAttribute('data-over-hero', 'false')
    expect(bar.className).toContain('bg-bg-canvas')
    expect(bar.className).toContain('border-b')
  })

  it('drops the scrim, which has nothing left to protect', () => {
    const bar = renderNav(false)
    expect(bar.querySelector('[data-nav-scrim]')).toBeNull()
  })
})

describe('LandingNavbar across both treatments', () => {
  // The prop was renamed from `revealed` and its polarity INVERTED. A port
  // that drops the `!` produces a bar that is opaque over the hero and
  // transparent over the page -- wrong in both places, and it looks
  // deliberate. So both states are asserted, never just the interesting one.
  it('renders the same controls either way', () => {
    for (const overHero of [true, false]) {
      const { unmount } = render(<LandingNavbar overHero={overHero} />)
      for (const link of NAV_LINKS) {
        expect(screen.getByRole('link', { name: link.label })).toBeInTheDocument()
      }
      expect(
        screen.getByRole('link', { name: NAV_ACTIONS.signUp.label })
      ).toHaveAttribute('href', '/signup')
      expect(
        screen.getByRole('link', { name: NAV_ACTIONS.signIn.label })
      ).toHaveAttribute('href', '/login')
      unmount()
    }
  })

  it('keeps the sign-up button byte-identical', () => {
    // The one control that must NOT change, which makes it the one a
    // colour-swap refactor changes by accident. It is a filled accent button;
    // it clears contrast on either ground, and a CTA that restyles itself
    // mid-scroll reads as a different button.
    const over = renderNav(true)
    const past = renderNav(false)
    const signUp = (bar: HTMLElement) =>
      bar.querySelector('[data-nav-signup]')?.className
    expect(signUp(over)).toBeDefined()
    expect(signUp(over)).toBe(signUp(past))
  })

  it('sends the external link out safely and without a glyph', () => {
    // `open source` is the one nav item that leaves the site. No external-link
    // icon: the bar already carries a lockup, three links, two buttons and a
    // theme toggle, and decorating one of them is the asymmetry this design
    // system rules out.
    const bar = renderNav(false)
    const external = screen.getByRole('link', { name: 'open source' })
    expect(external).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
    expect(external.querySelector('svg')).toBeNull()
    expect(bar).toBeInTheDocument()
  })
})

describe('LandingNavbar has no duplicate demo call to action', () => {
  it('does not repeat the hero primary CTA in the bar', () => {
    // Removed 2026-09-02 at Gabe's instruction. The hero's "try the live demo"
    // sits directly under the bar, so a nav "open the demo" is the same call
    // to action twice in one viewport. Figma 39:355 draws it only because that
    // bar was never meant to be visible over the hero at all.
    for (const overHero of [true, false]) {
      const { unmount } = render(<LandingNavbar overHero={overHero} />)
      expect(screen.queryByRole('link', { name: 'open the demo' })).toBeNull()
      // Positive companion: the auth pair IS still there, so this is not
      // passing on a bar that renders nothing.
      expect(screen.getByRole('link', { name: 'sign up' })).toBeInTheDocument()
      unmount()
    }
  })
})

describe('LandingNavbar at mobile widths', () => {
  it('hides the links below md, keeping the lockup and the actions', () => {
    // Read from Figma 64:1020: at 375 the bar is 60px and holds the lockup,
    // sign in and sign up. No links, no "open the demo", and no theme toggle.
    renderNav(false)
    for (const link of NAV_LINKS) {
      const el = screen.getByRole('link', { name: link.label })
      expect(el.closest('[data-nav-links]')?.className).toContain('hidden')
      expect(el.closest('[data-nav-links]')?.className).toContain('md:flex')
    }
  })

  it('keeps the theme toggle to md and up, where the frame draws it', () => {
    // Not an omission: on mobile the theme control lives in the footer only,
    // which still satisfies 6.1's "navbar AND footer" because the desktop bar
    // carries both. Asserted so a later reader does not "fix" it.
    const bar = renderNav(false)
    const toggle = bar.querySelector('[data-theme-toggle]')
    expect(toggle).not.toBeNull()
    expect(toggle!.closest('[data-nav-toggle]')?.className).toContain('hidden')
    expect(toggle!.closest('[data-nav-toggle]')?.className).toContain('md:block')
  })
})
