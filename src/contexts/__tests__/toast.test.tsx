import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { ToastProvider, useToast } from '../ToastContext'

/**
 * Item 6: the hand-rolled toast is gone. These assert the two things about it
 * that were actually wrong, rather than that "a toast appears".
 */
function Raiser({ kind }: { kind: 'success' | 'error' | 'info' }) {
  const toast = useToast()
  return (
    <button type="button" onClick={() => toast[kind]('the title', 'the message')}>
      raise
    </button>
  )
}

afterEach(cleanup)

async function raise(kind: 'success' | 'error' | 'info') {
  render(
    <ToastProvider>
      <Raiser kind={kind} />
    </ToastProvider>
  )
  await act(async () => {
    screen.getByRole('button', { name: 'raise' }).click()
  })
}

describe('toasts', () => {
  it('announces an error assertively, not politely', async () => {
    // The old implementation put role="status" on EVERY toast including
    // errors. `status` is a polite live region: a screen reader queues it
    // until the user is idle, so a failed save could be announced long after
    // they had moved on. Errors must interrupt.
    await raise('error')
    const live = document.querySelector('[data-toast-alerts]')!
    expect(live.getAttribute('aria-live')).toBe('assertive')
    expect(live.textContent).toContain('the title')
  })

  it('does not announce a success assertively', async () => {
    // The companion assertion. Without it, "everything is role=alert" would
    // satisfy the test above -- which is its own accessibility problem, since
    // a success that interrupts is as wrong as an error that does not.
    await raise('success')
    expect(document.querySelector('[data-toast-alerts]')!.textContent).toBe('')
  })

  it('carries the title and the message', async () => {
    await raise('info')
    // getAllByText: sonner renders a visible toast and a screen-reader copy.
    expect(screen.getAllByText('the title').length).toBeGreaterThan(0)
    expect(screen.getAllByText('the message').length).toBeGreaterThan(0)
  })
})
