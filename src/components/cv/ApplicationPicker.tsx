'use client'

import * as React from 'react'
import { icons } from '@/components/icons'
import { cn } from '@/lib/utils'
import type { Job } from '@/types'

/**
 * Choosing which application to work against, when there are forty-five.
 *
 * THE DROPDOWN IT REPLACES ASKED THE WRONG QUESTION, and the length was only
 * the visible half of that. A `<select>` of every application is unusable past
 * a dozen -- no search, no ordering, and the one you want is wherever the
 * insertion order put it. But the deeper problem is that a single-select
 * control implies the document has ONE target, and a CV sent to forty-five
 * jobs has forty-five. See the note at the bottom of this file for where that
 * leads.
 *
 * TWO THINGS FIX THE SELECTION ITSELF:
 *
 *   SEARCH, because forty-five rows is a list you read and a list you read is
 *   a list you scroll past. Typing "stripe" is one action; finding Stripe in
 *   an alphabetical select is several.
 *
 *   RELEVANCE ORDER, because the applications this CV was ACTUALLY SENT TO are
 *   the realistic targets and everything else is a long tail.
 *   `application_documents` already records exactly that relationship -- it is
 *   read here through `linkedJobIds` -- so those rows sort first and carry a
 *   marker. The CV knows where it has been; the picker should not make you
 *   remember.
 *
 * BUILT HERE RATHER THAN ON `ui/combobox`. That component is vendored, unused
 * anywhere in the app, and wraps Base UI's combobox with its own filtering and
 * grouping model; adopting it for the first time inside a rail meant learning
 * an API to get a listbox, and its item styling carries `rounded-md` against a
 * design system that caps radius at 4px. This is a text input and a filtered
 * list with the combobox ARIA pattern written out, which is the part that
 * actually has to be right.
 *
 * THE KEYBOARD CONTRACT IS THE REASON THIS IS NOT A DIV WITH AN ONCLICK:
 * `role="combobox"` with `aria-expanded` and `aria-activedescendant`, the list
 * as `role="listbox"`, arrows to move, Enter to take, Escape to close. A
 * picker that only works with a mouse is one a keyboard user cannot reach at
 * all, and this one sits in front of every other feature in the rail.
 */

export interface ApplicationPickerProps {
  jobs: Job[]
  /** Applications this CV has already been pinned to. Sorted first. */
  linkedJobIds?: readonly string[]
  value: string
  onChange: (jobId: string) => void
  label?: string
  className?: string
}

interface Option {
  job: Job
  linked: boolean
}

/** Match on role, company or location, because people search by any of them. */
function matches(job: Job, query: string): boolean {
  if (!query) return true
  const haystack = `${job.role} ${job.company} ${job.location ?? ''}`.toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}

export function ApplicationPicker({
  jobs,
  linkedJobIds = [],
  value,
  onChange,
  label = 'application',
  className,
}: ApplicationPickerProps) {
  const [query, setQuery] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [highlight, setHighlight] = React.useState(0)
  const listId = React.useId()
  const rootRef = React.useRef<HTMLDivElement | null>(null)

  const linked = React.useMemo(() => new Set(linkedJobIds), [linkedJobIds])
  const selected = jobs.find((job) => job.id === value) ?? null

  const options = React.useMemo<Option[]>(() => {
    const visible = jobs.filter((job) => matches(job, query))
    // Linked first, then by company so the long tail is at least predictable.
    return visible
      .map((job) => ({ job, linked: linked.has(job.id) }))
      .sort((a, b) => {
        if (a.linked !== b.linked) return a.linked ? -1 : 1
        return a.job.company.localeCompare(b.job.company)
      })
  }, [jobs, query, linked])

  React.useEffect(() => {
    setHighlight(0)
  }, [query])

  // Close on an outside click, or the list stays over the document.
  React.useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function choose(option: Option) {
    onChange(option.job.id)
    setQuery('')
    setOpen(false)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, options.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (event.key === 'Enter' && open && options[highlight]) {
      event.preventDefault()
      choose(options[highlight])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const CheckIcon = icons.Check
  const SearchIcon = icons.Search

  return (
    <div ref={rootRef} className={cn('relative flex flex-col gap-1.5', className)}>
      <label
        htmlFor={`${listId}-input`}
        className="text-label-caps uppercase text-text-secondary"
      >
        {label}
      </label>

      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        >
          <SearchIcon size={14} />
        </span>
        <input
          id={`${listId}-input`}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && options[highlight] ? `${listId}-option-${options[highlight].job.id}` : undefined
          }
          value={open ? query : selected ? `${selected.role} — ${selected.company}` : ''}
          placeholder={jobs.length ? `search ${jobs.length} applications` : 'no applications yet'}
          disabled={jobs.length === 0}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-[4px] border border-border-default bg-bg-canvas pl-9 pr-3 text-body-m text-text-primary placeholder:text-text-muted transition-colors focus-visible:border-accent-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default/30 disabled:cursor-not-allowed disabled:bg-bg-inset disabled:text-text-muted"
        />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto border border-border-default bg-bg-canvas"
        >
          {value && (
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setQuery('')
                  setOpen(false)
                }}
                className="w-full px-3 py-2 text-left text-body-s text-text-muted hover:bg-bg-surface"
              >
                clear selection
              </button>
            </li>
          )}

          {options.length === 0 && (
            <li className="px-3 py-3 text-body-s text-text-muted">
              nothing matches “{query}”.
            </li>
          )}

          {options.map((option, index) => {
            const isSelected = option.job.id === value
            return (
              <li key={option.job.id}>
                <button
                  type="button"
                  id={`${listId}-option-${option.job.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(option)}
                  className={cn(
                    'flex w-full items-start gap-2 px-3 py-2 text-left transition-colors',
                    index === highlight ? 'bg-bg-surface' : 'bg-transparent'
                  )}
                >
                  <span className="mt-0.5 w-4 shrink-0 text-accent-default">
                    {isSelected && <CheckIcon size={14} aria-hidden />}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-body-m text-text-primary">
                      {option.job.role}
                    </span>
                    <span className="truncate text-body-s text-text-muted">
                      {option.job.company}
                      {option.linked && (
                        // A label against a rule, not a filled tag: this is
                        // status, and status is never a pill in this app.
                        <span className="ml-2 border-b border-accent-default text-text-secondary">
                          already sent
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
