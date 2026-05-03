import { extractAutofill } from './parser.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const REQUEST_TIMEOUT_MS = 12000
const MAX_HTML_BYTES = 2_000_000

interface AutofillRequest {
  url: string
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let body: AutofillRequest
  try {
    body = (await req.json()) as AutofillRequest
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const rawUrl = (body.url || '').trim()
  if (!rawUrl) {
    return jsonResponse({ error: 'URL is required' }, 400)
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(rawUrl)
  } catch {
    return jsonResponse({ error: 'Invalid URL format' }, 400)
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return jsonResponse({ error: 'URL must start with http:// or https://' }, 400)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(targetUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobTrackerAutofill/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof DOMException && err.name === 'AbortError') {
      return jsonResponse({ error: 'Timed out while fetching job page' }, 504)
    }
    return jsonResponse({ error: 'Could not fetch this URL' }, 422)
  }

  clearTimeout(timer)

  if (!response.ok) {
    return jsonResponse({ error: `Could not fetch page (status ${response.status})` }, 422)
  }

  const html = await response.text()
  if (!html || html.length > MAX_HTML_BYTES) {
    return jsonResponse({ error: 'Page content is too large or empty' }, 422)
  }

  const result = extractAutofill(new URL(response.url || targetUrl.toString()), html)
  return jsonResponse(result, 200)
})
