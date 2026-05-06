import {
  buildCompletionEvent,
  buildErrorEvent,
  buildInvocationEvent,
  buildThrottleEvent,
  createRequestId,
  emitMonitoringEvent,
  getRequestIdentity,
  takeThrottleSlot,
} from '../_shared/edgeMonitoring.ts'
import { extractAutofill } from './parser.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const REQUEST_TIMEOUT_MS = 12000
const MAX_HTML_BYTES = 2_000_000
const MAX_URL_LENGTH = 2048
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 8

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
  url?: unknown
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

function jsonResponseWithHeaders(body: unknown, status: number, extraHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function validateAutofillRequest(body: AutofillRequest): { ok: true; url: string } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object' }
  }

  if (typeof body.url !== 'string') {
    return { ok: false, error: 'URL is required' }
  }

  const url = body.url.trim()
  if (!url) {
    return { ok: false, error: 'URL is required' }
  }

  if (url.length > MAX_URL_LENGTH) {
    return { ok: false, error: 'URL is too long' }
  }

  return { ok: true, url }
}

Deno.serve(async (req: Request) => {
  const requestId = createRequestId('job-url-autofill')
  const startTime = Date.now()
  const callerKey = getRequestIdentity(req)

  emitMonitoringEvent(buildInvocationEvent({
    functionName: 'job-url-autofill',
    requestId,
    callerKey,
  }))
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    console.error(`[${requestId}] Invalid method: ${req.method}`)
    const latencyMs = Date.now() - startTime
    emitMonitoringEvent(buildErrorEvent({
      functionName: 'job-url-autofill',
      requestId,
      status: 405,
      latencyMs,
      callerKey,
      message: 'Invalid method',
      extra: { method: req.method },
    }))
    return jsonResponse({ error: 'Method not allowed', requestId }, 405)
  }

  const rateLimit = takeThrottleSlot(callerKey, {
    limit: RATE_LIMIT_MAX_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
  })

  if (!rateLimit.allowed) {
    console.warn(`[${requestId}] Throttled request from ${callerKey}`)
    emitMonitoringEvent(buildThrottleEvent({
      functionName: 'job-url-autofill',
      requestId,
      callerKey,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
      message: 'Request throttled',
    }))
    return jsonResponseWithHeaders(
      {
        error: 'Too many requests',
        requestId,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      429,
      { 'Retry-After': String(rateLimit.retryAfterSeconds) },
    )
  }

  let body: AutofillRequest
  try {
    body = (await req.json()) as AutofillRequest
  } catch (err) {
    console.error(`[${requestId}] Invalid JSON body:`, err)
    const latencyMs = Date.now() - startTime
    emitMonitoringEvent(buildErrorEvent({
      functionName: 'job-url-autofill',
      requestId,
      status: 400,
      latencyMs,
      callerKey,
      message: 'Invalid JSON body',
      extra: { error: err instanceof Error ? err.message : String(err) },
    }))
    return jsonResponse({ error: 'Invalid JSON body', requestId }, 400)
  }

  const validation = validateAutofillRequest(body)
  if (!validation.ok) {
    console.warn(`[${requestId}] ${validation.error}`)
    const latencyMs = Date.now() - startTime
    emitMonitoringEvent(buildErrorEvent({
      functionName: 'job-url-autofill',
      requestId,
      status: 400,
      latencyMs,
      callerKey,
      message: validation.error,
    }))
    return jsonResponse({ error: validation.error, requestId }, 400)
  }

  const rawUrl = normalizeTargetUrl(validation.url)
  let targetUrl: URL
  try {
    targetUrl = new URL(rawUrl)
  } catch (err) {
    console.error(`[${requestId}] Invalid URL format for "${rawUrl}":`, err)
    const latencyMs = Date.now() - startTime
    emitMonitoringEvent(buildErrorEvent({
      functionName: 'job-url-autofill',
      requestId,
      status: 400,
      latencyMs,
      callerKey,
      message: 'Invalid URL format',
      extra: { error: err instanceof Error ? err.message : String(err) },
    }))
    return jsonResponse({ error: 'Invalid URL format', requestId }, 400)
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    console.warn(`[${requestId}] Invalid protocol: ${targetUrl.protocol}`)
    const latencyMs = Date.now() - startTime
    emitMonitoringEvent(buildErrorEvent({
      functionName: 'job-url-autofill',
      requestId,
      status: 400,
      latencyMs,
      callerKey,
      message: 'Invalid protocol',
      extra: { protocol: targetUrl.protocol },
    }))
    return jsonResponse({ error: 'URL must start with http:// or https://', requestId }, 400)
  }

  if (isDisallowedHostname(targetUrl.hostname)) {
    console.warn(`[${requestId}] Disallowed hostname: ${targetUrl.hostname}`)
    const latencyMs = Date.now() - startTime
    emitMonitoringEvent(buildErrorEvent({
      functionName: 'job-url-autofill',
      requestId,
      status: 400,
      latencyMs,
      callerKey,
      message: 'Disallowed hostname',
      extra: { hostname: targetUrl.hostname },
    }))
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
      const latencyMs = Date.now() - startTime
      emitMonitoringEvent(buildErrorEvent({
        functionName: 'job-url-autofill',
        requestId,
        status: 504,
        latencyMs,
        callerKey,
        message: 'Timed out while fetching job page',
        extra: { error: errorMsg },
      }))
      return jsonResponse({ error: 'Timed out while fetching job page', requestId }, 504)
    }
    const latencyMs = Date.now() - startTime
    emitMonitoringEvent(buildErrorEvent({
      functionName: 'job-url-autofill',
      requestId,
      status: 422,
      latencyMs,
      callerKey,
      message: 'Could not fetch this URL',
      extra: { error: errorMsg },
    }))
    return jsonResponse({ error: 'Could not fetch this URL', requestId }, 422)
  }

  clearTimeout(timer)

  if (!response.ok) {
    console.warn(`[${requestId}] HTTP ${response.status}: ${targetUrl.hostname}`)
    const latencyMs = Date.now() - startTime
    emitMonitoringEvent(buildErrorEvent({
      functionName: 'job-url-autofill',
      requestId,
      status: 422,
      latencyMs,
      callerKey,
      message: 'Upstream returned non-OK response',
      extra: { status: response.status, host: targetUrl.hostname },
    }))
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
    const latencyMs = Date.now() - startTime
    emitMonitoringEvent(buildErrorEvent({
      functionName: 'job-url-autofill',
      requestId,
      status: 422,
      latencyMs,
      callerKey,
      message: 'Redirected to invalid host',
      extra: { host: finalUrl.hostname },
    }))
    return jsonResponse({ error: 'URL redirected to an invalid host', requestId }, 422)
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase()
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    console.warn(`[${requestId}] Invalid content-type: ${contentType}`)
    const latencyMs = Date.now() - startTime
    emitMonitoringEvent(buildErrorEvent({
      functionName: 'job-url-autofill',
      requestId,
      status: 422,
      latencyMs,
      callerKey,
      message: 'Non-HTML response',
      extra: { contentType },
    }))
    return jsonResponse({ error: 'URL did not return an HTML page', requestId }, 422)
  }

  const html = await response.text()
  if (!html || html.length > MAX_HTML_BYTES) {
    console.warn(`[${requestId}] Page size invalid: ${html.length} bytes`)
    const latencyMs = Date.now() - startTime
    emitMonitoringEvent(buildErrorEvent({
      functionName: 'job-url-autofill',
      requestId,
      status: 422,
      latencyMs,
      callerKey,
      message: 'Page content too large or empty',
      extra: { bytes: html.length },
    }))
    return jsonResponse({ error: 'Page content is too large or empty', requestId }, 422)
  }

  const result = extractAutofill(finalUrl, html)
  const duration = Date.now() - startTime
  console.log(`[${requestId}] Success in ${duration}ms, extracted ${Object.keys(result).length} fields`)
  emitMonitoringEvent(buildCompletionEvent({
    functionName: 'job-url-autofill',
    requestId,
    status: 200,
    latencyMs: duration,
    callerKey,
    message: 'Autofill extraction complete',
    extra: {
      fieldsExtracted: Object.keys(result).length,
      host: finalUrl.hostname,
    },
  }))
  return jsonResponse({ ...result, requestId }, 200)
})
