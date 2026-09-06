import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from '../card'

/**
 * The narrow-card header rule, added 2026-09-06.
 *
 * WHAT WENT WRONG. `CardHeader` puts the action in a second column and gives
 * the heading `1fr` of what is left. On a ~340px panel -- which is what both
 * chart grids produced between 768 and 1280 -- a heading like "applications
 * over time" wrapped to three lines and pressed against "see the analytics".
 * Gabe reported it as overlapping text on the overview at tablet and
 * small-laptop widths.
 *
 * WHY IT IS A CONTAINER QUERY. The header does not care how wide the SCREEN
 * is; it cares how wide IT is. The same card is full-width in one column and
 * half-width in two at identical viewports, so a viewport query would be wrong
 * in one of those cases. Fixing it here also fixes every card in the app at
 * once, rather than each grid separately -- which is what keeps the treatment
 * consistent, since screens do not opt in.
 *
 * These are class assertions because jsdom has no layout: there is no
 * container to size and no computed style to read. The contract is which
 * classes carry the rule, and that is what regresses.
 */
describe('a card header with an action', () => {
  const renderHeader = () =>
    render(
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>applications over time</h2>
          </CardTitle>
          <CardDescription>how many you sent each month.</CardDescription>
          <CardAction>
            <a href="/analytics">see the analytics</a>
          </CardAction>
        </CardHeader>
      </Card>
    )

  it('puts the action beside the heading only once the card is wide enough', () => {
    const { container } = renderHeader()
    const header = container.querySelector('[data-slot="card-header"]')!
    const action = container.querySelector('[data-slot="card-action"]')!

    // Both the second column and the placement into it are gated on the same
    // container query. Neither may exist unconditionally -- see below.
    expect(header.className).toContain('@sm/card-header:has-data-[slot=card-action]:grid-cols-[1fr_auto]')
    expect(action.className).toContain('@sm/card-header:col-start-2')
    expect(action.className).toContain('@sm/card-header:justify-self-end')
  })

  it('is MOBILE-FIRST, so nothing has to win a cascade race', () => {
    // THE BUG THIS REPLACES. It was first written the other way round: a
    // two-column base rule with an `@max-sm` override to collapse it. The
    // override never won -- both are single-class specificity, so whichever
    // Tailwind emits last takes it, and the plain rule did. But the matching
    // reset on CardAction DID apply, so the action stopped occupying
    // (row 1, col 2), the description auto-placed into the hole, and every
    // card on a phone rendered its heading and description SIDE BY SIDE.
    // Measured 2026-09-06: a 333px header still computing `89.8px 207.2px`.
    //
    // So the invariant is not "there is an override" -- it is that there is
    // exactly ONE grid-template-columns declaration, and it is the one that
    // adds the column rather than removes it.
    const { container } = renderHeader()
    const header = container.querySelector('[data-slot="card-header"]')!
    const action = container.querySelector('[data-slot="card-action"]')!

    expect(header.className).toContain('@container/card-header')
    // No unconditional two-column rule, and no max-width override to fight it.
    expect(header.className).not.toMatch(/(^|\s)has-data-\[slot=card-action\]:grid-cols-/)
    expect(header.className).not.toContain('@max-sm/card-header:')
    expect(action.className).not.toContain('@max-sm/card-header:')
    // Default placement is the stacked one.
    expect(action.className).toContain('justify-self-start')
    expect(action.className).not.toMatch(/(^|\s)col-start-2/)
  })
})
