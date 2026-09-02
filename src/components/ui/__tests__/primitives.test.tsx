import * as React from 'react'
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

describe('Input with the smooth caret merged in', () => {
  // The merge Gabe asked for on 2026-09-02. Before it, the auth screens
  // imported skiper106's SmoothInput directly and re-typed Input's border and
  // background into a `wrapperClassName` -- a copy that had already fallen
  // behind on the focus ring, the error border and the disabled state. These
  // assert the two branches are ONE component with one class string, which is
  // the only thing that stops it drifting apart again.
  const classesOf = (el: Element) => el.className.split(/\s+/).filter(Boolean)

  it('gives the caret branch every class the plain one has', () => {
    // Containment, not string equality: SmoothInput adds four STRUCTURAL
    // classes of its own -- the grid cell it shares with the caret, and the
    // outline reset -- and those are not chrome. What must not differ is a
    // single one of the design system's own classes.
    const plain = render(<Input id="a" />)
    const plainClasses = classesOf(plain.container.querySelector('input')!)
    plain.unmount()

    const smooth = render(<Input id="b" smoothCaret />)
    const smoothClasses = classesOf(smooth.container.querySelector('input')!)

    expect(plainClasses.length).toBeGreaterThan(10)
    expect(smoothClasses).toEqual(expect.arrayContaining(plainClasses))

    const extra = smoothClasses.filter((c) => !plainClasses.includes(c))
    expect(extra.sort()).toEqual([
      'col-end-2',
      'col-start-1',
      'outline-none',
      'row-end-2',
      'row-start-1',
    ])
  })

  it('drops the vendor background rather than layering it over ours', () => {
    // SmoothInput ships `bg-transparent text-inherit`, which on a page with a
    // tinted section would render a see-through field. tailwind-merge resolves
    // that in our favour because Input passes its classes LAST -- this is the
    // assertion that notices if that order is ever reversed.
    const { container } = render(<Input id="bg" smoothCaret />)
    const cls = classesOf(container.querySelector('input')!)
    expect(cls).not.toContain('bg-transparent')
    expect(cls).not.toContain('text-inherit')
    expect(cls).toContain('bg-bg-canvas')
  })

  it('carries the error state through the caret branch too', () => {
    // The hand-copied wrapperClassName never had this at all: a failed
    // validation on the sign-in email field drew no error border.
    const { container } = render(<Input id="c" smoothCaret error="Nope" />)
    const field = container.querySelector('input')!
    expect(field.className).toContain('border-status-rejected-mark')
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(field.getAttribute('aria-describedby')).toBe('c-error')
    expect(screen.getByText('Nope')).toBeTruthy()
  })

  it('draws a caret only when asked', () => {
    // Positive/negative pair on the FEATURE, so "chrome is identical" cannot
    // be satisfied by the caret branch quietly rendering a plain input.
    const off = render(<Input id="d" />)
    expect(off.container.querySelector('[style*="caret-color"]')).toBeNull()
    off.unmount()

    const on = render(<Input id="e" smoothCaret />)
    expect(on.container.querySelector('[style*="caret-color"]')).not.toBeNull()
  })

  it('hands a ref the real input, not the wrapper', () => {
    // SmoothInput was a plain function component and swallowed refs entirely.
    // Input is a forwardRef, so delegating to it without fixing that would
    // have been a silent regression at every call site that focuses a field.
    const ref = React.createRef<HTMLInputElement>()
    render(<Input id="f" smoothCaret ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
    expect(ref.current!.id).toBe('f')
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

  it('draws an eye rather than the magnifier it used to', () => {
    // This shipped with SearchIcon for "show" and LockIcon for "hide", which
    // put a search affordance inside the signup form's password field. The
    // assertion is on GEOMETRY, not on the imported name: the eye's pupil is
    // a circle at 12,12 r=3, the magnifier's lens is 11,11 r=8 and its handle
    // is the only path in the set containing 4.34. Swapping the import back
    // fails both halves.
    const { container } = render(<PasswordInput id="pw" />)
    const svg = container.querySelector('button svg')!

    expect(svg.querySelector('circle[cx="12"][cy="12"][r="3"]')).toBeTruthy()
    expect(svg.querySelector('circle[r="8"]')).toBeNull()
    expect(svg.innerHTML).not.toContain('4.34')
  })

  it('swaps the eye for a struck-through eye once revealed', () => {
    // Positive companion to the above: without this, an eye hard-coded in
    // both states would pass. eye-off is the same pupil plus a slash, so the
    // discriminator is the extra line, not the circle.
    const { container } = render(<PasswordInput id="pw" />)
    const before = container.querySelectorAll('button svg *').length

    fireEvent.click(screen.getByLabelText('Show password'))

    const after = container.querySelectorAll('button svg *').length
    expect(after).toBeGreaterThan(before)
    expect(screen.getByLabelText('Hide password')).toBeTruthy()
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
