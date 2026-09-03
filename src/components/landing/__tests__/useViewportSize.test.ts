import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useViewportSize } from '../useViewportSize'

function setWindow(w: number, h: number) {
  Object.defineProperty(window, 'innerWidth', { value: w, writable: true, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: h, writable: true, configurable: true })
}

afterEach(() => setWindow(1024, 768))

describe('useViewportSize', () => {
  it('measures the window on mount', () => {
    setWindow(1440, 900)
    const { result } = renderHook(() => useViewportSize())
    expect(result.current).toEqual({ widthPx: 1440, heightPx: 900 })
  })

  it('follows a resize rather than capturing once', () => {
    // Someone drags a window across 768px with the page open. A value read
    // once at mount strands the page in whichever mode it started in.
    setWindow(1440, 900)
    const { result } = renderHook(() => useViewportSize())
    expect(result.current.widthPx).toBe(1440)

    act(() => {
      setWindow(600, 900)
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current.widthPx).toBe(600)
  })

  it('lets a test inject a size without touching the window', () => {
    // Positive companion: the two assertions above prove the real path works,
    // so this is not a hook that only ever returns its own props.
    const { result } = renderHook(() => useViewportSize({ widthPx: 375, heightPx: 812 }))
    expect(result.current).toEqual({ widthPx: 375, heightPx: 812 })
  })

  it('removes its listener on unmount', () => {
    setWindow(1440, 900)
    const { unmount } = renderHook(() => useViewportSize())
    unmount()
    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow()
  })
})
