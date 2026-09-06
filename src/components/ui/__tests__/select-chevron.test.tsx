import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Select } from '../select'

/**
 * The chevron must be centred by a FLEX BOX, not by a line box.
 *
 * `SelectPrimitive.Icon` renders inline by default, so its box is a line box:
 * taller than the 16px glyph inside it, with the glyph hanging off the text
 * baseline. The trigger's own `items-center` then centres that line box
 * correctly and the chevron still sits high inside it.
 *
 * Measured 2026-09-06 on the status filter at 375px, before the fix: the
 * chevron's centre was 3.3px above the trigger's while the label's was 0.8px
 * above -- a 2.5px disagreement between two things on one row, which is the
 * size that reads as "off" without reading as broken. After: 0.0px against the
 * trigger on every select at 375 and 1440.
 *
 * A class assertion, because jsdom has no layout and cannot measure a
 * baseline. The geometry was verified in the browser; what regresses silently
 * is someone trimming these classes as redundant.
 */
describe('the select chevron', () => {
  it('is centred by a flex box rather than left on a baseline', () => {
    const { container } = render(
      <Select
        aria-label="Filter"
        value="a"
        onValueChange={() => {}}
        items={[{ value: 'a', label: 'All (27)' }]}
      />
    )
    const trigger = container.querySelector('[role="combobox"]')!
    // The trigger centres its children...
    expect(trigger.className).toContain('items-center')
    // ...and the icon wrapper is a box that can BE centred, rather than a line
    // box the glyph hangs inside.
    const wrapper = trigger.querySelector('svg')!.parentElement!
    expect(wrapper.className).toContain('flex')
    expect(wrapper.className).toContain('items-center')
  })
})
