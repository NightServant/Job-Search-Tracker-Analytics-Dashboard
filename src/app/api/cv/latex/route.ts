import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/apiAuth'
import { buildLatex } from '@/services/integrations/latexExport'

/**
 * LaTeX export for the CV editor (Gabe, 2026-09-15: "make sure these word
 * documents are able to be exported as LaTeX files without breaking formats").
 *
 * IT MIRRORS `/api/cv/docx` DELIBERATELY -- same guard, same byte cap, same
 * filename rule, same error shapes. Two export routes that authenticate
 * differently or cap differently is two routes to audit, and the second one is
 * always the one somebody forgets.
 *
 * `buildLatex` IS PURE AND NEEDS NO SERVER AT ALL, which is worth being honest
 * about: unlike `buildDocx` there is no 2MB Node-only dependency to keep off
 * the client, so this could have run in the browser. It is a route anyway, for
 * two reasons. The export path is one path -- the editor's menu calls
 * `authedFetch` for Word and would otherwise call a local function for LaTeX,
 * which is two failure modes and two places to add a size cap. And a CV is
 * user data: running it through the same authenticated door means the same
 * rate limits, the same logging and the same 401 apply to both formats.
 *
 * `runtime = 'nodejs'` for consistency with its sibling rather than necessity.
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
    const source = buildLatex(body.content, title)
    return new NextResponse(source, {
      status: 200,
      headers: {
        // `application/x-tex`, not `text/plain`: it is what editors and file
        // managers use to recognise a .tex, and `text/plain` invites a browser
        // to render it in the tab instead of downloading it.
        'Content-Type': 'application/x-tex; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFileName(title)}.tex"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[cv/latex] build failed', err)
    return NextResponse.json({ error: 'Could not build the LaTeX file.' }, { status: 500 })
  }
}
