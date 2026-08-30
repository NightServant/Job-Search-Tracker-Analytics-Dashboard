'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * A fixed, fully-visible set of mutually exclusive options -- the ARIA APG
 * radiogroup pattern, not a styled `<select>`. Settings' default-currency
 * row is the first consumer: six fixed currencies is a case where showing
 * all of them beats hiding five behind a dropdown.
 *
 * This owes full APG keyboard support, not just `role="radio"` attributes:
 * arrow keys move both focus and selection among the roving-tabindex set,
 * and Home/End jump to the ends. `StatusTabs` shipped the shortcut version
 * of this exact shape on this branch -- roving tabindex with no
 * `onKeyDown`, five of six tabs unreachable from the keyboard -- and needed
 * a fix round. This does not get to happen twice, so the keyboard handling
 * here mirrors `StatusTabs`'s fixed implementation directly.
 *
 * `disabled` is a real gate, not a visual-only affordance: it short-circuits
 * `handleKeyDown` before any option is computed, and every option button
 * carries the native `disabled` attribute too. A caller that only greyed
 * the group out with CSS (`pointer-events-none`) would still let a focused
 * option fire `onChange` on ArrowRight/Home/End, because pointer-events-none
 * blocks pointer hit-testing, not keyboard activation of an element that is
 * already focused.
 *
 * Deliberately takes no `id`. A `<div role="radiogroup">` is not a
 * labelable element, so a `<label htmlFor>` pointed at it would match an id
 * in the DOM without doing anything when clicked -- a first version of this
 * component tried fixing that by putting the id on whichever option button
 * represents the current value, which does make the click association
 * real, but it also hands that button the label's own text as its
 * accessible name (`<label for>` wins over a button's own text content in
 * the accname algorithm) -- so the selected option would announce as
 * "Default currency" instead of "PHP", overwriting the one piece of
 * information a screen reader user needs from a radio: which option this
 * one is. `aria-label` on the group already supplies its accessible name;
 * a caller wanting a visible on-screen label should render it as plain
 * text, not as a `<label htmlFor>` aimed at this component.
 */
export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'id'> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  className,
  ...props
}: SegmentedControlProps<T>) {
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    const currentIndex = options.findIndex((option) => option.value === value)
    let nextIndex: number
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % options.length
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + options.length) % options.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = options.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    onChange(options[nextIndex].value)
    itemRefs.current[nextIndex]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      // w-fit and overflow-hidden are both load-bearing.
      //
      // w-fit: `inline-flex` still stretches when its parent is a flex column
      // with the default `align-items: stretch`, which is what Field is. The
      // group then spanned the full 720px settings column while its six
      // fixed-width buttons packed left -- the ~400px of bordered empty box
      // after AUD that Gabe flagged. inline-flex sizing to content is only
      // true when nothing stretches it.
      //
      // overflow-hidden: a selected end segment paints a square fill that
      // otherwise bleeds past the group's own 4px corner radius.
      className={cn(
        'inline-flex w-fit overflow-hidden rounded-md border border-border-default',
        className
      )}
      {...props}
    >
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(node) => {
              itemRefs.current[index] = node
            }}
            type="button"
            role="radio"
            value={option.value}
            aria-checked={selected}
            disabled={disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              if (!disabled) onChange(option.value)
            }}
            className={cn(
              'h-9 px-3 text-body-s transition-colors duration-[--duration-fast]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default',
              'disabled:cursor-not-allowed disabled:opacity-50',
              index > 0 && 'border-l border-border-default',
              selected
                ? 'bg-accent-default text-accent-on-accent'
                : 'text-text-secondary hover:bg-bg-inset hover:text-text-primary'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
