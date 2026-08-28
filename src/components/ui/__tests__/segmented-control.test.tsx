import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { SegmentedControl } from '../segmented-control'

afterEach(() => cleanup())

const OPTIONS = [
  { value: 'PHP', label: 'PHP' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
]

describe('SegmentedControl', () => {
  it('is an ARIA radiogroup, not a set of bare role=radio buttons with no group', () => {
    render(<SegmentedControl options={OPTIONS} value="PHP" onChange={vi.fn()} aria-label="Currency" />)
    expect(screen.getByRole('radiogroup', { name: 'Currency' })).toBeTruthy()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('marks the selected option checked and every other option unchecked', () => {
    render(<SegmentedControl options={OPTIONS} value="USD" onChange={vi.fn()} aria-label="Currency" />)
    expect(screen.getByRole('radio', { name: 'PHP' }).getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('radio', { name: 'USD' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'EUR' }).getAttribute('aria-checked')).toBe('false')
  })

  it('calls onChange with the clicked option', () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="PHP" onChange={onChange} aria-label="Currency" />)
    fireEvent.click(screen.getByRole('radio', { name: 'EUR' }))
    expect(onChange).toHaveBeenCalledWith('EUR')
  })

  it('uses roving tabindex: only the selected option is in the tab order', () => {
    render(<SegmentedControl options={OPTIONS} value="USD" onChange={vi.fn()} aria-label="Currency" />)
    expect(screen.getByRole('radio', { name: 'PHP' }).getAttribute('tabindex')).toBe('-1')
    expect(screen.getByRole('radio', { name: 'USD' }).getAttribute('tabindex')).toBe('0')
    expect(screen.getByRole('radio', { name: 'EUR' }).getAttribute('tabindex')).toBe('-1')
  })

  // The APG obligation StatusTabs already had to fix on this branch: a
  // roving-tabindex widget with no arrow-key handler leaves five of six
  // options unreachable from the keyboard, because Tab only ever lands on
  // the one option with tabindex=0.
  it('moves selection with ArrowRight, wrapping from the last option to the first', () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="EUR" onChange={onChange} aria-label="Currency" />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'EUR' }), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('PHP')
  })

  it('moves selection with ArrowLeft, wrapping from the first option to the last', () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="PHP" onChange={onChange} aria-label="Currency" />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'PHP' }), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith('EUR')
  })

  it('jumps to the first option on Home and the last on End', () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="USD" onChange={onChange} aria-label="Currency" />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'USD' }), { key: 'Home' })
    expect(onChange).toHaveBeenLastCalledWith('PHP')
    fireEvent.keyDown(screen.getByRole('radio', { name: 'USD' }), { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith('EUR')
  })

  it('moves focus to the newly selected option, not just its selection state', () => {
    render(<SegmentedControl options={OPTIONS} value="PHP" onChange={vi.fn()} aria-label="Currency" />)
    const first = screen.getByRole('radio', { name: 'PHP' })
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: 'USD' })).toHaveFocus()
  })

  it('ignores keys it does not handle', () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={OPTIONS} value="PHP" onChange={onChange} aria-label="Currency" />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'PHP' }), { key: 'a' })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('exposes the option value as the radio button\'s own value attribute', () => {
    render(<SegmentedControl options={OPTIONS} value="PHP" onChange={vi.fn()} aria-label="Currency" />)
    const radios = screen.getAllByRole('radio')
    expect(radios.map((r) => r.getAttribute('value'))).toEqual(['PHP', 'USD', 'EUR'])
  })

  // A regression this component already tried and reverted: putting the
  // caller's id on the selected option so a Field's `<label htmlFor>` would
  // have something real to click made that option's *accessible name*
  // become the label text ("Default currency") instead of its own value
  // ("PHP") -- a `<label for>` wins over a button's own text content in the
  // accname algorithm. Each option's accessible name has to stay its own
  // label regardless of which one is selected or how a caller renders a
  // visible heading above the group.
  it('keeps each option\'s own accessible name regardless of which one is selected', () => {
    render(<SegmentedControl options={OPTIONS} value="PHP" onChange={vi.fn()} aria-label="Currency" />)
    expect(screen.getByRole('radio', { name: 'PHP' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: 'USD' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: 'EUR' })).toBeTruthy()
  })

  describe('disabled', () => {
    it('marks the group aria-disabled and every option natively disabled', () => {
      render(<SegmentedControl options={OPTIONS} value="PHP" onChange={vi.fn()} aria-label="Currency" disabled />)
      expect(screen.getByRole('radiogroup', { name: 'Currency' }).getAttribute('aria-disabled')).toBe('true')
      for (const radio of screen.getAllByRole('radio')) {
        expect((radio as HTMLButtonElement).disabled).toBe(true)
      }
    })

    it('does not call onChange on click while disabled', () => {
      const onChange = vi.fn()
      render(<SegmentedControl options={OPTIONS} value="PHP" onChange={onChange} aria-label="Currency" disabled />)
      fireEvent.click(screen.getByRole('radio', { name: 'EUR' }))
      expect(onChange).not.toHaveBeenCalled()
    })

    // The exact regression this guards: a greyed-out, aria-disabled control
    // that still issues a write because pointer-events-none only blocks
    // pointer hit-testing, not keyboard activation of an already-focused
    // element.
    it('does not call onChange on ArrowRight while disabled, even when an option already has focus', () => {
      const onChange = vi.fn()
      render(<SegmentedControl options={OPTIONS} value="PHP" onChange={onChange} aria-label="Currency" disabled />)
      const selected = screen.getByRole('radio', { name: 'PHP' })
      fireEvent.keyDown(selected, { key: 'ArrowRight' })
      expect(onChange).not.toHaveBeenCalled()
    })
  })
})
