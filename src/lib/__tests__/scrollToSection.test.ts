import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  resolveScrollTarget,
  scrollAnchorFor,
  sectionScrollTop,
  scrollToSection,
} from '../scrollToSection'

describe('sectionScrollTop', () => {
  it('converts a viewport rect into a document position', () => {
    // rect.top is relative to the viewport, scrollTo wants absolute document
    // Y. Forgetting to add scrollY is the bug where every jump but the first
    // lands short by however far you had already scrolled.
    expect(sectionScrollTop(500, 0, 1440)).toBe(500 - 80 - 24)
    expect(sectionScrollTop(500, 1000, 1440)).toBe(1500 - 80 - 24)
  })

  it('leaves room for the fixed navbar, at the height that viewport uses', () => {
    // 60px below md, 80px at and above it. A single hard-coded offset puts the
    // heading under the bar on one of the two.
    const rect = 1000
    expect(sectionScrollTop(rect, 0, 375)).toBe(1000 - 60 - 24)
    expect(sectionScrollTop(rect, 0, 1440)).toBe(1000 - 80 - 24)
    expect(sectionScrollTop(rect, 0, 375)).toBeGreaterThan(sectionScrollTop(rect, 0, 1440))
  })

  it('never returns a negative scroll position', () => {
    // The first section starts at the top of the document, so subtracting the
    // navbar offset goes below zero. Browsers clamp it silently; returning the
    // clamped value is what makes this function testable against what is
    // actually applied.
    expect(sectionScrollTop(0, 0, 1440)).toBe(0)
    expect(sectionScrollTop(-500, 0, 1440)).toBe(0)
  })
})

describe('resolveScrollTarget', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('returns an ordinary section unchanged', () => {
    document.body.innerHTML = '<section id="s" data-landing-section="problem"></section>'
    const el = document.querySelector('#s')!
    expect(resolveScrollTarget(el)).toBe(el)
  })

  it('climbs to the pin wrapper when the section is inside one', () => {
    // The hero is a `sticky top-0` child of a tall pin wrapper, so its own
    // rect is wherever the pin has parked it -- scrolling to that is
    // scrolling to where you already are, and the page does not move. The
    // wrapper's top is the real start of the section.
    document.body.innerHTML = `
      <div id="pin" data-pinned="true">
        <div class="sticky">
          <section id="hero" data-landing-section="hero"></section>
        </div>
      </div>`
    const hero = document.querySelector('#hero')!
    expect(resolveScrollTarget(hero)).toBe(document.querySelector('#pin'))
  })

  it('ignores a released pin, which is an ordinary div again', () => {
    // PinnedBlock renders data-pinned="false" below the pin breakpoint and
    // before the pin engages. Climbing to it would be harmless there but the
    // selector is deliberately exact, so this asserts the attribute VALUE is
    // what matters rather than its presence.
    document.body.innerHTML = `
      <div id="pin" data-pinned="false">
        <section id="hero" data-landing-section="hero"></section>
      </div>`
    const hero = document.querySelector('#hero')!
    expect(resolveScrollTarget(hero)).toBe(hero)
  })
})

describe('scrollAnchorFor', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('anchors an ordinary section on its content, not its padded box', () => {
    // Sections carry py-28. Landing on the box top left the heading 163px
    // below the navbar -- a jump that measured correct but looked like it had
    // overshot into blank space. The content wrapper's top already excludes
    // the padding, so no computed style has to be read.
    document.body.innerHTML =
      '<section id="s" data-landing-section="problem"><div id="content"></div></section>'
    const section = document.querySelector('#s')!
    expect(scrollAnchorFor(section, section)).toBe(document.querySelector('#content'))
  })

  it('falls back to the section when it has no content wrapper', () => {
    document.body.innerHTML = '<section id="s" data-landing-section="problem"></section>'
    const section = document.querySelector('#s')!
    expect(scrollAnchorFor(section, section)).toBe(section)
  })

  it('anchors a pinned section on its wrapper, padding and all', () => {
    // A pin wrapper's top IS the start of the section, and the sticky child is
    // a full-viewport composition rather than a heading with space above it.
    // Consuming padding there would scroll past the start of the pin.
    document.body.innerHTML = `
      <div id="pin" data-pinned="true">
        <section id="hero" data-landing-section="hero"><div id="inner"></div></section>
      </div>`
    const section = document.querySelector('#hero')!
    const pin = document.querySelector('#pin')!
    expect(scrollAnchorFor(section, pin)).toBe(pin)
  })
})

describe('scrollToSection', () => {
  const scrollTo = vi.fn()

  beforeEach(() => {
    scrollTo.mockClear()
    vi.stubGlobal('scrollTo', scrollTo)
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('finds a section by its tracking attribute, not by its id', () => {
    // One vocabulary: the highlight is computed from data-landing-section, so
    // the click resolves through the same attribute. If this used `id` the two
    // could disagree about what a section is.
    document.body.innerHTML =
      '<section id="something-else" data-landing-section="problem"></section>'
    expect(scrollToSection('problem')).toBe(true)
    expect(scrollTo).toHaveBeenCalledOnce()
  })

  it('reports false for a section that is not on the page', () => {
    // The caller only preventDefault()s on true, so a miss falls through to
    // the browser's own anchor handling instead of swallowing the click.
    document.body.innerHTML = '<section data-landing-section="problem"></section>'
    expect(scrollToSection('nope')).toBe(false)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('glides by default and jumps under reduced motion', () => {
    document.body.innerHTML = '<section data-landing-section="faq"></section>'

    scrollToSection('faq')
    expect(scrollTo.mock.calls[0][0].behavior).toBe('smooth')

    scrollToSection('faq', { reducedMotion: true })
    expect(scrollTo.mock.calls[1][0].behavior).toBe('auto')
  })
})
