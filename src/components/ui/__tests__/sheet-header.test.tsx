import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../sheet'

/**
 * The header must not lay out over the close button's corner.
 *
 * The close control is `absolute top-3 right-3` at 28px, and the header had a
 * uniform `p-4` -- so it laid out as if that corner were free. Reported
 * 2026-09-06 on the CV editor's action sheet, where the title is a filename:
 * "Elijah Gabe Cervantes y Celestino - CV (ATS)" ran under the X at every
 * width and wrapped INTO it below 375px.
 *
 * A class assertion, because jsdom has no layout and cannot measure the
 * collision. The geometry was verified in the browser -- 16px of clearance at
 * 320, 390, 780 and 834 -- and what regresses silently is this reservation
 * being dropped by someone passing their own padding.
 */
describe('a sheet header', () => {
  it('reserves the close button corner', () => {
    const { baseElement } = render(
      <Sheet open>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Elijah Gabe Cervantes y Celestino - CV (ATS)</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    )
    const header = baseElement.querySelector('[data-slot="sheet-header"]')!
    // 56px = the button's 12px offset + its 28px + a 16px gap.
    expect(header.className).toContain('pr-14')
    // Positive companion: the close button this is reserving space for really
    // is rendered, so the padding is not guarding nothing.
    expect(baseElement.querySelector('[data-slot="sheet-close"]')).not.toBeNull()
  })
})
