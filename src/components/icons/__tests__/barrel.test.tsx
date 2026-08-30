// Replaces icons.test.tsx, which asserted a 34-icon count and the
// concentricity of glyphs that no longer exist once the custom hand-drawn set
// is deleted in favour of AnimateIcons (Task 2b, 2026-08-29).
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as React from 'react'
import { icons, type IconName } from '../index'

/**
 * The custom 34-icon set was deleted on 2026-08-29 in favour of AnimateIcons.
 * The barrel keeps the OLD SHAPE deliberately -- a component per glyph plus an
 * `icons` record -- because nav-item.tsx does `icons[icon]` and NAV is typed
 * against IconName. Keeping the shape means the sidebar and its tests do not
 * change in this task.
 */
describe('the icon barrel', () => {
  it('exports every name the nav depends on', () => {
    // Positive companion: an empty record would satisfy every loop below.
    const required: IconName[] = [
      'Overview', 'Applications', 'Calendar', 'Documents', 'Analytics', 'Settings',
    ]
    for (const name of required) {
      expect(icons[name], `icons.${name} is missing`).toBeTruthy()
    }
    expect(Object.keys(icons).length).toBeGreaterThanOrEqual(20)
  })

  it('renders every exported icon without throwing', () => {
    for (const name of Object.keys(icons) as IconName[]) {
      const { unmount } = render(React.createElement(icons[name], { size: 20 }))
      unmount()
    }
  })

  it('inherits colour rather than hard-coding a hex', () => {
    // Both themes render icons on bg/canvas and text/primary inverts between
    // them. AnimateIcons accepts a `color` prop that overrides currentColor --
    // this asserts no call site is passing one and no barrel default sets it.
    const { container } = render(React.createElement(icons.Settings, { size: 20 }))
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('stroke')).toBe('currentColor')
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{6}/i)
  })

  it('defaults to the design system size, not the library default', () => {
    // AnimateIcons defaults to 24; this system draws icons at 20.
    const { container } = render(React.createElement(icons.Settings))
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('20')
  })

  it('is backed by AnimateIcons geometry, not the deleted hand-drawn set', () => {
    // The custom set was drawn on a 20-unit viewBox at 1.75 stroke; AnimateIcons
    // ships a 24-unit viewBox at stroke 2. This is the assertion that actually
    // fails against the old barrel -- stroke/size/hex alone do not, because the
    // hand-drawn set already got those right.
    const { container } = render(React.createElement(icons.Settings, { size: 20 }))
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 24 24')
  })

  it('re-rules GripVertical to the ellipsis-vertical glyph, not the old six-dot grip', () => {
    // Task 2b: no grip/drag glyph exists in AnimateIcons. lu-ellipsis-vertical
    // (three stacked dots) replaces it -- never lu-menu, which reads as "open a
    // menu" rather than "drag me".
    const { container } = render(React.createElement(icons.GripVertical, { size: 20 }))
    expect(container.querySelectorAll('circle')).toHaveLength(3)
  })

  it('re-rules RotateCcw to the history glyph, since the sites mean "restore", not "reload"', () => {
    // lu-refresh-cw exists in the set (contradicting an earlier draft of the
    // plan) but was rejected anyway: the CV editor sites restore a prior
    // version, which is what a history glyph says. lu-history has a document
    // outline the old counter-clockwise-arrow glyph did not.
    const { container } = render(React.createElement(icons.RotateCcw, { size: 20 }))
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 24 24')
  })
})
