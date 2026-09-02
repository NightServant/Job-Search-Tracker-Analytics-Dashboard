import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCarouselProgress, type DrivableSwiper } from '../useCarouselProgress'

/**
 * A stand-in for Swiper's instance, holding only what this hook touches.
 * Mounting real Swiper in jsdom would test jsdom's missing layout engine, not
 * our wiring, and would let the reduced-motion path pass vacuously because
 * nothing would move either way.
 */
function makeSwiper(): DrivableSwiper & { setProgress: ReturnType<typeof vi.fn> } {
  return {
    setProgress: vi.fn(),
    allowTouchMove: false,
    params: { allowTouchMove: false, simulateTouch: false },
    // Swiper sets this once it has finished building. The hook refuses to
    // drive without it, so a double that omits it is a double that is never
    // driven -- see the "not yet initialised" case below.
    initialized: true,
  }
}

describe('useCarouselProgress while scroll is driving', () => {
  it('drives the carousel from the pinned section progress', () => {
    const swiper = makeSwiper()
    const { rerender } = renderHook(
      ({ p }: { p: number }) => useCarouselProgress(swiper, p, true),
      { initialProps: { p: 0 } }
    )
    expect(swiper.setProgress).toHaveBeenLastCalledWith(0, 0)

    rerender({ p: 0.5 })
    expect(swiper.setProgress).toHaveBeenLastCalledWith(0.5, 0)

    rerender({ p: 1 })
    expect(swiper.setProgress).toHaveBeenLastCalledWith(1, 0)
  })

  it('clamps rather than pushing Swiper past its last slide', () => {
    const swiper = makeSwiper()
    renderHook(() => useCarouselProgress(swiper, 1.6, true))
    expect(swiper.setProgress).toHaveBeenLastCalledWith(1, 0)
  })

  it('animates over zero milliseconds, so the slides track the scrollbar', () => {
    // setProgress(progress, speed) animates over `speed` ms. A non-zero speed
    // makes the slides lag the scrollbar, which is the snapping behaviour the
    // roadmap rules out.
    const swiper = makeSwiper()
    renderHook(() => useCarouselProgress(swiper, 0.3, true))
    expect(swiper.setProgress.mock.calls[0][1]).toBe(0)
  })

  it('turns touch off, because scroll is the only thing that should move it', () => {
    const swiper = makeSwiper()
    swiper.allowTouchMove = true
    swiper.params!.allowTouchMove = true
    swiper.params!.simulateTouch = true
    renderHook(() => useCarouselProgress(swiper, 0, true))
    expect(swiper.allowTouchMove).toBe(false)
    expect(swiper.params!.allowTouchMove).toBe(false)
    expect(swiper.params!.simulateTouch).toBe(false)
  })
})

describe('useCarouselProgress while scroll is NOT driving', () => {
  // Reached three ways -- reduced motion, a viewport below 768px, and the
  // moments before the section is pinned -- and the hook must not care which.
  // This is the path that rots: on desktop with motion allowed, nobody sees it.
  it('stops driving progress entirely', () => {
    const swiper = makeSwiper()
    const { rerender } = renderHook(
      ({ p, d }: { p: number; d: boolean }) => useCarouselProgress(swiper, p, d),
      { initialProps: { p: 0.25, d: true } }
    )
    expect(swiper.setProgress).toHaveBeenLastCalledWith(0.25, 0)
    const callsBefore = swiper.setProgress.mock.calls.length

    rerender({ p: 0.9, d: false })
    expect(swiper.setProgress.mock.calls.length).toBe(callsBefore)
  })

  it('restores touch so the carousel is not frozen on slide one', () => {
    // Without this, the users who opted out of motion -- and every mobile
    // visitor, who never pins at all -- get a carousel they cannot advance by
    // any means.
    const swiper = makeSwiper()
    renderHook(() => useCarouselProgress(swiper, 0, false))
    expect(swiper.allowTouchMove).toBe(true)
    expect(swiper.params!.allowTouchMove).toBe(true)
    expect(swiper.params!.simulateTouch).toBe(true)
  })

  it('flips touch back on when driving stops mid-session', () => {
    // Someone can change the OS motion setting with the page open, or rotate a
    // tablet across the 768px line. A value captured at mount strands both.
    const swiper = makeSwiper()
    const { rerender } = renderHook(
      ({ d }: { d: boolean }) => useCarouselProgress(swiper, 0.4, d),
      { initialProps: { d: true } }
    )
    expect(swiper.allowTouchMove).toBe(false)

    rerender({ d: false })
    expect(swiper.allowTouchMove).toBe(true)

    rerender({ d: true })
    expect(swiper.allowTouchMove).toBe(false)
  })
})

