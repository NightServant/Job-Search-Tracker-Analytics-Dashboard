import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/apiAuth'
import { readIntegrationConfig, capabilitiesOf } from '@/services/integrations/config'
import { compileLatex } from '@/services/integrations/formatex'

/**
 * The server side of LaTeX compilation.
 *
 * IT EXISTS SO THE KEY DOES NOT REACH THE BROWSER, the same reason
 * /api/tailor does. `FORMATEX_API_KEY` is deliberately not `NEXT_PUBLIC_`.
 *
 * It returns the PDF BYTES rather than a URL. FormaTeX hands back a PDF body,
 * and proxying it keeps the compile behind this app's own auth and quota
 * rather than handing the client anything it could call directly.
 *
 * `runtime = 'nodejs'`: a CV compiles in a second or two, but a document with
 * a heavy preamble can take longer than an edge function's budget.
 */
export const runtime = 'nodejs'

/** A CV is a few KB of TeX. Anything past this is not a CV. */
const MAX_CHARS = 200_000

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
  if (!capabilitiesOf(config).compileLatex) {
    // 501, not 500: nothing is broken, the capability was never configured.
    // The editor shows its readable fallback and says which variable is missing.
    return NextResponse.json(
      {
        ok: false,
        reason: 'unconfigured',
        message: 'LaTeX compilation is not configured. Set FORMATEX_API_KEY to enable it.',
      },
      { status: 501 }
    )
  }

  let latex: string
  try {
    const body = (await request.json()) as { latex?: unknown }
    latex = String(body.latex ?? '')
  } catch {
    return NextResponse.json({ ok: false, reason: 'compile', message: 'Invalid JSON.' }, { status: 400 })
  }

  if (!latex.trim()) {
    return NextResponse.json(
      { ok: false, reason: 'compile', message: 'There is nothing to compile.' },
      { status: 400 }
    )
  }
  if (latex.length > MAX_CHARS) {
    return NextResponse.json(
      { ok: false, reason: 'compile', message: 'That document is too large to compile.' },
      { status: 413 }
    )
  }

  const result = await compileLatex({ latex }, { config })
  if (!result.ok) {
    const status =
      result.reason === 'auth' ? 502 : result.reason === 'network' ? 504 : 422
    // The TeX log travels in `message`. It is the only useful thing to show
    // somebody whose document did not build, so it is passed through intact.
    return NextResponse.json(result, { status })
  }

  return new NextResponse(await result.pdf.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      // Rendered in an iframe, never downloaded, so it is inline.
      'Content-Disposition': 'inline; filename="cv.pdf"',
      // A compile is deterministic for a given source, but the source changes
      // constantly and a stale preview is worse than a slow one.
      'Cache-Control': 'no-store',
    },
  })
}
