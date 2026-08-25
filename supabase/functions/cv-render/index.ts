import {
  buildCompletionEvent,
  buildErrorEvent,
  buildInvocationEvent,
  createRequestId,
  emitMonitoringEvent,
  getRequestIdentity,
} from '../_shared/edgeMonitoring.ts'
import { mergeSecurityHeaders } from '../_shared/edgeHeaders.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import puppeteer from 'npm:puppeteer-core@23.11.1'
import chromium from 'npm:@sparticuz/chromium@132.0.0'
import { renderCvHtml, type RenderableCv } from './renderCv.ts'

const FUNCTION_NAME = 'cv-render'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type RenderPayload = {
  title?: string
  sections?: RenderableCv
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...mergeSecurityHeaders(corsHeaders), 'Content-Type': 'application/json' },
  })
}

function sanitizeFileName(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'cv'
}

/**
 * Structural guard on the payload.
 *
 * resumes.sections is JSONB and nullable, so anything can reach here. Rendering
 * a malformed document would fail deep inside the HTML builder with a useless
 * message; refusing it up front gives the caller a 400 it can act on.
 */
function isRenderable(value: unknown): value is RenderableCv {
  if (typeof value !== 'object' || value === null) return false
  const doc = value as Record<string, unknown>
  if (typeof doc.basics !== 'object' || doc.basics === null) return false
  return ['work', 'education', 'skills', 'projects', 'awards'].every((k) => Array.isArray(doc[k]))
}

Deno.serve(async (req: Request) => {
  const requestId = createRequestId(FUNCTION_NAME)
  const startedAt = Date.now()
  const callerKey = getRequestIdentity(req)

  emitMonitoringEvent(buildInvocationEvent({
    functionName: FUNCTION_NAME, requestId, callerKey, dbConnections: 0,
  }))

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: mergeSecurityHeaders(corsHeaders) })
  }

  const fail = (status: number, message: string, dbConnections = 0, extra?: Record<string, unknown>) => {
    emitMonitoringEvent(buildErrorEvent({
      functionName: FUNCTION_NAME, requestId, status,
      latencyMs: Date.now() - startedAt, callerKey, dbConnections, message, extra,
    }))
    return jsonResponse({ error: message }, status)
  }

  if (req.method !== 'POST') return fail(405, 'Method not allowed', 0, { method: req.method })

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return fail(401, 'Missing Authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) return fail(500, 'Supabase environment is not configured')

    // Anon key plus the caller's Authorization header, never the service role:
    // this endpoint must act as the user so RLS still applies to anything it reads.
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const dbConnections = 1

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return fail(401, 'Unauthorized', dbConnections, { authError: authError?.message })

    const payload = (await req.json()) as RenderPayload
    const title = (payload.title || 'CV').trim() || 'CV'
    if (!isRenderable(payload.sections)) {
      return fail(400, 'sections must be a JSON Resume document', dbConnections)
    }

    const html = renderCvHtml(payload.sections, title)

    const executablePath = await chromium.executablePath()
    browser = await puppeteer.launch({
      args: [...chromium.args, '--font-render-hinting=none'],
      executablePath,
      headless: true,
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'Letter', printBackground: true })

    emitMonitoringEvent(buildCompletionEvent({
      functionName: FUNCTION_NAME, requestId, status: 200,
      latencyMs: Date.now() - startedAt, callerKey, dbConnections,
    }))

    return new Response(pdf, {
      status: 200,
      headers: {
        ...mergeSecurityHeaders(corsHeaders),
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sanitizeFileName(title)}.pdf"`,
      },
    })
  } catch (err) {
    return fail(500, err instanceof Error ? err.message : 'Render failed', 1)
  } finally {
    // Chromium outlives the request otherwise and the instance leaks memory.
    if (browser) await browser.close()
  }
})
