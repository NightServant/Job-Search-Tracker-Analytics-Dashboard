import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/apiAuth'
import { buildDocx } from '@/services/integrations/docxExport'

/**
 * Word export for the CV editor.
 *
 * A Next route rather than a Supabase edge function, unlike the PDF export:
 * `docx` is a Node library and this is pure computation over the request body
 * -- there is no network call, no key, and nothing to keep off the client but
 * the dependency itself, which is 2MB of zip machinery nobody should ship to a
 * browser.
 */
export const runtime = 'nodejs'

/** A CV is a few pages of JSON. */
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
  // Authenticated before anything is spent. These routes cost money per
  // call, so the check comes first -- before parsing the body, before reading
  // config, before any upstream request.
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
    const buffer = await buildDocx(body.content, title)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeFileName(title)}.docx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[cv/docx] build failed', err)
    return NextResponse.json({ error: 'Could not build the Word file.' }, { status: 500 })
  }
}
