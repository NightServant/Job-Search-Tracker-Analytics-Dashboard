import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/apiAuth'
import { rejectReason, normalizeTargetUrl } from '@/lib/jobUrl'

/**
 * The public door to LinkedIn profile extraction.
 *
 * IT IS `/api/autofill` FOR A PERSON INSTEAD OF A POSTING, and it is
 * deliberately the same shape: the extractor service has no top-level rewrite,
 * so it is unroutable from the internet, and this route reaches it over a
 * binding that injects `EXTRACTOR_URL`. A service that fetches an arbitrary URL
 * on request IS an open proxy running on our egress IP with our Firecrawl
 * budget; the only thing that stops it being one is that nobody else can call
 * it.
 *
 * So everything that decides WHETHER a fetch happens lives here:
 *
 *   1. Who is asking      -- `authenticate`, before the body is even read.
 *   2. How often          -- a per-caller throttle, tighter than auto-fill's
 *                            because every one of these costs a Firecrawl
 *                            credit and nobody imports their own profile
 *                            eight times a minute.
 *   3. Where they may point it -- the SSRF gate in lib/jobUrl.
 *
 * The extractor re-checks the URL a redirect lands on, because only the thing
 * performing the fetch can see that.
 *
 * `runtime = 'nodejs'`: this waits on a hosted browser rendering a third-party
 * page, which is a poor fit for an edge budget.
 */
export const runtime = 'nodejs'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 3

/**
 * An affordance, not a boundary -- per-instance memory, and Fluid Compute
 * reuses instances rather than guaranteeing one. What it genuinely stops is a
 * stuck retry loop and a rage-clicked button, which is the whole job.
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
    return NextResponse.json(
      { error: 'Profile import is not configured for this deployment.' },
      { status: 503 }
    )
  }

  try {
    const response = await fetch(new URL('profile', extractor), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: normalizeTargetUrl(String(body.url)) }),
    })
    const payload = await response.json()
    return NextResponse.json(payload, { status: response.status })
  } catch {
    // Unreachable, not unreadable. See /api/autofill for why the distinction
    // is worth the two branches.
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'development'
            ? 'The extractor is not running. Start it with `npm run dev:scraper`.'
            : 'The profile reader is unavailable right now. Try again shortly.',
      },
      { status: 502 }
    )
  }
}
