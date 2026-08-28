import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { IconButton } from '../icon-button'
import { TrashIcon } from '@/components/icons'

afterEach(() => cleanup())

describe('IconButton', () => {
  it('is a 28x36 control at the capped 4px radius, with no shadow', () => {
    const { container } = render(
      <IconButton aria-label="Delete">
        <TrashIcon size={16} aria-hidden />
      </IconButton>
    )
    const button = container.firstElementChild as HTMLElement
    expect(button.className).toContain('h-7')
    expect(button.className).toContain('w-9')
    expect(button.className).toContain('rounded-md')
    expect(button.className).not.toMatch(/shadow/)
  })

  it('defaults to type=button so one inside a form cannot submit it', () => {
    render(<IconButton aria-label="Delete" />)
    expect(screen.getByRole('button', { name: 'Delete' }).getAttribute('type')).toBe('button')
  })

  it('leaves shrink-0 to the caller rather than baking it in', () => {
    // Four of the seven call sites this replaced sit in a flex row and need
    // it; the three kanban controls are absolutely positioned and never had
    // it. Baking it into the base would have changed those three silently.
    const { container } = render(<IconButton aria-label="Drag" />)
    expect(container.firstElementChild!.className).not.toMatch(/(^|\s)shrink-0(\s|$)/)

    cleanup()
    const pinned = render(<IconButton aria-label="Delete" className="shrink-0" />)
    expect(pinned.container.firstElementChild!.className).toMatch(/(^|\s)shrink-0(\s|$)/)
  })

  it('lets a caller widen it for a text label instead of forking the component', () => {
    // The Documents "Versions" control carries a word, not a glyph. It has to
    // win over the base width rather than sit alongside it.
    const { container } = render(<IconButton className="w-auto px-2">Versions</IconButton>)
    const className = container.firstElementChild!.className
    expect(className).toContain('w-auto')
    expect(className).not.toMatch(/(^|\s)w-9(\s|$)/)
  })

  it('passes through the handlers and the accessible name it is given', () => {
    const onClick = vi.fn()
    render(<IconButton aria-label="Delete Backend CV" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Backend CV' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
