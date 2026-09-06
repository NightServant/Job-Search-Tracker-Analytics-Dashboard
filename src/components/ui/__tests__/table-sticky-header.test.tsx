import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../table'

/**
 * The sticky header contract.
 *
 * WHAT WENT WRONG. `/applications` had no sticky header at all -- `thead` was
 * `position: static` -- so the column names left the screen as soon as the
 * page scrolled, and the reader was looking at ten unlabelled rows. Worse, the
 * pinned company `<th>` carries `z-20`, the app's Top Bar carries `z-20`, and
 * the table comes later in the document: at the bottom of the page scroll the
 * header row landed inside the Top Bar's band and won the z-fight, painting
 * over the logo. That is the "weird table header" Gabe reported (2026-09-06).
 *
 * Measured at 780x700 before the fix: the page scrolled 398px while the table
 * only had 375px to give before its header slid under the 64px bar.
 *
 * These are class and attribute assertions because jsdom has no layout and no
 * stylesheet -- `position: sticky` here would read as `static` whatever the
 * CSS says. The behaviour itself was verified in the browser; what regresses
 * silently is the wiring, and that is what this pins.
 */
describe('a table with a sticky header', () => {
  const renderTable = (props: { stickyHeader?: boolean } = {}) =>
    render(
      <Table stacked {...props} data-test-table>
        <TableHeader>
          <TableRow>
            <TableHead sticky>company</TableHead>
            <TableHead>status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell label="company" sticky>
              Glasswing AI
            </TableCell>
            <TableCell label="status">applied</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

  it('becomes its own vertical scrollport from sm up, and only when asked', () => {
    // The bounded height and the pinned header are one feature: a header
    // pinned to the top of something that never scrolls is just a header.
    // The height comes from the parent (see the `min-h-0`/`flex-1` pair) and
    // NOT from a viewport fraction -- a fraction would leave a gap below the
    // table on a tall screen and fight the frame on a short one.
    const { container } = renderTable({ stickyHeader: true })
    const box = container.querySelector('[data-slot="table-container"]')!
    expect(box.hasAttribute('data-sticky-header')).toBe(true)
    expect(box.className).toContain('sm:min-h-0')
    expect(box.className).toContain('sm:overflow-y-auto')

    // NOT `flex-1`, and this is the assertion that matters. `flex-1` is
    // `flex: 1 1 0%` -- it forces the item to GROW, so a filtered list of one
    // row stretched to the full height of the locked frame and left a card of
    // empty space beneath it (reported 2026-09-06 on a large desktop). The
    // default `flex: 0 1 auto` plus `min-h-0` sizes to content and shrinks
    // into a scroll only when the frame is shorter than the rows.
    expect(box.className).not.toContain('flex-1')
    // The cap is the FALLBACK, for viewports the shell will not lock, and it
    // is dropped again once the parent is bounded -- otherwise a tall screen
    // would stop the table short of the space it was given.
    expect(box.className).toContain('sm:max-h-[55svh]')
    expect(box.className).toContain('shell-fits:max-h-none')
  })

  it('leaves an unasked table at its natural height', () => {
    // Off by default. A five-row summary panel capped at 55svh would be a
    // scrollport around content that never needed one.
    const { container } = renderTable()
    const box = container.querySelector('[data-slot="table-container"]')!
    expect(box.hasAttribute('data-sticky-header')).toBe(false)
    expect(box.className).not.toContain('min-h-0')
    expect(box.className).not.toContain('overflow-y-auto')
  })

  it('isolates its own stacking context, so pinned cells cannot reach the app chrome', () => {
    // This is the half that fixes the header painting over the logo, and it
    // is unconditional: a table that pins only its first column had the same
    // z-20-versus-z-20 tie with the Top Bar.
    const { container } = renderTable()
    expect(container.querySelector('[data-slot="table-container"]')!.className).toContain('isolate')
  })

  it('still pins the first column horizontally, which is a different axis', () => {
    // Positive companion: the new vertical rule must not have displaced the
    // horizontal one. Two axes, two mechanisms, both live.
    const { container } = renderTable({ stickyHeader: true })
    expect(container.querySelector('[data-slot="table-head"]')!.className).toContain('left-0')
    expect(container.querySelector('[data-slot="table-cell"]')!.className).toContain('left-0')
  })
})
