import * as React from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DesktopDocumentChrome } from '../DesktopDocumentChrome'

/**
 * The collapsible rails (Gabe, 2026-09-13: "make left and right rail
 * collapsible and maintain the layout of large screens to the small laptop
 * screens").
 *
 * WHAT IS WORTH ASSERTING HERE is not that a class changed -- it is the two
 * things a person loses if this is done the obvious way: the page paying for a
 * track that holds a rail nobody can see, and a half-reviewed rewrite thrown
 * away because a layout toggle unmounted the pane holding it.
 */

/**
 * jsdom has no layout, so `getBoundingClientRect` reports 0 for everything and
 * the component keeps its open-by-default state. These tests that care about
 * the MEASURED default stub a width onto the prototype; the rest leave it
 * alone and get the default, which is what a wide screen sees.
 */
const realRect = HTMLElement.prototype.getBoundingClientRect
function stubWorkspaceWidth(width: number) {
  HTMLElement.prototype.getBoundingClientRect = function () {
    return { ...realRect.call(this), width } as DOMRect
  }
}
afterEach(() => {
  HTMLElement.prototype.getBoundingClientRect = realRect
})

/** A rail that remembers something, so "hidden, not unmounted" can be proved. */
function StatefulRail({ label }: { label: string }) {
  const [count, setCount] = React.useState(0)
  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      {label} {count}
    </button>
  )
}

function renderChrome(props: Partial<React.ComponentProps<typeof DesktopDocumentChrome>> = {}) {
  return render(
    <DesktopDocumentChrome
      kindLabel="word"
      documentsHref="/documents"
      title="My CV"
      onTitleChange={() => {}}
      savedLabel="saved 7:43 am"
      actions={<button type="button">save</button>}
      tools={<button type="button">bold</button>}
      leftRail={<StatefulRail label="outline" />}
      rightRail={<StatefulRail label="analysis" />}
      {...props}
    >
      <p>the document</p>
    </DesktopDocumentChrome>
  )
}

/** The grid is the sheet's parent; no test-only attribute needed to find it. */
const railGrid = () => document.getElementById('document-sheet')!.parentElement!

describe('the desktop rails', () => {
  it('starts both rails open where nothing could be measured', () => {
    // Desktop-first, like useBelowDesktop: an unmeasured workspace keeps the
    // wide arrangement rather than inventing a narrow one.
    renderChrome()
    expect(screen.getByRole('button', { name: 'Hide document tools' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(railGrid().className).toContain('lg:grid-cols-[320px_minmax(0,1fr)_400px]')
  })

  it('starts both rails closed on a small laptop, and open from 1280', () => {
    stubWorkspaceWidth(1024)
    const narrow = renderChrome()
    expect(screen.getByRole('button', { name: 'Show document tools' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    expect(screen.getByRole('button', { name: 'Show tailoring rail' })).toBeInTheDocument()
    // No rail track at all: 320 + 400 of a 1024px window would leave the page
    // 304px, which is the layout this replaced.
    expect(railGrid().className).toContain('lg:grid-cols-[minmax(0,1fr)]')
    narrow.unmount()

    stubWorkspaceWidth(1280)
    renderChrome()
    expect(screen.getByRole('button', { name: 'Hide document tools' })).toBeInTheDocument()
    expect(railGrid().className).toContain('lg:grid-cols-[320px_minmax(0,1fr)_400px]')
  })

  it('drops only the closed rail\'s track, either side', async () => {
    const user = userEvent.setup()
    renderChrome()
    await user.click(screen.getByRole('button', { name: 'Hide document tools' }))
    expect(railGrid().className).toContain('lg:grid-cols-[minmax(0,1fr)_400px]')

    await user.click(screen.getByRole('button', { name: 'Hide tailoring rail' }))
    expect(railGrid().className).toContain('lg:grid-cols-[minmax(0,1fr)]')

    await user.click(screen.getByRole('button', { name: 'Show document tools' }))
    expect(railGrid().className).toContain('lg:grid-cols-[320px_minmax(0,1fr)]')
  })

  it('hides a closed rail instead of unmounting it, keeping its state', async () => {
    // The reason the rule exists: the tailoring pane holds per-section edit
    // state and an in-flight request. A layout toggle must not spend them.
    const user = userEvent.setup()
    renderChrome()
    await user.click(screen.getByRole('button', { name: /analysis 0/ }))
    await user.click(screen.getByRole('button', { name: 'Hide tailoring rail' }))

    const rail = document.getElementById('document-right-rail')!
    // `hidden` is `display:none`, which is what takes the subtree out of the
    // accessibility tree as well as off the screen -- asserted as the class
    // rather than by querying roles, because jsdom loads no stylesheet and so
    // computes no display for a Tailwind utility. The state below is the half
    // this test exists for anyway.
    expect(rail.className).toContain('hidden')
    // Still mounted, still counting.
    expect(rail.textContent).toContain('analysis 1')

    await user.click(screen.getByRole('button', { name: 'Show tailoring rail' }))
    expect(screen.getByRole('button', { name: 'analysis 1' })).toBeInTheDocument()
  })

  it('gives the left-rail-only editor one toggle and a two-column frame', () => {
    // The LaTeX editor passes no right rail: source beside preview lives
    // inside the content column instead.
    renderChrome({ rightRail: undefined })
    expect(screen.getByRole('button', { name: 'Hide document tools' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /tailoring rail/ })).toBeNull()
    expect(railGrid().className).toContain('lg:grid-cols-[320px_minmax(0,1fr)]')
  })

  it('points each toggle at the rail it opens', () => {
    renderChrome()
    expect(
      screen.getByRole('button', { name: 'Hide document tools' })
    ).toHaveAttribute('aria-controls', 'document-left-rail')
    expect(
      screen.getByRole('button', { name: 'Hide tailoring rail' })
    ).toHaveAttribute('aria-controls', 'document-right-rail')
    expect(document.getElementById('document-left-rail')).not.toBeNull()
    expect(document.getElementById('document-right-rail')).not.toBeNull()
  })

  it('lets a resize correct an unmeasured first paint, once', () => {
    // A hidden pane or a background tab lays nothing out, so the direct
    // measurement reads 0 and an observer has to carry the answer later. Zero
    // must not itself be read as "narrow".
    let deliver: (() => void) | undefined
    const observe = vi.fn()
    const disconnect = vi.fn()
    class Observer {
      constructor(cb: () => void) {
        deliver = cb
      }
      observe = observe
      unobserve = vi.fn()
      disconnect = disconnect
    }
    const real = globalThis.ResizeObserver
    globalThis.ResizeObserver = Observer as unknown as typeof ResizeObserver
    try {
      renderChrome()
      // 0 was not taken as narrow.
      expect(screen.getByRole('button', { name: 'Hide document tools' })).toBeInTheDocument()
      expect(observe).toHaveBeenCalled()

      stubWorkspaceWidth(1100)
      React.act(() => deliver!())
      expect(screen.getByRole('button', { name: 'Show document tools' })).toBeInTheDocument()

      // Settled: a later, wider callback does not reopen what was decided.
      stubWorkspaceWidth(1600)
      React.act(() => deliver!())
      expect(screen.getByRole('button', { name: 'Show document tools' })).toBeInTheDocument()
    } finally {
      globalThis.ResizeObserver = real
    }
  })
})
