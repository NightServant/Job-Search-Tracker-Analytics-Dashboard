import { extractAutofill } from './parser.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const REQUEST_TIMEOUT_MS = 12000
const MAX_HTML_BYTES = 2_000_000

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.+$/g, '')
}

function parseIpv4(hostname: string): number[] | null {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return null

  const octets = hostname.split('.').map((part) => Number(part))
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null

  return octets
}

function isPrivateIpv4(octets: number[]): boolean {
  const [a, b] = octets

  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a >= 224) return true

  return false
}

function isDisallowedHostname(rawHostname: string): boolean {
  const hostname = normalizeHostname(rawHostname)
  if (!hostname) return true

  // Avoid obvious local/internal targets
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true
  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return true

  // Block single-label hostnames (e.g. http://intranet/)
  if (!hostname.includes('.')) return true

  const ipv4 = parseIpv4(hostname)
  if (ipv4) return isPrivateIpv4(ipv4)

  // Basic IPv6 checks for local/link-local/unique-local
  if (hostname.includes(':')) {
    const h = hostname
    if (h === '::' || h === '::1') return true
    if (h.startsWith('fe80:')) return true
    if (h.startsWith('fc') || h.startsWith('fd')) return true
    if (h.includes('%')) return true
  }

  return false
}

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

  if (isDisallowedHostname(targetUrl.hostname)) {
    return jsonResponse({ error: 'URL must be a public job posting URL' }, 400)
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

  let finalUrl: URL
  try {
    finalUrl = new URL(response.url || targetUrl.toString())
  } catch {
    return jsonResponse({ error: 'Could not resolve final URL' }, 422)
  }

  if (!['http:', 'https:'].includes(finalUrl.protocol) || isDisallowedHostname(finalUrl.hostname)) {
    return jsonResponse({ error: 'URL redirected to an invalid host' }, 422)
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase()
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    return jsonResponse({ error: 'URL did not return an HTML page' }, 422)
  }

  const html = await response.text()
  if (!html || html.length > MAX_HTML_BYTES) {
    return jsonResponse({ error: 'Page content is too large or empty' }, 422)
  }

  const result = extractAutofill(finalUrl, html)
  return jsonResponse(result, 200)
})
