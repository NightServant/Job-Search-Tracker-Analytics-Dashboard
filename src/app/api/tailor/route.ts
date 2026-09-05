import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/apiAuth'
import { readIntegrationConfig, capabilitiesOf } from '@/services/integrations/config'
import { tailorCv, type TailoringInput } from '@/services/integrations/tailoring'

/**
 * The server side of AI CV tailoring.
 *
 * IT EXISTS SO THE KEY DOES NOT REACH THE BROWSER. `tailorCv` needs a bearer
 * token for whichever OpenAI-compatible provider is configured, and a token
 * shipped to the client is a token anyone can read out of the network tab and
 * spend. `TAILORING_API_KEY` is deliberately NOT prefixed `NEXT_PUBLIC_`, so
 * Next will not inline it into the bundle even by accident -- the rails call
 * this route instead.
 *
 * `runtime = 'nodejs'` rather than edge: the request holds a whole CV and a
 * whole posting and can take tens of seconds against a free tier, which is a
 * poor fit for an edge function's shorter budget.
 */
export const runtime = 'nodejs'

/** A CV and a posting are both long, but neither is megabytes. */
const MAX_CHARS = 24_000

export async function POST(request: Request) {
  // Authenticated before anything is spent. These routes cost money per
  // call, so the check comes first -- before parsing the body, before reading
  // config, before any upstream request.
  const auth = await authenticate(request)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, reason: 'unauthorized', message: auth.message }, {
      status: auth.status,
    })
  }

  const config = readIntegrationConfig()
  if (!capabilitiesOf(config).tailorCv) {
    // 501, not 500: nothing is broken, the capability was never configured,
    // and the UI says "set these variables" rather than "something failed".
    return NextResponse.json(
      {
        ok: false,
        reason: 'unconfigured',
        message:
          'AI tailoring is not configured. Set TAILORING_BASE_URL, TAILORING_API_KEY and TAILORING_MODEL.',
      },
      { status: 501 }
    )
  }

  let body: Partial<TailoringInput>
  try {
    body = (await request.json()) as Partial<TailoringInput>
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-response', message: 'Invalid JSON.' }, { status: 400 })
  }

  const cvText = String(body.cvText ?? '').slice(0, MAX_CHARS)
  const jobDescription = String(body.jobDescription ?? '').slice(0, MAX_CHARS)
  if (!cvText.trim() || !jobDescription.trim()) {
    return NextResponse.json(
      { ok: false, reason: 'bad-response', message: 'Tailoring needs both a CV and a job description.' },
      { status: 400 }
    )
  }

  const result = await tailorCv(
    {
      cvText,
      jobDescription,
      missingKeywords: Array.isArray(body.missingKeywords)
        ? body.missingKeywords.slice(0, 40).map(String)
        : undefined,
      role: body.role ? String(body.role) : undefined,
      company: body.company ? String(body.company) : undefined,
    },
    { config }
  )

  // `tailorCv` never throws, so every outcome is a value with a reason on it.
  // A rate-limited free tier is 429 so the client can say "try again shortly"
  // rather than "something went wrong".
  const status = result.ok ? 200 : result.reason === 'rate-limit' ? 429 : result.reason === 'auth' ? 502 : 400
  return NextResponse.json(result, { status })
}
