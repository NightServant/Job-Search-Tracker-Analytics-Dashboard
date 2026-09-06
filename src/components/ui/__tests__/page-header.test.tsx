import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from '../page-header'

describe('PageHeader', () => {
  it('renders the title as a heading', () => {
    render(<PageHeader title="Dashboard" />)
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeTruthy()
  })

  it('marks its root with data-body-header so every screen can share the same layout hook', () => {
    const { container } = render(<PageHeader title="Dashboard" />)
    expect(container.querySelector('[data-body-header]')).toBeTruthy()
  })

  it('renders an action slot when given one', () => {
    render(<PageHeader title="Applications" action={<button>Add</button>} />)
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy()
  })

  it('omits the action slot entirely when none is given', () => {
    const { container } = render(<PageHeader title="Dashboard" />)
    expect(container.querySelector('[data-body-header]')!.children).toHaveLength(1)
  })
})

describe('breathing room on a phone', () => {
  it('separates the action from the description by more than the description from the title', () => {
    // Gabe, 2026-09-06: the column read as one crowded block. `gap-1` is right
    // for a title sitting directly above its own sentence, and wrong once a
    // full-width CTA joins them below -- 4px between a description and a
    // primary button says all three are one thing.
    //
    // Two gaps, because there are two RELATIONSHIPS: the description belongs
    // to the title, the action belongs to neither. Verified in the browser at
    // 320px -- 8px title-to-description, 16px description-to-action, against
    // 4px and 4px before.
    const { container } = render(<PageHeader title="analytics" description="how it moves." action={<button>add</button>} />)
    const root = container.querySelector('[data-body-header]')!
    expect(root.className).toContain('gap-2')
    expect(root.className).toContain('sm:gap-1')
    // The slot is the div whose DIRECT child is the control -- the title row
    // above it also contains the button, as a descendant.
    const actionSlot = [...root.querySelectorAll('div')].find(
      (el) => el.firstElementChild?.tagName === 'BUTTON'
    )!
    expect(actionSlot.className).toContain('max-sm:mt-2')
  })
})
