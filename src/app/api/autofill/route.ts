import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/apiAuth'
import { rejectReason, normalizeTargetUrl } from '@/lib/jobUrl'

/**
 * The public door to job-posting extraction.
 *
 * THE EXTRACTOR ITSELF HAS NO DOOR. It is a Vercel Service with no top-level
 * rewrite, so it is unroutable from the internet; this route reaches it over a
 * binding, which injects `EXTRACTOR_URL` at runtime. That arrangement is the
 * whole security design: a service that fetches an arbitrary URL on request IS
 * an open proxy running on our egress IP with our rate budget, and the only
 * thing that stops it being one is that nobody else can call it.
 *
 * So everything that decides WHETHER a fetch happens lives here:
 *
 *   1. Who is asking      -- `authenticate`, before the body is even read.
 *   2. How often          -- a per-caller throttle.
 *   3. Where they may point it -- the SSRF gate in lib/jobUrl.
 *
 * The extractor re-checks the URL a redirect lands on, because only the thing
 * performing the fetch can see that. Two copies, two different questions.
 *
 * `runtime = 'nodejs'`: this reads an arbitrary third-party page through the
 * service, which can take the better part of the 12s the extractor allows.
 */
export const runtime = 'nodejs'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 8

/**
 * An affordance, not a boundary -- the same words `lib/authRateLimit.ts` uses
 * about itself, and true for the same reason. It is per-instance memory, and
 * Fluid Compute reuses instances rather than guaranteeing one, so a determined
 * caller spread across instances gets more than eight. What it genuinely stops
 * is a stuck retry loop and a rage-clicked button, which is what the Deno
 * function's identical throttle was there for.
 */
const attempts = new Map<string, number[]>()

function throttle(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldest = recent[0]
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000)),
    }
  }
  recent.push(now)
  attempts.set(key, recent)
  return { allowed: true, retryAfterSeconds: 0 }
}

export async function POST(request: Request) {
  // FIRST, and before the body is parsed. A route that reads a body and only
  // then 401s has already paid for the request it is rejecting.
  //
  // `routesAreGuarded.test.ts` asserts that ordering by comparing SOURCE
  // OFFSETS, so it reads comments too -- naming the parse call in prose above
  // this line is enough to fail it. That is the test being blunt rather than
  // wrong, and the fix is to say it differently, not to loosen the guard.
  const auth = await authenticate(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  // Keyed on the signed-in user, not an IP: the throttle exists to stop one
  // person's stuck loop, and an IP is shared by everyone behind a NAT.
  const limit = throttle(auth.user.id)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  let body: { url?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const reason = rejectReason(body?.url)
  if (reason) return NextResponse.json({ error: reason }, { status: 400 })

  const extractor = process.env.EXTRACTOR_URL
  if (!extractor) {
    // 503, not 500: the deployment is missing its binding, which is a
    // configuration fact rather than a failure of this request. Retrying with
    // a different URL will not help and the message says so.
    return NextResponse.json(
      { error: 'Auto-fill is not configured for this deployment.' },
      { status: 503 }
    )
  }

  try {
    const response = await fetch(new URL('extract', extractor), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: normalizeTargetUrl(String(body.url)) }),
    })
    const payload = await response.json()
    return NextResponse.json(payload, { status: response.status })
  } catch {
    return NextResponse.json({ error: 'Could not read that job posting.' }, { status: 502 })
  }
}
