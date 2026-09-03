import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { usePinnedSection, type PinnedSection } from '../usePinnedSection'

/**
 * Renders the hook with its ref ATTACHED to a real element, the way
 * PinnedBlock does in production.
 *
 * A bare renderHook leaves the ref null, and motion's useScroll then throws
 * "Target ref is defined but not hydrated" asynchronously -- an unhandled
 * error Vitest reports across the whole run, which could mask a real one. It
 * was also a test describing a situation the app never creates: PinnedBlock
 * attaches the ref in BOTH of its branches.
 */
function harness(holdHeightPx: number, pinned: boolean) {
  const seen: { current: PinnedSection | null } = { current: null }

  function Probe({ hold, isPinned }: { hold: number; isPinned: boolean }) {
    const section = usePinnedSection(hold, isPinned)
    seen.current = section
    return <div ref={section.ref} data-testid="outer" />
  }

  const view = render(<Probe hold={holdHeightPx} isPinned={pinned} />)
  return {
    get section() {
      return seen.current!
    },
    setPinned(next: boolean) {
      view.rerender(<Probe hold={holdHeightPx} isPinned={next} />)
    },
  }
}

describe('usePinnedSection when pinned', () => {
  it('reports the hold height so the block can allocate scroll distance', () => {
    const h = harness(1600, true)
    expect(h.section.pinned).toBe(true)
    expect(h.section.heightPx).toBe(1600)
  })

  it('starts at zero progress and unreleased', () => {
    // jsdom has no layout engine, so useScroll reports nothing here. That is
    // the point of the split: this hook's contract at rest is testable, and
    // the scroll-driven behaviour is exercised through useCarouselProgress
    // with a fake Swiper instead of by pretending jsdom can scroll.
    const h = harness(1600, true)
    expect(h.section.progress).toBe(0)
    expect(h.section.released).toBe(false)
  })

  it('hands back a ref for the tall outer element', () => {
    const h = harness(1600, true)
    expect(h.section.ref.current).not.toBeNull()
  })
})

describe('usePinnedSection when not pinned', () => {
  // Reached three ways -- reduced motion, a viewport below 768px, and the
  // first render before the viewport has been measured.
  it('writes no height, so the section costs no extra scroll distance', () => {
    // The entire cost of pinning on a 375x812 screen is the scroll distance.
    // If the height survives, the mobile decision did not.
    expect(harness(1600, false).section.heightPx).toBeUndefined()
  })

  it('pins nothing and reports no progress', () => {
    const h = harness(1600, false)
    expect(h.section.pinned).toBe(false)
    expect(h.section.progress).toBe(0)
  })

  it('reports released false so a paused hero video does not stay paused', () => {
    // `released` drives HeroMedia's `paused`. In normal flow the hero is never
    // "past" -- it is simply a section -- so the video must be allowed to play.
    // Getting this backwards leaves every mobile visitor with a frozen poster.
    expect(harness(1600, false).section.released).toBe(false)
  })

  it('switches modes when the pinned flag flips mid-session', () => {
    // Positive companion to the three negatives above: proves this is a gate
    // and not a hook that never pins.
    const h = harness(1600, false)
    expect(h.section.heightPx).toBeUndefined()

    h.setPinned(true)
    expect(h.section.heightPx).toBe(1600)

    h.setPinned(false)
    expect(h.section.heightPx).toBeUndefined()
  })
})
