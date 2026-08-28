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
 */
export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  ...props
}: SegmentedControlProps<T>) {
  const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
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
      onKeyDown={handleKeyDown}
      className={cn('inline-flex rounded-md border border-border-default', className)}
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
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-9 px-3 text-body-s transition-colors duration-[--duration-fast]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default',
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
