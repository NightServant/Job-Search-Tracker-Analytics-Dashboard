import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PanelSection } from '../panel-section'

afterEach(() => cleanup())

describe('PanelSection', () => {
  it('uses the shared hairline rhythm -- pt-6 and gap-3 -- rather than a caller-chosen value', () => {
    const { container } = render(
      <PanelSection title="Activity">
        <p>content</p>
      </PanelSection>
    )
    const section = container.firstElementChild as HTMLElement
    expect(section.className).toContain('border-t')
    expect(section.className).toContain('pt-6')
    expect(section.className).toContain('gap-3')
    expect(section.className).not.toMatch(/(^|\s)border(\s|$)/)
  })

  it('renders children when there is no error', () => {
    render(
      <PanelSection title="Activity">
        <p>Real content</p>
      </PanelSection>
    )
    expect(screen.getByText('Real content')).toBeTruthy()
  })

  it('replaces children with the error message when given one', () => {
    render(
      <PanelSection title="Activity" error="Could not load activity. Try refreshing the page.">
        <p>Real content</p>
      </PanelSection>
    )
    expect(screen.queryByText('Real content')).toBeNull()
    expect(screen.getByText(/could not load activity/i)).toBeTruthy()
  })

  it('does not nest the AnimateIcons <div> wrapper inside a <p>, which is invalid HTML', () => {
    // AlertCircleIcon's root is a <div> (AnimateIcons, not the old hand-drawn
    // <svg>-only set). A <p> containing it is invalid HTML and a React
    // hydration error -- caught here rather than only in a console warning.
    render(
      <PanelSection title="Activity" error="Could not load activity.">
        <p>Real content</p>
      </PanelSection>
    )
    const errorContainer = screen.getByText(/could not load activity/i).closest('p, div')!
    expect(errorContainer.tagName).not.toBe('P')
    expect(errorContainer.querySelector('div')).toBeTruthy()
  })

  it('renders an action next to the title', () => {
    render(
      <PanelSection title="Job description" actions={<a href="/x">View posting</a>}>
        <p>Body</p>
      </PanelSection>
    )
    expect(screen.getByRole('link', { name: 'View posting' })).toBeTruthy()
  })

  it('defaults to the smaller heading size and switches to the larger one on request', () => {
    const { container: small } = render(
      <PanelSection title="Activity">
        <p>Body</p>
      </PanelSection>
    )
    expect(small.querySelector('h2')!.className).toContain('text-heading-s')

    const { container: large } = render(
      <PanelSection title="Recent applications" titleSize="m">
        <p>Body</p>
      </PanelSection>
    )
    expect(large.querySelector('h2')!.className).toContain('text-heading-m')
  })
})
