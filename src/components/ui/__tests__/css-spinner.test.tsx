import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { CssSpinner } from '../css-spinner'

describe('the CSS spinner', () => {
  it('renders a spinner with no glyph', () => {
    const { container } = render(<CssSpinner />)
    expect(container.querySelector('svg')).toBeNull()
    expect(container.firstElementChild!.className).toContain('animate-spin')
  })

  it('announces itself to a screen reader', () => {
    const { container } = render(<CssSpinner />)
    expect(container.firstElementChild!.getAttribute('role')).toBe('status')
    expect(container.textContent).toContain('Loading')
  })
})
