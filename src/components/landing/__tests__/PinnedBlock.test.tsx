import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { PinnedBlock } from '../PinnedBlock'
import { usePinnedSection } from '../usePinnedSection'
import { useViewportSize } from '../useViewportSize'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { shouldPin, heroPinHeightPx } from '@/lib/pinnedScroll'

/**
 * A matchMedia that actually dispatches.
 *
 * src/test/setup.ts installs a global mock whose addEventListener is a no-op
 * spy, so a live-preference test written against it can never observe a
 * change. This one keeps one shared listener set across every MediaQueryList
 * it hands out, which is what makes `set()` reach the subscription
 * usePrefersReducedMotion opened through a different call.
 */
function installMatchMedia(initial = false) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  let matches = initial
  const original = window.matchMedia
  window.matchMedia = vi.fn().mockImplementation((media: string) => ({
    media,
    get matches() {
      return matches && media === '(prefers-reduced-motion: reduce)'
    },
    addEventListener: (_t: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.add(cb)
    },
    removeEventListener: (_t: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.delete(cb)
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  })) as unknown as typeof window.matchMedia
  return {
    set(next: boolean) {
      matches = next
      for (const cb of listeners) cb({ matches: next } as MediaQueryListEvent)
    },
    restore() {
      window.matchMedia = original
    },
  }
}

afterEach(() => vi.clearAllMocks())

/** Mirrors exactly what Landing does, so the test exercises the real seam. */
function Harness({ widthPx, heightPx }: { widthPx: number; heightPx: number }) {
  const reduced = usePrefersReducedMotion()
  const size = useViewportSize({ widthPx, heightPx })
  const pinned = shouldPin(reduced, size.widthPx)
  const hero = usePinnedSection(heroPinHeightPx(size.heightPx), pinned)
  return (
    <PinnedBlock section={hero} name="hero">
      <button>inside the pin</button>
    </PinnedBlock>
  )
}

describe('PinnedBlock on desktop with motion allowed', () => {
  it('pins and allocates scroll distance for the hold', () => {
    const mm = installMatchMedia(false)
    render(<Harness widthPx={1440} heightPx={800} />)
    const hero = screen.getByTestId('pinned-hero')
    expect(hero).toHaveAttribute('data-pinned', 'true')
    expect(hero).toHaveStyle({ height: '1600px' }) // 800 * (1 + 1)
    mm.restore()
  })

  it('holds its child in a sticky viewport-height layer', () => {
    const mm = installMatchMedia(false)
    render(<Harness widthPx={1440} heightPx={800} />)
    const sticky = screen.getByTestId('pinned-hero').firstElementChild
    expect(sticky).not.toBeNull()
    expect(sticky!.className).toContain('sticky')
    // Positive companion: the child is really in there, not just a shell.
    expect(screen.getByRole('button', { name: 'inside the pin' })).toBeInTheDocument()
    mm.restore()
  })
})

describe('PinnedBlock on mobile', () => {
  // Settled 2026-08-28: mobile does not pin. Asserted, not omitted -- "we
  // decided not to do X" is a behavioural claim, and an untested one rots
  // exactly the way this milestone's reduced-motion paths kept rotting.
  it('never pins below the md breakpoint, even with motion allowed', () => {
    const mm = installMatchMedia(false)
    render(<Harness widthPx={375} heightPx={812} />)
    const hero = screen.getByTestId('pinned-hero')
    expect(hero).toHaveAttribute('data-pinned', 'false')
    // Positive companion: the section still renders, it is just in flow.
    expect(screen.getByRole('button', { name: 'inside the pin' })).toBeInTheDocument()
    mm.restore()
  })

  it('allocates no extra scroll distance on mobile', () => {
    const mm = installMatchMedia(false)
    render(<Harness widthPx={375} heightPx={812} />)
    expect(screen.getByTestId('pinned-hero').style.height).toBe('')
    mm.restore()
  })

  it('starts pinning when a tablet crosses the breakpoint', () => {
    // Positive companion to the negatives above: proves the width gate is a
    // gate and not a component that never pins at all.
    const mm = installMatchMedia(false)
    const { rerender } = render(<Harness widthPx={767} heightPx={800} />)
    expect(screen.getByTestId('pinned-hero')).toHaveAttribute('data-pinned', 'false')

    rerender(<Harness widthPx={768} heightPx={800} />)
    expect(screen.getByTestId('pinned-hero')).toHaveAttribute('data-pinned', 'true')
    mm.restore()
  })
})

