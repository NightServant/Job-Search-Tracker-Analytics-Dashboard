'use client'

import * as React from 'react'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { cn } from '@/lib/utils'
import { CheckIcon, ChevronDownIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'

/**
 * A select whose OPEN LIST this design system controls.
 *
 * WHY IT IS NO LONGER A NATIVE `<select>`. It was, deliberately, and the old
 * comment here made a decent case: five statuses and six currency codes do not
 * obviously justify a hand-built popup, and `<select>` ships the keyboard
 * model, the mobile picker and the screen-reader semantics for free.
 *
 * What that argument left out is the thing Gabe is looking at. A native
 * select's OPTION LIST is drawn by the operating system, and no CSS reaches
 * it. On macOS that is a dark grey rounded panel with system checkmarks and
 * the system font -- in an app whose entire premise is black, white, grey,
 * orange, 4px corners and hairline rules. The closed control followed the
 * design system; the moment anyone clicked it, the design system stopped
 * existing. That is not a cosmetic gap, it is the one surface where the app
 * looked borrowed.
 *
 * So the popup is ours now. Base UI's Select is what pays the debts the old
 * comment correctly named: it implements the full listbox keyboard model
 * (type-ahead, Home/End, arrow wrap), the ARIA roles, focus return and
 * scroll-locking. This file supplies appearance and nothing else -- the moment
 * it starts reimplementing behaviour, it has taken on the very thing the
 * native element was keeping.
 *
 * WHAT IT COSTS, honestly: on iOS a native `<select>` opens the wheel picker,
 * and this does not. One styled list everywhere beats two implementations to
 * keep in step, which is the same call the CV editors made -- and the items
 * grow to a 44px touch target on a coarse pointer so the loss is the wheel's
 * ergonomics, not its reachability.
 *
 * THE TRIGGER IS UNCHANGED. It keeps the Input's four states and the identical
 * error contract -- `error` plus `id` renders the message and wires
 * `aria-describedby` -- so a form can hold a mix of the two without
 * special-casing either, exactly as before.
 */
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  /**
   * The options, as data.
   *
   * `<option>` children were the old shape, and they cannot survive the move:
   * they were real DOM before, and here they would be markup that is never
   * rendered -- a lie in the JSX that a reader would reasonably believe. Three
   * call sites pass a list already; they pass it directly now.
   */
  items: SelectOption[]
  value: string
  /** The VALUE, not a change event: there is no native element to read one off. */
  onValueChange: (value: string) => void
  id?: string
  name?: string
  disabled?: boolean
  required?: boolean
  error?: string
  /** Shown when `value` matches no item. */
  placeholder?: string
  className?: string
  'aria-label'?: string
}

export function Select({
  items,
  value,
  onValueChange,
  id,
  name,
  disabled,
  required,
  error,
  placeholder = 'select',
  className,
  'aria-label': ariaLabel,
}: SelectProps) {
  const describedBy = error && id ? `${id}-error` : undefined
  const selected = items.find((item) => item.value === value)

  return (
    <div className="w-full">
      <SelectPrimitive.Root
        value={value}
        onValueChange={(next) => onValueChange(String(next ?? ''))}
        name={name}
        disabled={disabled}
        required={required}
      >
        <SelectPrimitive.Trigger
          id={id}
          aria-label={ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          data-error={error ? '' : undefined}
          className={cn(
            iconMotion('none'),
            'group/icon flex h-10 w-full items-center justify-between gap-2 rounded-md border',
            'bg-bg-canvas pl-3 pr-3 text-left text-body-m text-text-primary',
            'transition-colors duration-(--duration-fast)',
            'focus-visible:border-accent-default focus-visible:outline-none',
            'focus-visible:ring-2 focus-visible:ring-accent-default/30',
            'disabled:cursor-not-allowed disabled:bg-bg-inset disabled:text-text-muted',
            error ? 'border-status-rejected-mark' : 'border-border-default',
            className
          )}
        >
          <SelectPrimitive.Value className="truncate">
            {selected ? selected.label : <span className="text-text-muted">{placeholder}</span>}
          </SelectPrimitive.Value>
          <SelectPrimitive.Icon className="shrink-0 text-text-muted">
            {/* Turns to point up while the list is open -- the chevron says
                which way the control will move, which is the one thing it is
                for. */}
            <ChevronDownIcon
              size={16}
              aria-hidden
              className="transition-transform duration-(--duration-fast) group-data-[popup-open]/icon:rotate-180 motion-reduce:transition-none"
            />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          {/* `alignItemWithTrigger={false}` puts the list BELOW the control
              rather than over it. Overlaying is the macOS convention this is
              replacing, and it makes the trigger jump out from under the
              pointer at the moment of the click. */}
          <SelectPrimitive.Positioner
            sideOffset={4}
            alignItemWithTrigger={false}
            className="z-50"
          >
            {/*
              HAIRLINE, 4px, NO SHADOW. The system separates with rules rather
              than elevation -- AppDialog makes the same call for the same
              reason -- so a drop shadow here would be the only soft edge in
              the app. `min-w-(--anchor-width)` matches the trigger, because a
              list narrower than the control it came from reads as detached.
            */}
            <SelectPrimitive.Popup
              className={cn(
                'max-h-[min(24rem,var(--available-height))] min-w-(--anchor-width) overflow-y-auto',
                'rounded-md border border-border-default bg-bg-canvas py-1',
                'origin-(--transform-origin) outline-none'
              )}
            >
              <SelectPrimitive.List>
                {items.map((item) => (
                  <SelectPrimitive.Item
                    key={item.value}
                    value={item.value}
                    disabled={item.disabled}
                    className={cn(
                      // 36px for a pointer, 44px for a finger.
                      'flex h-9 cursor-default select-none items-center gap-2 pl-3 pr-3',
                      'text-body-m text-text-primary outline-none',
                      '[@media(pointer:coarse)]:h-11',
                      // Highlight is a fill from an existing token, never a
                      // colour -- the accent is reserved for the CHOICE, which
                      // is the tick on the right.
                      'data-highlighted:bg-bg-inset',
                      'data-disabled:cursor-not-allowed data-disabled:text-text-muted'
                    )}
                  >
                    <SelectPrimitive.ItemText className="flex-1 truncate">
                      {item.label}
                    </SelectPrimitive.ItemText>
                    {/*
                      The tick reserves its width whether or not it shows, so
                      selecting an option does not shove every label sideways.
                    */}
                    <span className="flex w-4 shrink-0 justify-center">
                      <SelectPrimitive.ItemIndicator>
                        <CheckIcon size={16} className="text-accent-default" aria-hidden />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.List>
            </SelectPrimitive.Popup>
          </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {error && id && (
        <p id={describedBy} className="mt-1 text-body-s text-status-rejected-mark">
          {error}
        </p>
      )}
    </div>
  )
}
