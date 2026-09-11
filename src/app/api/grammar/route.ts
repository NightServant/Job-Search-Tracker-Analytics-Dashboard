import { NextResponse } from 'next/server'
import { authenticate } from '@/lib/apiAuth'
import { readIntegrationConfig, capabilitiesOf } from '@/services/integrations/config'
import { checkGrammar } from '@/services/integrations/grammarCheck'

/**
 * The server side of the editor's Grammar Check and Spell Check tabs.
 *
 * THE VENDOR LEAVES NO CHOICE ABOUT THIS ROUTE EXISTING. GrammarBot's own
 * quickstart says browser requests are refused -- "Browser-based AJAX requests
 * will not work due to CORS restrictions. To use in a browser, create a
 * server-side script that acts as a proxy" -- and the API key travels in the
 * request body, so a direct call would also publish the key to anyone with
 * devtools open. This is that proxy.
 *
 * ONE ROUTE SERVES BOTH TABS. The upstream returns grammar and spelling
 * together, tagged with `err_cat`; splitting them here rather than asking
 * twice means the two panes cost one request over the document instead of two
 * identical ones.
 *
 * `runtime = 'nodejs'` for the same reason as /api/tailor, and one more: a
 * long CV is split into several upstream calls issued in parallel, which suits
 * a Node function's budget rather than an edge one's.
 */
export const runtime = 'nodejs'

/**
 * A CV, not a book. The upstream caps a single request at 5,000 characters and
 * `chunkText` splits to fit; this outer cap bounds how many chunks one request
 * can turn into, so a pasted novel cannot fan out into hundreds of calls on
 * someone else's key.
 */
const MAX_CHARS = 24_000

export async function POST(request: Request) {
  // Authenticated before anything is spent, exactly as /api/tailor does: these
  // calls cost money per request, so the check precedes parsing and config.
  const auth = await authenticate(request)
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, reason: 'unauthorized', message: auth.message },
      { status: auth.status }
    )
  }

  const config = readIntegrationConfig()
  if (!capabilitiesOf(config).checkGrammar) {
    // 501, not 500: nothing is broken, the capability was never configured.
    return NextResponse.json(
      {
        ok: false,
        reason: 'unconfigured',
        message: 'Grammar checking is not configured. Set GRAMMARBOT_API_KEY.',
      },
      { status: 501 }
    )
  }

  let body: { text?: unknown }
  try {
    body = (await request.json()) as { text?: unknown }
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'bad-response', message: 'Invalid JSON.' },
      { status: 400 }
    )
  }

  const text = String(body.text ?? '').slice(0, MAX_CHARS)
  if (!text.trim()) {
    // An empty document is a successful check with nothing to report, not a
    // client error -- the pane opens on a blank CV and should say "no
    // problems", not "bad request".
    return NextResponse.json({ ok: true, issues: [], spelling: [], grammar: [] })
  }

  const result = await checkGrammar(text, { config })

  const status = result.ok
    ? 200
    : result.reason === 'rate-limit'
      ? 429
      : result.reason === 'auth'
        ? 502
        : 400
  return NextResponse.json(result, { status })
}
