import { describe, it, expect, vi } from 'vitest'
import { prefersReducedMotion, subscribeToMotionPreference } from '../motion'

describe('prefersReducedMotion', () => {
  it('reports reduced motion when the media query matches', () => {
    expect(prefersReducedMotion({ matches: true } as MediaQueryList)).toBe(true)
  })

  it('defaults to full motion when the query is unavailable', () => {
    // SSR and old browsers land here. Defaulting to "reduced" would ship a
    // static app to everyone whose first render happens on the server.
    expect(prefersReducedMotion(null)).toBe(false)
  })
})

describe('subscribeToMotionPreference', () => {
  it('reports the change when the OS setting flips with the page open', () => {
    const listeners: ((e: MediaQueryListEvent) => void)[] = []
    const mql = {
      matches: false,
      addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => listeners.push(fn),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList

    const seen: boolean[] = []
    subscribeToMotionPreference(mql, (v) => seen.push(v))

    listeners[0]({ matches: true } as MediaQueryListEvent)
    expect(seen).toEqual([true])
  })

  it('unsubscribes cleanly', () => {
    const removeEventListener = vi.fn()
    const mql = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener,
    } as unknown as MediaQueryList

    subscribeToMotionPreference(mql, () => {})()
    expect(removeEventListener).toHaveBeenCalled()
  })

  it('is a no-op when there is no media query to watch', () => {
    expect(() => subscribeToMotionPreference(null, () => {})()).not.toThrow()
  })
})
