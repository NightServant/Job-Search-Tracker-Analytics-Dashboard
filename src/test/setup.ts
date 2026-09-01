import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// jsdom has no layout engine, so it never implemented scrollIntoView. Any
// component that scrolls a panel into view on open needs this or the call
// throws in every test that renders it.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}

// jsdom also never implemented ResizeObserver, which Recharts' own
// ResponsiveContainer (Task 8, analytics) constructs unconditionally on
// mount -- without this, every test that renders a Recharts chart throws
// "ResizeObserver is not defined" before assertions even run. jsdom's lack
// of a layout engine means the observer would report 0x0 regardless, same
// as the real dimensions any jsdom-rendered chart gets; this stub only
// keeps the constructor call from throwing.
if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub
}

// Same story for IntersectionObserver, which embla-carousel constructs on
// mount to decide which slides are in view -- the template gallery on
// /documents renders one. Without this every test that mounts that screen
// throws "IntersectionObserver is not defined" before a single assertion.
//
// The stub reports nothing rather than faking visibility. jsdom has no
// layout, so any answer it invented about which slides are on screen would be
// fiction; embla degrades to "no slides observed", which is exactly as true
// as its 0x0 measurements already are.
if (typeof (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds: number[] = []
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  ;(globalThis as { IntersectionObserver: unknown }).IntersectionObserver =
    IntersectionObserverStub
}

// Mock global variables set by Vite

