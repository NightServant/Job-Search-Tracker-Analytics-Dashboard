import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Reveal } from '../Reveal'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const setTheme = vi.fn()
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme }) }))

/** Pretend the OS asked for reduced motion (or did not). */
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (document as any).startViewTransition
  vi.clearAllMocks()
})

describe('Reveal under reduced motion', () => {
  // This is the path that rots: nobody sees it unless they turn the setting on.
  beforeEach(() => setReducedMotion(true))

  it('renders content with no transition at all, not a faster one', () => {
    render(<Reveal>visible now</Reveal>)
    const el = screen.getByText('visible now')
    expect(el.hasAttribute('data-reduced')).toBe(true)
    expect(el.style.opacity).toBe('')
  })

  it('never constructs an IntersectionObserver', () => {
    const spy = vi.fn()
    vi.stubGlobal('IntersectionObserver', spy)
    render(<Reveal>content</Reveal>)
    expect(spy).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})

describe('Reveal with motion allowed', () => {
  beforeEach(() => setReducedMotion(false))

  it('shows content anyway when IntersectionObserver is unavailable', () => {
    // Invisible content is a broken page; a missing animation is cosmetic.
    render(<Reveal>content</Reveal>)
    expect(screen.getByText('content')).toBeTruthy()
  })

  it('does not wait for an intersection that a hidden document never delivers', () => {
    // A background tab, a prerender or a headless pane fires no records at
    // all, so waiting means opacity 0 for as long as the tab stays unfocused.
    const spy = vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() }))
    vi.stubGlobal('IntersectionObserver', spy)
    const visibility = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden' as DocumentVisibilityState)

    render(<Reveal>content</Reveal>)

    expect(spy).not.toHaveBeenCalled()
    expect(screen.getByText('content')).toBeTruthy()
    visibility.mockRestore()
    vi.unstubAllGlobals()
  })
})

describe('theme wipe', () => {
  it('skips the view transition entirely under reduced motion', () => {
    setReducedMotion(true)
    const startViewTransition = vi.fn((cb: () => void) => {
      cb()
      return { ready: Promise.resolve() }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(document as any).startViewTransition = startViewTransition

    render(<ThemeToggle />)
    act(() => {
      fireEvent.click(screen.getByRole('button'))
    })

    expect(startViewTransition).not.toHaveBeenCalled()
    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('still changes the theme where View Transitions are unsupported', () => {
    // Safari and Firefox both lagged here. The animation is decoration; the
    // state change is the feature.
    setReducedMotion(false)
    expect('startViewTransition' in document).toBe(false)

    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))

    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('runs the wipe when both are available', () => {
    setReducedMotion(false)
    const startViewTransition = vi.fn((cb: () => void) => {
      cb()
      return { ready: Promise.resolve() }
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(document as any).startViewTransition = startViewTransition

    render(<ThemeToggle />)
    act(() => {
      fireEvent.click(screen.getByRole('button'))
    })

    expect(startViewTransition).toHaveBeenCalled()
    expect(setTheme).toHaveBeenCalledWith('dark')
    expect(document.documentElement.style.getPropertyValue('--theme-wipe-r')).not.toBe('')
  })
})
