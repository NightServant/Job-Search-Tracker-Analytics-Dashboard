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
