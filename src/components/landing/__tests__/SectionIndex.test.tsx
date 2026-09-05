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

  // 2xl (1440), not lg. At 1024-1439 the 1200px container leaves no usable
  // margin -- none at all at 1024, 40px at 1280 -- so the fixed furniture
  // overlapped the content on every small laptop. Both halves of the pair move
  // together; see SectionRail's docblock.
  it('is hidden below 2xl, where there is no margin to live in', () => {
    render(<SectionIndex sections={SECTIONS} activeId="hero" />)
    expect(el().className).toContain('hidden')
    expect(el().className).toContain('2xl:block')
  })

  /**
   * Between 1440 and 1560 this reduces to the section NAME -- the counter and
   * the rule that separates them both drop out.
   *
   * The existing assertions in this file all still pass with the counter
   * hidden, because `display: none` leaves it in the DOM and jsdom has no
   * layout to notice. So without this the behaviour is unpinned: a later edit
   * could delete the responsive classes and every test here would stay green.
   *
   * The threshold is `min-[1560px]`, shared with SectionRail's labels rather
   * than chosen again here. These two are a matched pair in opposite margins,
   * and the failure mode of picking a second number is a page that is visibly
   * lopsided for a band of widths -- which is the exact bug this pass started
   * from.
   */
  it('drops the counter and its rule on a smaller laptop, keeping the name', () => {
    render(<SectionIndex sections={SECTIONS} activeId="solution" />)

    // Not `position()` -- the helpers in this file return textContent, and the
    // class list is on the counter's wrapper, one level up from the number.
    const counter = (document.querySelector('[data-section-index-position]') as HTMLElement)
      .parentElement as HTMLElement
    expect(counter.className.split(' ')).toContain('hidden')
    expect(counter.className).toContain('min-[1560px]:block')

    const rule = document.querySelector('[data-section-index-rule]') as HTMLElement
    expect(rule.className.split(' ')).toContain('hidden')
    expect(rule.className).toContain('min-[1560px]:block')

    // The name is the half that survives: it is the only place on the page
    // that states the current section outright, where position is already
    // shown as six dots by the rail opposite.
    const name = document.querySelector('[data-section-index-label]') as HTMLElement
    expect(name.className.split(' ')).not.toContain('hidden')
    expect(name.className).not.toContain('min-[1560px]:')
  })
})
