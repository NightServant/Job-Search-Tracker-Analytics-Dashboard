import type * as React from 'react'

/**
 * One panel's place in the grid. `span` is what the panel WANTS; `layOut`
 * decides what it gets.
 */
export interface PanelSpec {
  key: string
  span: 'full' | 'half'
  node: React.ReactNode
}

/**
 * Assigns column spans against the panels that rendered.
 *
 * A grid, deliberately: Gabe asked for cards that match their neighbour's
 * height, and a shared row height is exactly what a grid gives and what
 * independent column stacks cannot. The dead space that used to come with
 * that is handled at the other end -- every panel body fills the height it is
 * handed (see `CardContent` below), so a card matching a taller neighbour has
 * content in the difference rather than air.
 *
 * Spans are computed rather than written into the markup. Walk the list
 * tracking which column is next: a full-width panel takes the row and resets
 * to column one; a half-width panel pairs with the next one if there is a
 * half-width panel to pair with, and is promoted to full width if there is
 * not. A lone panel then fills its row instead of sitting beside a hole.
 *
 * Order is the author's -- this only decides widths.
 *
 * PULLED OUT OF `Analytics.tsx` ON 2026-09-11 (537 lines). It is the only
 * genuinely algorithmic thing in that file and it was untestable in place:
 * asserting that a lone half-width panel gets promoted meant rendering the
 * whole analytics page with mocked queries, so nobody had.
 */
export function layOut(specs: PanelSpec[]): Array<PanelSpec & { full: boolean }> {
  const out: Array<PanelSpec & { full: boolean }> = []
  let atRowStart = true
  for (let i = 0; i < specs.length; i += 1) {
    const spec = specs[i]
    if (spec.span === 'full') {
      out.push({ ...spec, full: true })
      atRowStart = true
      continue
    }
    if (!atRowStart) {
      out.push({ ...spec, full: false })
      atRowStart = true
      continue
    }
    const partner = specs[i + 1]
    const paired = partner !== undefined && partner.span === 'half'
    out.push({ ...spec, full: !paired })
    atRowStart = !paired
  }
  return out
}
