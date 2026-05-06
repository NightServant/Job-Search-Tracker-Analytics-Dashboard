import {
  buildCompletionEvent,
  buildErrorEvent,
  buildInvocationEvent,
  createRequestId,
  emitMonitoringEvent,
  getRequestIdentity,
} from '../_shared/edgeMonitoring.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { generateHTML } from 'npm:@tiptap/html@3.22.5'
import StarterKit from 'npm:@tiptap/starter-kit@3.22.5'
import puppeteer from 'npm:puppeteer-core@23.11.1'
import chromium from 'npm:@sparticuz/chromium@132.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ExportPayload = {
  title?: string
  content?: Record<string, unknown>
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

function sanitizeFileName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'resume'
}

function renderResumeHtml(innerHtml: string, title: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page {
        size: Letter;
        margin: 0;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: #ffffff;
        color: #111827;
        font-family: 'Times New Roman', Times, serif;
      }
      .page {
        width: 8.5in;
        min-height: 11in;
        margin: 0 auto;
        padding: 0.8in;
        background: #ffffff;
      }
      .page h1 {
        margin: 0 0 0.2in;
        font-size: 2rem;
        line-height: 1.2;
        font-weight: 700;
      }
      .page h2 {
        margin: 0.25in 0 0.1in;
        font-size: 1.15rem;
        line-height: 1.25;
        font-weight: 600;
      }
      .page p {
        margin: 0.08in 0;
        font-size: 11.5pt;
        line-height: 1.55;
      }
      .page ul {
        margin: 0.08in 0;
        padding-left: 0.24in;
      }
      .page li {
        margin: 0.05in 0;
        font-size: 11.5pt;
        line-height: 1.5;
      }
    </style>
    <title>${title}</title>
  </head>
  <body>
    <main class="page">
      ${innerHtml}
    </main>
  </body>
</html>`
}

Deno.serve(async (req: Request) => {
  const requestId = createRequestId('resume-export-pdf')
  const startedAt = Date.now()
  const callerKey = getRequestIdentity(req)

  emitMonitoringEvent(buildInvocationEvent({
    functionName: 'resume-export-pdf',
    requestId,
    callerKey,
    dbConnections: 0,
  }))

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    const latencyMs = Date.now() - startedAt
    emitMonitoringEvent(buildErrorEvent({
      functionName: 'resume-export-pdf',
      requestId,
      status: 405,
      latencyMs,
      callerKey,
      dbConnections: 0,
      message: 'Invalid method',
      extra: { method: req.method },
    }))
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      const latencyMs = Date.now() - startedAt
      emitMonitoringEvent(buildErrorEvent({
        functionName: 'resume-export-pdf',
        requestId,
        status: 401,
        latencyMs,
        callerKey,
        dbConnections: 0,
        message: 'Missing Authorization header',
      }))
      return jsonResponse({ error: 'Missing Authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: 'Supabase environment is not configured' }, 500)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })
    const dbConnections = 1

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const latencyMs = Date.now() - startedAt
      emitMonitoringEvent(buildErrorEvent({
        functionName: 'resume-export-pdf',
        requestId,
        status: 401,
        latencyMs,
        callerKey,
        dbConnections,
        message: 'Unauthorized',
        extra: { authError: authError?.message },
      }))
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const payload = (await req.json()) as ExportPayload
    const title = (payload.title || 'Resume').trim() || 'Resume'
    if (!payload.content || typeof payload.content !== 'object') {
      const latencyMs = Date.now() - startedAt
      emitMonitoringEvent(buildErrorEvent({
        functionName: 'resume-export-pdf',
        requestId,
        status: 400,
        latencyMs,
        callerKey,
        dbConnections,
        message: 'Missing content JSON',
      }))
      return jsonResponse({ error: 'content JSON is required' }, 400)
    }

    const htmlContent = generateHTML(payload.content as any, [StarterKit])
    const fullHtml = renderResumeHtml(htmlContent, title)

    const executablePath = await chromium.executablePath()
    const browser = await puppeteer.launch({
      args: [...chromium.args, '--font-render-hinting=none'],
      defaultViewport: {
        width: 816,
        height: 1056,
        deviceScaleFactor: 2,
      },
      executablePath,
      headless: true,
    })

    try {
      const page = await browser.newPage()
      await page.setContent(fullHtml, { waitUntil: 'networkidle0' })
      const pdf = await page.pdf({
        format: 'letter',
        printBackground: true,
        margin: {
          top: '0in',
          right: '0in',
          bottom: '0in',
          left: '0in',
        },
      })

      const latencyMs = Date.now() - startedAt
      emitMonitoringEvent(buildCompletionEvent({
        functionName: 'resume-export-pdf',
        requestId,
        status: 200,
        latencyMs,
        callerKey,
        dbConnections,
        message: 'PDF export complete',
        extra: {
          title,
          bytes: pdf.byteLength,
        },
      }))

      return new Response(pdf, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${sanitizeFileName(title)}.pdf"`,
          'Cache-Control': 'no-store',
        },
      })
    } finally {
      await browser.close()
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const latencyMs = Date.now() - startedAt
    emitMonitoringEvent(buildErrorEvent({
      functionName: 'resume-export-pdf',
      requestId,
      status: 500,
      latencyMs,
      callerKey,
      dbConnections: 1,
      message: 'PDF generation failed',
      extra: { error: message },
    }))
    return jsonResponse({ error: `PDF generation failed: ${message}` }, 500)
  }
})
