import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { AnalyzingDocument } from '../analyzing-document'

/**
 * Pretend the OS asked for reduced motion (or did not), the same way
 * src/components/motion/__tests__/motion.test.tsx does. The real
 * usePrefersReducedMotion runs here rather than a mocked one: the thing worth
 * checking is that this component is wired to the app's single motion gate,
 * and a mocked hook would pass whether it was or not.
 */
function setReducedMotion(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })) as unknown as typeof window.matchMedia
}

const originalMatchMedia = window.matchMedia

afterEach(() => {
  window.matchMedia = originalMatchMedia
  cleanup()
})

/** The sweeping bar, which is the only element painted with bg-current. */
const scanBar = (container: HTMLElement) => container.querySelector('.bg-current')

describe('the analyzing-document loader', () => {
  it('draws the document twice and sweeps a scan bar across it', () => {
    setReducedMotion(false)
    const { container } = render(<AnalyzingDocument />)

    // Two copies: the finished document underneath, and the blank page on top
    // that the clip-path wipes away. One copy means the reveal has nothing to
    // reveal.
    expect(container.querySelectorAll('svg')).toHaveLength(2)
    expect(scanBar(container)).not.toBeNull()
  })

  it('announces itself to a screen reader', () => {
    setReducedMotion(false)
    const { container } = render(<AnalyzingDocument />)

    expect(container.firstElementChild!.getAttribute('role')).toBe('status')
    expect(container.textContent).toContain('Reading the posting')
  })

  it('degrades to the static glyph under prefers-reduced-motion', () => {
    // The path that rots, because nobody sees it unless they turn the setting
    // on: an infinite sweep is exactly what the preference asks to be spared.
    setReducedMotion(true)
    const { container } = render(<AnalyzingDocument />)

    expect(scanBar(container)).toBeNull()
    // Degraded to the glyph, NOT to nothing -- one document, still carrying
    // the three text lines the scan would otherwise reveal.
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(1)
    expect(svgs[0].querySelectorAll('path')).toHaveLength(5)
    expect(container.firstElementChild!.getAttribute('role')).toBe('status')
  })
})
