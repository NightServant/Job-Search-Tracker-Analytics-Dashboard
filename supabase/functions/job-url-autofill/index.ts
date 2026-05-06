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

function normalizeTargetUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim()
  if (!trimmed) return ''

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed
  }

  if (/^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(trimmed)) {
    return `https://${trimmed}`
  }

  return trimmed
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

function generateRequestId(): string {
  return `autofill-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

Deno.serve(async (req: Request) => {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.error(`[${requestId}] Invalid method: ${req.method}`)
    return jsonResponse({ error: 'Method not allowed', requestId }, 405)
  }

  let body: AutofillRequest
  try {
    body = (await req.json()) as AutofillRequest
  } catch (err) {
    console.error(`[${requestId}] Invalid JSON body:`, err)
    return jsonResponse({ error: 'Invalid JSON body', requestId }, 400)
  }

  const rawUrl = normalizeTargetUrl(body.url || '')
  if (!rawUrl) {
    console.warn(`[${requestId}] Empty URL provided`)
    return jsonResponse({ error: 'URL is required', requestId }, 400)
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(rawUrl)
  } catch (err) {
    console.error(`[${requestId}] Invalid URL format for "${rawUrl}":`, err)
    return jsonResponse({ error: 'Invalid URL format', requestId }, 400)
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    console.warn(`[${requestId}] Invalid protocol: ${targetUrl.protocol}`)
    return jsonResponse({ error: 'URL must start with http:// or https://', requestId }, 400)
  }

  if (isDisallowedHostname(targetUrl.hostname)) {
    console.warn(`[${requestId}] Disallowed hostname: ${targetUrl.hostname}`)
    return jsonResponse({ error: 'URL must be a public job posting URL', requestId }, 400)
  }

  console.log(`[${requestId}] Fetching: ${targetUrl.hostname}${targetUrl.pathname.substring(0, 50)}`)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(targetUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[${requestId}] Fetch failed:`, errorMsg)
    if (err instanceof DOMException && err.name === 'AbortError') {
      return jsonResponse({ error: 'Timed out while fetching job page', requestId }, 504)
    }
    return jsonResponse({ error: 'Could not fetch this URL', requestId }, 422)
  }

  clearTimeout(timer)

  if (!response.ok) {
    console.warn(`[${requestId}] HTTP ${response.status}: ${targetUrl.hostname}`)
    return jsonResponse({ error: `Could not fetch page (status ${response.status})`, requestId }, 422)
  }

  let finalUrl: URL
  try {
    finalUrl = new URL(response.url || targetUrl.toString())
  } catch (err) {
    console.error(`[${requestId}] Could not resolve final URL:`, err)
    return jsonResponse({ error: 'Could not resolve final URL', requestId }, 422)
  }

  if (!['http:', 'https:'].includes(finalUrl.protocol) || isDisallowedHostname(finalUrl.hostname)) {
    console.warn(`[${requestId}] Redirect to disallowed host: ${finalUrl.hostname}`)
    return jsonResponse({ error: 'URL redirected to an invalid host', requestId }, 422)
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase()
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    console.warn(`[${requestId}] Invalid content-type: ${contentType}`)
    return jsonResponse({ error: 'URL did not return an HTML page', requestId }, 422)
  }

  const html = await response.text()
  if (!html || html.length > MAX_HTML_BYTES) {
    console.warn(`[${requestId}] Page size invalid: ${html.length} bytes`)
    return jsonResponse({ error: 'Page content is too large or empty', requestId }, 422)
  }

  const result = extractAutofill(finalUrl, html)
  const duration = Date.now() - startTime
  console.log(`[${requestId}] Success in ${duration}ms, extracted ${Object.keys(result).length} fields`)
  return jsonResponse({ ...result, requestId }, 200)
})
