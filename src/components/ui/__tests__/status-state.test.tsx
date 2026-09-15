import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { StatusState, RotatingText } from '../status-state'

/**
 * The ten states, and the three things about them that are not decoration.
 *
 * WHAT IS DELIBERATELY NOT TESTED: that each preset's sentence reads well.
 * Copy is meant to be rewritten, and a test asserting a sentence makes editing
 * one a red build -- which is how a codebase ends up with wording nobody will
 * touch. What is pinned here is the STRUCTURE the copy sits in, because that
 * is the part a later edit can break without noticing.
 */
describe('the status states', () => {
  it('interrupts for a failure and waits its turn for everything else', () => {
    /*
      THE ARIA ROLE IS THE TEST WITH THE MOST BEHIND IT. `alert` is assertive:
      it cuts across whatever a screen reader is currently reading. That is
      right for a request that failed and for an answer of no, and wrong for
      the other seven -- interrupting somebody mid-sentence to say a list is
      empty is the behaviour that makes people turn verbosity down, and a
      reader who has done that then misses the announcements that mattered.
    */
    const { container, rerender } = render(<StatusState kind="error" />)
    expect(container.querySelector('[role="alert"]')).toBeTruthy()

    rerender(<StatusState kind="denied" />)
    expect(container.querySelector('[role="alert"]')).toBeTruthy()

    for (const kind of ['loading', 'offline', 'slow', 'no-results', 'expired', 'success'] as const) {
      rerender(<StatusState kind={kind} />)
      expect(container.querySelector('[role="status"]'), kind).toBeTruthy()
      expect(container.querySelector('[role="alert"]'), kind).toBeNull()
    }
  })

  it('does not paint a recoverable state in the failure colour', () => {
    /*
      Offline, slow, expired and invalid are all things the READER can get out
      of: wait, reconnect, sign in again, fix a field. Red says "this failed"
      and sends somebody looking for what they broke. The accent says "look
      here" without the accusation, and it is also the only chroma this design
      system has to spend -- a fourth hue for warnings would be a new colour
      language saying what the existing one already says.
    */
    const { container, rerender } = render(<StatusState kind="offline" />)
    for (const kind of ['offline', 'slow', 'expired', 'invalid'] as const) {
      rerender(<StatusState kind={kind} />)
      expect(container.querySelector(`[data-status-state="${kind}"]`)!.getAttribute('data-tone'))
        .toBe('warn')
    }
    rerender(<StatusState kind="error" />)
    expect(container.querySelector('[data-status-state="error"]')!.getAttribute('data-tone'))
      .toBe('error')
  })

  it('lets a surface that already has a heading suppress the second one', () => {
    // `null` is not the same as omitting the prop, and the difference is the
    // whole reason the check is `!== null` rather than `??`. SessionExpiredDialog
    // printed "your session expired" as its own title and again two lines
    // below it until this existed.
    const withHeading = render(<StatusState kind="expired" />)
    expect(withHeading.getByText('your session expired')).toBeInTheDocument()
    withHeading.unmount()

    render(<StatusState kind="expired" title={null} message="only this" />)
    expect(screen.queryByText('your session expired')).toBeNull()
    expect(screen.getByText('only this')).toBeInTheDocument()
  })

  it('is a paragraph in a panel and a real heading when it is the page', () => {
    // A state under a section title must not insert a phantom subsection into
    // the document outline; a state that IS the page must give a screen reader
    // something to navigate by. One prop, because the type scale follows the
    // element rather than being a second decision that can disagree with it.
    const { container, rerender } = render(<StatusState kind="success" title="done here" />)
    expect(container.querySelector('h1')).toBeNull()

    rerender(<StatusState kind="success" title="done here" titleAs="h1" />)
    expect(container.querySelector('h1')!.textContent).toBe('done here')
  })

  it('forwards a caller data hook to the DOM', () => {
    // Several screens identify their states by attribute rather than by copy,
    // precisely so rewording a message is not a red test. TypeScript accepts a
    // hyphenated attribute on a component and then the component silently
    // drops it unless the rest props are spread, which type-checks while the
    // selector finds nothing.
    const { container } = render(
      <StatusState kind="no-results" data-documents-filter-empty />
    )
    expect(container.querySelector('[data-documents-filter-empty]')).toBeTruthy()
  })
})

describe('the rotating label', () => {
  afterEach(() => vi.useRealTimers())

  it('advances through the phrases in order and then stops', () => {
    /*
      IT STOPS RATHER THAN LOOPING, and that is the assertion worth having. A
      cycle that returns to "opening the posting" after "filling the
      application" tells the reader the work restarted -- on a step that waits
      on somebody else's web page and a model, that is alarming and untrue.
      Holding on the last phrase is the honest resting place for a wait that
      has gone on longer than expected.
    */
    vi.useFakeTimers()
    render(<RotatingText phrases={['first', 'second', 'third']} intervalMs={100} />)
    expect(screen.getByText('first')).toBeInTheDocument()

    act(() => void vi.advanceTimersByTime(100))
    expect(screen.getByText('second')).toBeInTheDocument()

    act(() => void vi.advanceTimersByTime(100))
    expect(screen.getByText('third')).toBeInTheDocument()

    // Four more intervals, and it is still the last phrase.
    act(() => void vi.advanceTimersByTime(400))
    expect(screen.getByText('third')).toBeInTheDocument()
  })

  it('starts no timer for a single phrase', () => {
    // A `setInterval` that fires forever to set state to the value it already
    // has is a render loop nobody can see.
    vi.useFakeTimers()
    render(<RotatingText phrases={['only one']} intervalMs={100} />)
    expect(vi.getTimerCount()).toBe(0)
  })
})
