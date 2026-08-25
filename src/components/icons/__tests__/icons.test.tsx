import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { icons, SunIcon, ClockIcon } from '../index'

describe('the icon set', () => {
  it('exports all 26 icons from the Figma set', () => {
    expect(Object.keys(icons)).toHaveLength(26)
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

  it('keeps ring-and-path icons concentric at any size', () => {
    // Sun and Clock draw a circle plus a path. In Figma their rings were pinned
    // with MIN constraints and drifted off-centre when scaled; a viewBox has no
    // such concept, so the circle must sit at the icon's centre by construction.
    for (const Icon of [SunIcon, ClockIcon]) {
      const { container } = render(<Icon />)
      const circle = container.querySelector('circle')
      expect(circle?.getAttribute('cx')).toBe('10')
      expect(circle?.getAttribute('cy')).toBe('10')
    }
  })

  it('never hardcodes a fill, which would ignore the theme', () => {
    for (const [name, Icon] of Object.entries(icons)) {
      const { container } = render(<Icon />)
      expect(container.querySelector('svg')?.getAttribute('fill'), name).toBe('none')
    }
  })
})
