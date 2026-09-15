import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/apiAuth'
import { buildPdf } from '@/services/integrations/pdfExport'

/**
 * PDF export for the CV editor.
 *
 * MOVED HERE FROM A SUPABASE EDGE FUNCTION (2026-09-15), which is where the
 * "Export failed / Failed to fetch" came from: the function launched headless
 * Chromium against a runtime capped at 256MB of memory and 20MB of bundle, so
 * it was never deployable and never deployed. The browser called a function
 * that did not exist, and the platform's 404 fails CORS preflight -- which
 * surfaces as a TypeError with no status to report. See `pdfExport` for the
 * measurements.
 *
 * `runtime = 'nodejs'`, and `maxDuration` because this one is genuinely slow:
 * a cold start pays for extracting and booting Chromium before it renders
 * anything. The other two exports are pure computation and need neither.
 */
export const runtime = 'nodejs'
export const maxDuration = 120

/** A CV is a few pages of JSON. Matches `/api/cv/docx`. */
const MAX_BYTES = 2_000_000

/** Safe for a Content-Disposition header and for every filesystem. */
function safeFileName(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return base || 'cv'
}

export async function POST(request: Request) {
  // Authenticated before anything is spent. Booting a browser is the most
  // expensive thing this app does per request, so the check comes first.
  const auth = await authenticate(request)
  if (!auth.ok) {
    return NextResponse.json({ ok: false, reason: 'unauthorized', message: auth.message }, {
      status: auth.status,
    })
  }

  let body: { title?: unknown; content?: unknown }
  try {
    const raw = await request.text()
    if (raw.length > MAX_BYTES) {
      return NextResponse.json({ error: 'That document is too large.' }, { status: 413 })
    }
    body = JSON.parse(raw) as { title?: unknown; content?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title : 'CV'
  if (!body.content || typeof body.content !== 'object') {
    return NextResponse.json({ error: 'There is nothing to export.' }, { status: 400 })
  }

  try {
    const pdf = await buildPdf(body.content, title)
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFileName(title)}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    // NAMED, because the two failures here need different answers: a missing
    // browser is a deployment problem and a bad document is the user's.
    console.error('[cv/pdf] build failed', err)
    return NextResponse.json({ error: 'Could not build the PDF.' }, { status: 500 })
  }
}
