import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SectionIndex } from '../SectionIndex'

const SECTIONS = [
  { id: 'hero', label: 'top' },
  { id: 'social-proof', label: 'proof' },
  { id: 'faq', label: 'faq' },
]

const el = () => document.querySelector('[data-section-index]') as HTMLElement
const position = () =>
  (document.querySelector('[data-section-index-position]') as HTMLElement).textContent
const label = () =>
  (document.querySelector('[data-section-index-label]') as HTMLElement).textContent

describe('SectionIndex', () => {
  it('counts the active section from one, not zero', () => {
    render(<SectionIndex sections={SECTIONS} activeId="social-proof" />)
    expect(position()).toBe('02')
    expect(el().textContent).toContain('/ 03')
  })

  it('names the section it is counting', () => {
    render(<SectionIndex sections={SECTIONS} activeId="faq" />)
    expect(label()).toBe('faq')
    expect(position()).toBe('03')
  })

  it('pads to two digits so the figures do not jump', () => {
    // Tabular figures in a fixed-width column: an unpadded "1 / 3" next to a
    // padded "10 / 12" would shift the whole block sideways mid-scroll.
    render(<SectionIndex sections={SECTIONS} activeId="hero" />)
    expect(position()).toBe('01')
  })

  it('shows the first section before anything has been measured', () => {
    // activeId is null on the first render. Showing "00" would be a state the
    // page is never actually in, and blanking it would flash an empty margin.
    render(<SectionIndex sections={SECTIONS} activeId={null} />)
    expect(position()).toBe('01')
    expect(label()).toBe('top')
  })

  it('is hidden from assistive tech, because the rail already says this', () => {
    // The rail exposes the same state as real links with aria-current.
    // Announcing both would read the section list twice.
    render(<SectionIndex sections={SECTIONS} activeId="hero" />)
    expect(el()).toHaveAttribute('aria-hidden')
  })

  it('inverts over the hero, like the navbar and the rail', () => {
    render(<SectionIndex sections={SECTIONS} activeId="hero" overHero />)
    expect(el()).toHaveAttribute('data-over-hero', 'true')
    expect(el().className).toContain('backdrop-blur')
  })

  it('renders nothing when there are no sections', () => {
    const { container } = render(<SectionIndex sections={[]} activeId={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('is hidden below lg, where there is no margin to live in', () => {
    render(<SectionIndex sections={SECTIONS} activeId="hero" />)
    expect(el().className).toContain('hidden')
    expect(el().className).toContain('lg:block')
  })
})