describe('PinnedBlock under reduced motion', () => {
  it('drops the pin entirely and lets the section sit in normal flow', () => {
    // Scroll-jacking is a vestibular trigger. This is a hard requirement, and
    // unlike the width gate it cannot be reached around by resizing.
    const mm = installMatchMedia(true)
    render(<Harness widthPx={1440} heightPx={800} />)
    const hero = screen.getByTestId('pinned-hero')
    expect(hero).toHaveAttribute('data-pinned', 'false')
    expect(hero.style.height).toBe('')
    expect(screen.getByRole('button', { name: 'inside the pin' })).toBeInTheDocument()
    mm.restore()
  })

  it('unpins live when the OS preference changes with the page open', () => {
    const mm = installMatchMedia(false)
    render(<Harness widthPx={1440} heightPx={800} />)
    expect(screen.getByTestId('pinned-hero')).toHaveAttribute('data-pinned', 'true')

    act(() => mm.set(true))
    expect(screen.getByTestId('pinned-hero')).toHaveAttribute('data-pinned', 'false')

    act(() => mm.set(false))
    expect(screen.getByTestId('pinned-hero')).toHaveAttribute('data-pinned', 'true')
    mm.restore()
  })
})

describe('PinnedBlock keyboard order', () => {
  it('keeps pinned content in document order so Tab still reaches it', () => {
    // Content inside a pinned section must stay Tab-reachable in document
    // order, and focusing something below must not leave the page stuck in a
    // pinned stage. Sticky positioning preserves document order; a transform-
    // based fake pin would not, which is why this asserts on order rather
    // than on the CSS.
    const mm = installMatchMedia(false)
    render(
      <>
        <Harness widthPx={1440} heightPx={800} />
        <button>below the pin</button>
      </>
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['inside the pin', 'below the pin'])
    for (const b of buttons) expect(b).not.toHaveAttribute('tabindex', '-1')
    mm.restore()
  })
})

describe('two PinnedBlocks four sections apart', () => {
  it('lets ordinary sections render between the hero and the carousel', () => {
    // The whole reason PinnedSequence was split. Under the six-section order
    // social proof and the problem statement sit BETWEEN the two pinned
    // blocks; a component that emitted both wrappers as siblings could not
    // express this page, and an earlier draft of the plan claimed it could.
    const mm = installMatchMedia(false)
    function Page() {
      const size = useViewportSize({ widthPx: 1440, heightPx: 800 })
      const reduced = usePrefersReducedMotion()
      const pinned = shouldPin(reduced, size.widthPx)
      const hero = usePinnedSection(heroPinHeightPx(size.heightPx), pinned)
      const carousel = usePinnedSection(4000, pinned)
      return (
        <>
          <PinnedBlock section={hero} name="hero"><div>hero</div></PinnedBlock>
          <section>social proof</section>
          <section>problem</section>
          <PinnedBlock section={carousel} name="carousel"><div>carousel</div></PinnedBlock>
        </>
      )
    }
    const { container } = render(<Page />)
    const order = Array.from(container.querySelectorAll('[data-testid], section')).map(
      (el) => el.getAttribute('data-testid') ?? el.textContent
    )
    expect(order).toEqual(['pinned-hero', 'social proof', 'problem', 'pinned-carousel'])
    // Both really are pinned -- otherwise this passes for a page that pins
    // nothing, which is the same shape as the bug it is guarding.
    expect(screen.getByTestId('pinned-hero')).toHaveAttribute('data-pinned', 'true')
    expect(screen.getByTestId('pinned-carousel')).toHaveAttribute('data-pinned', 'true')
    mm.restore()
  })
})