describe('useCarouselProgress before Swiper has finished initialising', () => {
  it('does not drive an instance that is not ready', () => {
    // onSwiper fires with a partially built instance: `initialized` and
    // `snapGrid` are both undefined at that point, and setProgress reads
    // snapGrid[0]. Driving it there is what put "Cannot read properties of
    // undefined (reading '0')" on the landing page.
    const swiper: DrivableSwiper & { setProgress: ReturnType<typeof vi.fn> } = {
      setProgress: vi.fn(),
      allowTouchMove: false,
      params: { allowTouchMove: false, simulateTouch: false },
    }
    renderHook(() => useCarouselProgress(swiper, 0.5, true))
    expect(swiper.setProgress).not.toHaveBeenCalled()
    // Positive companion: touch is still configured, so the hook ran and
    // declined to drive rather than bailing out entirely.
    expect(swiper.allowTouchMove).toBe(false)
  })

  it('drives once the instance reports itself ready', () => {
    const swiper = makeSwiper()
    renderHook(() => useCarouselProgress(swiper, 0.5, true))
    expect(swiper.setProgress).toHaveBeenCalledWith(0.5, 0)
  })
})

describe('useCarouselProgress when the vendor call throws', () => {
  it('does not take the page down with it', () => {
    // setProgress reads snapGrid, which Swiper fills only after it has
    // measured laid-out slides. A throw inside a passive effect unmounts the
    // React tree, so an unguarded call here means a blank landing page rather
    // than a carousel that is one frame behind.
    const swiper: DrivableSwiper = {
      setProgress: () => {
        throw new TypeError("Cannot read properties of undefined (reading '0')")
      },
      allowTouchMove: false,
      params: { allowTouchMove: false, simulateTouch: false },
      initialized: true,
    }
    expect(() => renderHook(() => useCarouselProgress(swiper, 0.5, true))).not.toThrow()
    // Positive companion: the touch flip still happened, so the hook did run
    // rather than bailing out before doing anything.
    expect(swiper.allowTouchMove).toBe(false)
  })
})

describe('useCarouselProgress against a partially initialised Swiper', () => {
  it('still flips the instance property when params is absent', () => {
    // A real instance does not always carry `params` when onSwiper fires, and
    // writing through it unguarded threw for every render of the landing page
    // the moment this hook met a real Swiper rather than a test double. The
    // instance property is the one that takes effect regardless.
    const swiper = {
      setProgress: vi.fn(),
      allowTouchMove: true,
      initialized: true,
    } as DrivableSwiper
    expect(() => renderHook(() => useCarouselProgress(swiper, 0, true))).not.toThrow()
    expect(swiper.allowTouchMove).toBe(false)
  })
})

describe('useCarouselProgress before Swiper has mounted', () => {
  it('does nothing and does not throw', () => {
    // onSwiper fires after the first render, so the hook runs at least once
    // with null. Positive companion: the same hook with a real instance in the
    // tests above does call setProgress, so this is not vacuous.
    expect(() => renderHook(() => useCarouselProgress(null, 0.5, true))).not.toThrow()
  })
})
