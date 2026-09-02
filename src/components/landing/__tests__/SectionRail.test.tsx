import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionRail } from '../SectionRail'

const SECTIONS = [
  { id: 'hero', label: 'top' },
  { id: 'social-proof', label: 'proof' },
  { id: 'faq', label: 'faq' },
]

const rail = () => document.querySelector('[data-section-rail]') as HTMLElement

describe('SectionRail', () => {
  it('offers a jump link per section, in order', () => {
    render(<SectionRail sections={SECTIONS} activeId="hero" progress={0} />)
    const links = screen.getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '#hero',
      '#social-proof',
      '#faq',
    ])
  })

  it('marks only the active section, and marks it for assistive tech too', () => {
    // aria-current, not just a colour: the rail is navigation, and "which one
    // am I on" has to survive not being able to see the accent.
    render(<SectionRail sections={SECTIONS} activeId="social-proof" progress={0.5} />)
    const active = document.querySelectorAll('[data-active="true"]')
    expect(active).toHaveLength(1)
    expect(active[0].getAttribute('data-rail-item')).toBe('social-proof')
    expect(active[0]).toHaveAttribute('aria-current', 'true')
  })

  it('fills the track in proportion to progress', () => {
    const { rerender } = render(
      <SectionRail sections={SECTIONS} activeId="hero" progress={0} />
    )
    const fill = () => rail().querySelector('[data-rail-fill]') as HTMLElement
    expect(fill().style.height).toBe('0%')

    rerender(<SectionRail sections={SECTIONS} activeId="faq" progress={0.42} />)
    expect(fill().style.height).toBe('42%')

    rerender(<SectionRail sections={SECTIONS} activeId="faq" progress={1} />)
    expect(fill().style.height).toBe('100%')
  })

  it('renders with no active section rather than throwing', () => {
    // activeId is null before the first measurement. A rail that crashes there
    // takes the whole page with it.
    render(<SectionRail sections={SECTIONS} activeId={null} progress={0} />)
    expect(document.querySelectorAll('[data-active="true"]')).toHaveLength(0)
    // Positive companion: the rail is still there, just with nothing marked.
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })

  it('renders nothing when there are no sections', () => {
    const { container } = render(<SectionRail sections={[]} activeId={null} progress={0} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('inverts over the hero, which is dark in both themes', () => {
    // Without this the rail is a near-black line on near-black footage for the
    // whole first screen -- the same problem the navbar's two treatments solve.
    render(<SectionRail sections={SECTIONS} activeId="hero" progress={0} overHero />)
    expect(rail()).toHaveAttribute('data-over-hero', 'true')
    expect((rail().querySelector('[data-rail-fill]') as HTMLElement).className).toContain(
      'bg-white'
    )
  })

  it('carries its own plate over the hero, where the scrim has run out', () => {
    // The rail is pinned to the right edge, which is exactly where the hero's
    // left-to-right scrim has decayed to 0.3 alpha and the footage is
    // brightest. Without a plate the dots drift in and out of legibility as
    // the clip plays, which reads as a flicker rather than as a control.
    render(<SectionRail sections={SECTIONS} activeId="hero" progress={0} overHero />)
    expect(rail().className).toContain('backdrop-blur')
  })

  it('drops the plate past the hero, where the page provides its own ground', () => {
    render(<SectionRail sections={SECTIONS} activeId="faq" progress={0.8} />)
    expect(rail().className).not.toContain('backdrop-blur')
  })

  it('takes the themed treatment past the hero', () => {
    render(<SectionRail sections={SECTIONS} activeId="faq" progress={0.8} />)
    expect(rail()).toHaveAttribute('data-over-hero', 'false')
    expect((rail().querySelector('[data-rail-fill]') as HTMLElement).className).toContain(
      'bg-accent-default'
    )
  })

  it('draws its inactive dots in a foreground colour, not a border colour', () => {
    // Shipped invisible once: border tokens are sized for 1px hairlines
    // against a surface, and #d4d4d8 as a 7px dot on a white section cannot be
    // seen. A dot is foreground and takes a foreground token.
    render(<SectionRail sections={SECTIONS} activeId="hero" progress={0} />)
    const inactive = document.querySelector('[data-rail-item="faq"] span') as HTMLElement
    expect(inactive.className).toContain('bg-text-muted')
    expect(inactive.className).not.toContain('bg-border-default')
  })

  it('is hidden below lg, where there is no margin to live in', () => {
    render(<SectionRail sections={SECTIONS} activeId="hero" progress={0} />)
    expect(rail().className).toContain('hidden')
    expect(rail().className).toContain('lg:block')
  })
})
