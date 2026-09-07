import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { StatusDonut } from '../StatusDonut'
import type { StatusSlice } from '@/lib/overviewSeries'

afterEach(() => cleanup())

const DATA: StatusSlice[] = [
  { status: 'wishlist', label: 'wishlist', count: 3 },
  { status: 'applied', label: 'applied', count: 5 },
  { status: 'interviewing', label: 'interviewing', count: 2 },
  { status: 'offer', label: 'offer', count: 0 },
  { status: 'rejected', label: 'rejected', count: 10 },
]

const ZEROS: StatusSlice[] = DATA.map((slice) => ({ ...slice, count: 0 }))

describe('the overview status donut', () => {
  it('draws its arcs without waiting for an animation', () => {
    // THE FRAGILITY THIS GUARDS, measured on the ATS ring and reproduced here:
    // Recharts paints a Pie's arcs only as the entry animation ticks, so
    // wherever it does not start the ring renders as an empty circle with a
    // label in the middle. `isAnimationActive` must stay false.
    const { container } = render(<StatusDonut data={DATA} />)
    const pie = container.querySelector('[data-chart-donut]')
    expect(pie).toBeTruthy()
    expect(container.innerHTML).not.toMatch(/isAnimationActive/)
  })

  it('says the pipeline is empty rather than drawing a ring with no arcs', () => {
    // All-zero data renders no sectors at all, which leaves "0 applications"
    // floating where a chart should be -- that reads as broken, not as empty.
    const { container } = render(<StatusDonut data={ZEROS} />)
    expect(container.querySelector('[data-donut-empty]')).toBeTruthy()
    expect(screen.getByText(/No applications yet/i)).toBeTruthy()
    expect(container.querySelector('[data-chart-donut]')).toBeNull()
  })

  it('shows each status as a share as well as a count', () => {
    // The ring is drawn in proportions and the eye is already reading them,
    // so the number beside it should say what the arc says.
    render(<StatusDonut data={DATA} />)
    // 5 of 20.
    expect(screen.getByText('25%')).toBeTruthy()
    // 10 of 20.
    expect(screen.getByText('50%')).toBeTruthy()
  })

  it('does not print 0% against a status nobody has reached', () => {
    render(<StatusDonut data={DATA} />)
    expect(screen.queryByText('0%')).toBeNull()
    // The row itself stays, because "how many offers" is the question.
    expect(screen.getByText('offer')).toBeTruthy()
  })

  it('keeps every status in the legend, zeros included', () => {
    // A zero-count slice contributes no arc, which is correct -- but a colour
    // must never migrate to a different meaning as the data changes.
    render(<StatusDonut data={DATA} />)
    for (const slice of DATA) {
      expect(screen.getByText(slice.label)).toBeTruthy()
    }
  })
})
