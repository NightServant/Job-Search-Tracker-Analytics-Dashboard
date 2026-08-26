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

// Mock global variables set by Vite

