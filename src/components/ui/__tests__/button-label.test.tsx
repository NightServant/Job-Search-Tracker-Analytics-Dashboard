import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '../button'

/**
 * The `loadingText` label cell, which shipped broken.
 *
 * WHY THERE IS A TEST HERE NOW. `loadingText` went out on 2026-09-15 with no
 * test of its own, and it took the OAuth buttons with it: wrapping `children`
 * in a plain `<span>` moved an icon out of the button's flex row into normal
 * block flow, where Tailwind preflight's `svg { display: block }` gives it a
 * line to itself. Gabe saw a Google "G" sitting on top of its own label in
 * production. The same wrapper also swallowed the size variant's `gap`,
 * because the button then had exactly one flex item to space.
 *
 * WHAT THIS CAN AND CANNOT ASSERT. jsdom computes no layout -- every element
 * is 0x0 and `display` is whatever the inline style says -- so "the icon is
 * beside the label" is not observable here and a test claiming to check it
 * would be checking nothing. What IS observable is the contract that produces
 * it: one wrapper, laid out as a row, carrying the gap down from the button.
 * That is what these assert, and it is enough to fail if the wrapper goes back
 * to being a plain block.
 */

const Icon = () => (
  <svg data-testid="mark" width={18} height={18} aria-hidden="true">
    <circle cx="9" cy="9" r="8" />
  </svg>
)

describe('the label cell keeps icon and text on one row', () => {
  it('lays the cell out as a row rather than a block', () => {
    render(
      <Button loadingText="Redirecting...">
        <Icon />
        Continue with Google
      </Button>
    )
    const cell = screen.getByTestId('mark').parentElement!
    // THE ASSERTION THAT WOULD HAVE CAUGHT IT. A plain wrapper has neither.
    expect(cell.className).toContain('flex')
    expect(cell.className).toContain('items-center')
  })

  it('carries the size variant gap down to where the icon actually is', () => {
    // The button's own `gap-2` now spaces ONE item, so it has to be inherited
    // through both levels or the icon welds itself to the word. Hardcoding a
    // value here would be wrong for `s` and for the two icon-only sizes.
    render(
      <Button loadingText="Saving...">
        <Icon />
        Save
      </Button>
    )
    const cell = screen.getByTestId('mark').parentElement!
    const grid = cell.parentElement!
    expect(grid.dataset.buttonLabel).toBeDefined()
    expect(grid.className).toContain('gap-[inherit]')
    expect(cell.className).toContain('gap-[inherit]')
  })

  it('wraps children exactly once, so the icon is not nested deeper each render', () => {
    render(
      <Button loadingText="Redirecting...">
        <Icon />
        Continue with Google
      </Button>
    )
    const button = screen.getByRole('button')
    expect(button.querySelectorAll('[data-button-label]')).toHaveLength(1)
    // Icon is one level below the cell, not buried under extra wrappers.
    expect(screen.getByTestId('mark').parentElement!.parentElement!.dataset.buttonLabel).toBeDefined()
  })
})

describe('the width-reservation trick still holds', () => {
  it('keeps both labels mounted so the control cannot resize mid-click', () => {
    const { rerender } = render(
      <Button loadingText="Signing in...">Sign in</Button>
    )
    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.getByText('Signing in...')).toBeInTheDocument()
    rerender(<Button loading loadingText="Signing in...">Sign in</Button>)
    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.getByText('Signing in...')).toBeInTheDocument()
  })

  it('names the button after the ACTIVE label only', () => {
    // The forty auth tests that went red the first time. jsdom applies no CSS,
    // so `invisible` alone leaves both halves in the accessible name.
    //
    // Exact equality on both sides, deliberately. "Sign in" is NOT a substring
    // of "Signing in..." -- the g interrupts it -- so each name proves the
    // other label is absent rather than merely present-and-outnumbered.
    const { rerender } = render(
      <Button loadingText="Signing in...">Sign in</Button>
    )
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    rerender(<Button loading loadingText="Signing in...">Sign in</Button>)
    // AND NOT "Loading Signing in...", which is what it said until the
    // spinner was made decorative. See CssSpinner's `decorative`.
    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeInTheDocument()
  })

  it('still lets a bare spinner announce itself', () => {
    // The other half of `decorative`: a button with no `loadingText` has
    // nothing but the spinner to say it is working, so the label stays.
    render(<Button loading>Save</Button>)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('leaves a button with no loadingText completely unwrapped', () => {
    // The opt-out has to stay free: no wrapper, so the icon is still a direct
    // flex child of the button and nothing about its spacing changed.
    render(
      <Button>
        <Icon />
        Export
      </Button>
    )
    const button = screen.getByRole('button')
    expect(button.querySelector('[data-button-label]')).toBeNull()
    expect(screen.getByTestId('mark').parentElement).toBe(button)
  })
})
