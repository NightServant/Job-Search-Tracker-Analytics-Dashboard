import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../button'
import { Input, PasswordInput } from '../input'
import { StatusMarker, STATUSES } from '../status-marker'
import { AtsCheck, ATS_RESULTS } from '../ats-check'
import { Breadcrumb } from '../breadcrumb'
import { ThemeToggle } from '../theme-toggle'

const setTheme = vi.fn()
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme }),
}))

describe('Button', () => {
  it('caps its radius at 4px in every variant', () => {
    for (const variant of ['primary', 'secondary', 'ghost'] as const) {
      const { container, unmount } = render(<Button variant={variant}>Go</Button>)
      const cls = container.querySelector('button')!.className
      // rounded-md is the 4px token. rounded-lg/xl/full would exceed the cap.
      expect(cls).toContain('rounded-md')
      expect(cls).not.toMatch(/rounded-(lg|xl|2xl|3xl|full)/)
      unmount()
    }
  })

  it('never carries orange-500, which fails AA on white', () => {
    const { container } = render(<Button>Go</Button>)
    expect(container.innerHTML).not.toContain('accent-500')
  })

  it('keeps its foreground colour after the class merge', () => {
    // tailwind-merge read the custom `text-body-m` scale as a colour and
    // dropped `text-accent-on-accent`, leaving white-on-orange rendering as
    // inherited near-black on orange. It failed only in a browser.
    const { container } = render(<Button variant="primary" size="m">Go</Button>)
    const cls = container.querySelector('button')!.className
    expect(cls).toContain('text-accent-on-accent')
    expect(cls).toContain('text-body-m')
  })

  it('defaults to type="button" so it cannot submit a form by accident', () => {
    render(<Button>Go</Button>)
    expect(screen.getByRole('button')).toHaveProperty('type', 'button')
  })
})

describe('StatusMarker', () => {
  it.each(STATUSES)('renders %s as a rule and a label, never a pill', (status) => {
    const { container } = render(<StatusMarker status={status} />)
    const rule = container.querySelector('[data-status-rule]')
    expect(rule).toBeTruthy()
    expect(rule!.className).toContain('rounded-none')
    expect(rule!.className).toContain('h-[2px]')
    // A pill would need a fill and a radius. Neither may appear.
    expect(rule!.className).not.toMatch(/rounded-(sm|md|lg|xl|full)/)
  })

  it('emits a literal colour class per status, not an interpolated one', () => {
    // Tailwind scans source text: `bg-status-${s}-mark` emits no CSS at all.
    for (const status of STATUSES) {
      const { container, unmount } = render(<StatusMarker status={status} />)
      expect(container.querySelector('[data-status-rule]')!.className).toContain(
        `bg-status-${status}-mark`
      )
      unmount()
    }
  })

  it('never uses the accent, which is reserved for actions', () => {
    for (const status of STATUSES) {
      const { container, unmount } = render(<StatusMarker status={status} />)
      expect(container.innerHTML).not.toContain('accent')
      unmount()
    }
  })

  it('carries the status in text, not colour alone', () => {
    render(<StatusMarker status="interviewing" />)
    expect(screen.getByText('Interviewing')).toBeTruthy()
  })
})

describe('AtsCheck', () => {
  it.each(ATS_RESULTS)('renders %s with the marker vocabulary', (result) => {
    const { container } = render(<AtsCheck result={result} />)
    const rule = container.querySelector('[data-status-rule]')
    expect(rule).toBeTruthy()
    expect(rule!.className).toContain('rounded-none')
  })

  it('uses amber for review, never the orange accent', () => {
    const { container } = render(<AtsCheck result="review" />)
    expect(container.querySelector('[data-status-rule]')!.className).toContain('bg-amber-600')
    expect(container.innerHTML).not.toContain('accent')
  })
})

describe('Input', () => {
  it('exposes no way to render a field focused', () => {
    // Focus is a DOM state. Making it a prop is how the Figma Sign Up frame
    // ended up with two fields focused at once.
    const props = Object.keys(Input as unknown as object)
    expect(props).not.toContain('focused')
    const { container } = render(<Input id="a" />)
    expect(container.querySelector('input')!.getAttribute('data-focused')).toBeNull()
  })

  it('wires the error message to the field for screen readers', () => {
    render(<Input id="email" error="Enter a valid email" />)
    const input = screen.getByRole('textbox')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe('email-error')
    expect(screen.getByText('Enter a valid email').id).toBe('email-error')
  })

  it('marks a disabled field disabled rather than just dimming it', () => {
    render(<Input id="a" disabled />)
    expect(screen.getByRole('textbox')).toHaveProperty('disabled', true)
  })
})

describe('PasswordInput', () => {
  it('anchors the reveal control to the field right edge, not a fixed offset', () => {
    const { container } = render(<PasswordInput id="pw" />)
    const toggle = container.querySelector('button')!
    expect(toggle.className).toContain('right-2')
    expect(toggle.className).not.toMatch(/left-\[?\d/)
  })

  it('toggles the field between masked and revealed', () => {
    const { container } = render(<PasswordInput id="pw" />)
    const field = container.querySelector('input')!
    expect(field.type).toBe('password')
    fireEvent.click(screen.getByLabelText('Show password'))
    expect(field.type).toBe('text')
  })
})

describe('Breadcrumb', () => {
  it('renders the current page as text, not a link', () => {
    render(<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Jobs' }]} />)
    expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Jobs' })).toBeNull()
    expect(screen.getByText('Jobs').getAttribute('aria-current')).toBe('page')
  })
})

describe('ThemeToggle', () => {
  it('renders a 44px target when asked for mobile chrome', () => {
    const { container } = render(<ThemeToggle size={44} />)
    expect(container.querySelector('button')!.className).toContain('h-11')
  })

  it('renders a 32px target on desktop chrome', () => {
    const { container } = render(<ThemeToggle />)
    expect(container.querySelector('button')!.className).toContain('h-8')
  })

  it('asks next-themes to switch rather than holding its own state', () => {
    setTheme.mockClear()
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(setTheme).toHaveBeenCalledWith('dark')
  })
})
