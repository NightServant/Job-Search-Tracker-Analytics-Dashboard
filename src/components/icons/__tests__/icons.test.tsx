import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { icons, SunIcon } from '../index'

describe('the icon set', () => {
  it('exports every icon in the Figma set', () => {
    expect(Object.keys(icons)).toHaveLength(34)
  })

  it('takes currentColor so semantic tokens drive the colour', () => {
    const { container } = render(<SunIcon />)
    expect(container.querySelector('svg')?.getAttribute('stroke')).toBe('currentColor')
  })

  it('marks icons decorative, since each one sits beside a label', () => {
    const { container } = render(<SunIcon />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders at the requested size, not only the authored 20px', () => {
    const { container } = render(<SunIcon size={44} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('width')).toBe('44')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 20 20')
  })

  it('keeps concentric rings concentric', () => {
    // Sun, Search and Clock drifted off-centre in Figma under MIN constraints.
    // Target is the new icon with the same two-ring construction, and it is the
    // one that would show the drift most plainly.
    for (const name of ['Sun', 'Clock', 'Target'] as const) {
      const { container, unmount } = render(React.createElement(icons[name]))
      for (const circle of container.querySelectorAll('circle')) {
        expect(circle.getAttribute('cx'), name).toBe('10')
        expect(circle.getAttribute('cy'), name).toBe('10')
      }
      unmount()
    }
  })

  it('never hardcodes a fill, which would ignore the theme', () => {
    for (const [name, Icon] of Object.entries(icons)) {
      const { container } = render(<Icon />)
      expect(container.querySelector('svg')?.getAttribute('fill'), name).toBe('none')
    }
  })
})
