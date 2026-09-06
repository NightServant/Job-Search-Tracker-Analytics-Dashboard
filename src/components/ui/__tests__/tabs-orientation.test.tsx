import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs'

/**
 * The orientation selectors must name the ATTRIBUTE THEY ARE MATCHING.
 *
 * They shipped as `data-horizontal:` / `data-vertical:` -- Tailwind shorthand
 * for the presence of an attribute literally called `data-horizontal`. base-ui
 * writes `data-orientation="horizontal"`, so every one of those rules compiled
 * to a selector that could never match, and nothing errored.
 *
 * Two consequences, both invisible until a second consumer appeared: a
 * horizontal Tabs never took `flex-col`, so the list and the panel sat SIDE BY
 * SIDE; and the list never took its height, so the triggers'
 * `h-[calc(100%-1px)]` stretched them to the full height of the panel. The CV
 * editor's tailoring sheet rendered as two tall boxes beside the content.
 *
 * This asserts the PAIRING -- the attribute the component renders, and the
 * selector the classes match on -- because either one alone is meaningless and
 * it is the mismatch that broke.
 */
describe('tabs orientation', () => {
  const renderTabs = () =>
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">content</TabsContent>
      </Tabs>
    )

  it('renders data-orientation, and matches on data-orientation', () => {
    const { container } = renderTabs()
    const root = container.querySelector('[data-slot="tabs"]')!

    // What the component actually puts in the DOM.
    expect(root.getAttribute('data-orientation')).toBe('horizontal')

    // What the classes look for. If these two ever disagree again, the layout
    // silently reverts to a row and nothing fails but the picture.
    expect(root.className).toContain('data-[orientation=horizontal]:flex-col')
    expect(root.className).not.toMatch(/(^|\s|:)data-horizontal:/)
  })

  it('sizes the list against the same attribute', () => {
    const { container } = renderTabs()
    const list = container.querySelector('[data-slot="tabs-list"]')!
    expect(list.getAttribute('data-orientation')).toBe('horizontal')
    expect(list.className).toContain('group-data-[orientation=horizontal]/tabs:h-8')
    expect(list.className).not.toContain('group-data-horizontal/tabs:')
  })

  it('leaves no old-form orientation selector anywhere in the primitive', () => {
    // The trigger carries six of them, for the active-indicator edges. A
    // partial fix is the likely regression here, so the whole rendered tree is
    // swept rather than the two elements above.
    const { container } = renderTabs()
    for (const el of container.querySelectorAll('*')) {
      expect(el.className.toString()).not.toMatch(/data-(horizontal|vertical):/)
    }
  })
})
