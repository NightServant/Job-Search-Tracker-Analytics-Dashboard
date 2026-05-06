import { describe, expect, it } from 'vitest'

import {
  buildCompletionEvent,
  getRequestIdentity,
  takeThrottleSlot,
} from '../../supabase/functions/_shared/edgeMonitoring'

describe('edge monitoring helpers', () => {
  it('prefers bearer tokens for caller identity', () => {
    const request = new Request('https://example.com', {
      headers: {
        Authorization: 'Bearer abc123-token-value',
        'x-forwarded-for': '203.0.113.10',
      },
    })

    expect(getRequestIdentity(request)).toBe('auth:abc123-token-value')
  })

  it('falls back to the first forwarded IP', () => {
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '203.0.113.10, 198.51.100.7',
      },
    })

    expect(getRequestIdentity(request)).toBe('ip:203.0.113.10')
  })

  it('throttles after the configured limit is exceeded', () => {
    const key = `unit-test-${Date.now()}`

    expect(takeThrottleSlot(key, { limit: 2, windowMs: 60_000 }, 1_000).allowed).toBe(true)
    expect(takeThrottleSlot(key, { limit: 2, windowMs: 60_000 }, 1_500).allowed).toBe(true)
    const decision = takeThrottleSlot(key, { limit: 2, windowMs: 60_000 }, 2_000)

    expect(decision.allowed).toBe(false)
    expect(decision.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('flags slow requests in completion events', () => {
    const event = buildCompletionEvent({
      functionName: 'job-url-autofill',
      requestId: 'request-1',
      status: 200,
      latencyMs: 3500,
      callerKey: 'ip:203.0.113.10',
    })

    expect(event.event).toBe('slow')
    expect(event.level).toBe('warning')
  })
})