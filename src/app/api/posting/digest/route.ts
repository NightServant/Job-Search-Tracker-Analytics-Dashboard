import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/apiAuth'
import { digestPosting } from '@/services/integrations/postingDigest'

/**
 * Tidies a job posting and mines it for the fields the form needs.
 *
 * IT EXISTS SO THE PROVIDER KEY DOES NOT REACH THE BROWSER, the same reason
 * /api/tailor does. `TAILORING_API_KEY` is metered and is deliberately not
 * prefixed `NEXT_PUBLIC_`.
 *
 * IT ALWAYS ANSWERS. With no provider configured `digestPosting` skips the
 * request entirely and returns the deterministic formatting plus an
 * extractive summary, so this route has no "unconfigured" branch -- the
 * feature degrades rather than disappearing.
 *
 * `runtime = 'nodejs'`: a posting plus a model round trip is a poor fit for an
 * edge function's budget, and it matches every other route here.
 */
export const runtime = 'nodejs'

/** A posting is long, but not a megabyte of it. */
const MAX_CHARS = 40_000

export async function POST(request: Request) {
  // Authenticated before anything is spent -- this route can cost a metered
  // model call, so the gate comes before the body is read.
  const auth = await authenticate(request)
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, reason: 'unauthorized', message: auth.message },
      { status: auth.status }
    )
  }

  let body: { text?: unknown }
  try {
    body = (await request.json()) as { text?: unknown }
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON.' }, { status: 400 })
  }

  const text = typeof body.text === 'string' ? body.text.slice(0, MAX_CHARS) : ''
  if (!text.trim()) {
    return NextResponse.json(
      { ok: false, message: 'Paste a job description first.' },
      { status: 400 }
    )
  }

  const digest = await digestPosting(text)
  return NextResponse.json({ ok: true, ...digest }, { status: 200 })
}
