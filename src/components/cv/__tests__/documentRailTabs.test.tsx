import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DocumentRailTabs } from '../DocumentRail'
import { RailLayoutProvider } from '../railLayout'

/**
 * The strip draws two ways and the chrome picks (Gabe, 2026-09-13: horizontal
 * "must be applied to smaller laptop screens", then "restore the vertical tabs
 * in larger screens").
 *
 * WHAT IS WORTH ASSERTING is the part a reader cannot see from the classes:
 * which arrangement each context produces, and that the hint -- the reason a
 * pane is empty -- survives both, since it moves from per-row to a single line
 * when the rows lose the height for one.
 */
function renderTabs(layout?: 'row' | 'column') {
  const tabs = (
    <DocumentRailTabs active="tailor" onSelect={() => {}} applicationSelected={false} />
  )
  return render(layout ? <RailLayoutProvider layout={layout}>{tabs}</RailLayoutProvider> : tabs)
}

describe('the document rail tabs', () => {
  it('is a vertical list with no provider, which is what a rail with room gets', () => {
    renderTabs()
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical')
  })

  it('is a vertical list in its own column', () => {
    renderTabs('column')
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical')
    // Every row carries its own hint, which is what costs the height.
    expect(screen.getByText('agreement, tense, phrasing and style')).toBeInTheDocument()
    expect(screen.getByText('needs an application')).toBeInTheDocument()
  })

  it('is one row when it shares a column with the pane it opens', () => {
    renderTabs('row')
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'horizontal')
    // The hint collapses to one line for the SELECTED tab -- so the inactive
    // tab's hint is gone and the active tab's survives.
    expect(screen.queryByText('agreement, tense, phrasing and style')).toBeNull()
    expect(screen.getByText('needs an application')).toBeInTheDocument()
  })

  it('marks the same tab selected either way', () => {
    const column = renderTabs('column')
    expect(screen.getByRole('tab', { name: /tailor to a job/ })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    column.unmount()
    renderTabs('row')
    expect(screen.getByRole('tab', { name: /tailor to a job/ })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })
})
