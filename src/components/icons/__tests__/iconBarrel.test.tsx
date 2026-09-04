import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'

/**
 * WHAT THE BARREL HANDS EVERY GLYPH.
 *
 * In its own file because `vi.mock` is hoisted to the whole module, and the
 * only way to know what `withDefaultSize` actually passes is to stand in for
 * the component it passes to. An earlier version of this test rendered the
 * real glyph, fired mouseEnter and asserted its inline style had not changed
 * -- it passed just as happily with the animation switched back ON, because
 * motion writes nothing synchronously in jsdom. It was checking nothing.
 */
const received = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }))

vi.mock('../layout-dashboard', () => ({
  LayoutDashboardIcon: (props: Record<string, unknown>) => {
    received.props = props
    return <svg data-testid="glyph" />
  },
}))

import { OverviewIcon } from '../index'

afterEach(() => {
  received.props = null
  cleanup()
})

describe('the icon barrel', () => {
  it('turns the registry\'s own hover animation off', () => {
    // The registry's defaults are 0.6-1.2s springy overshoots bound to the
    // glyph's own 20px box -- wrong length, wrong character, and unreachable
    // from the control around it. They are off so this app has exactly ONE
    // motion vocabulary (./motion.ts) rather than two that disagree.
    render(<OverviewIcon />)
    expect(received.props?.isAnimated).toBe(false)
  })

  it('forces the design system\'s 20px default over the registry\'s 24', () => {
    render(<OverviewIcon />)
    expect(received.props?.size).toBe(20)
  })

  it('lets a caller override both, because a default is not a removal', () => {
    // `...props` is spread AFTER the defaults. The imperative
    // startAnimation() handle each glyph exposes is untouched either way, so
    // nothing has been taken away -- only stopped from firing by itself.
    render(<OverviewIcon size={32} isAnimated />)
    expect(received.props?.size).toBe(32)
    expect(received.props?.isAnimated).toBe(true)
  })
})
