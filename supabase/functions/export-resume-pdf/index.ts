import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const RESUME_BUCKET = 'resume-documents'
const MAX_LATEX_LENGTH = 100_000
const MAX_PDF_BYTES = 10 * 1024 * 1024
const REQUEST_TIMEOUT_MS = 60_000

type DocType = 'resume' | 'cv'

interface ExportRequest {
  latex: string
  title: string
  docType: DocType
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

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const [scheme, token] = authHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token
}

function sanitizeFileName(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, '-')
  const safe = normalized.replace(/[^a-z0-9._-]/g, '')
  return safe || 'resume'
}

function buildStoragePath(userId: string, title: string): string {
  const base = sanitizeFileName(title)
  return `${userId}/generated/${Date.now()}-${base}.pdf`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const compilerUrl = Deno.env.get('COMPILER_SERVICE_URL')
  const compilerSecret = Deno.env.get('COMPILER_SERVICE_SECRET')

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase function configuration' }, 500)
  }

  if (!compilerUrl || !compilerSecret) {
    return jsonResponse({ error: 'Missing compiler service configuration' }, 500)
  }

  const token = extractBearerToken(req.headers.get('Authorization'))
  if (!token) {
    return jsonResponse({ error: 'Missing auth token' }, 401)
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser()

  if (userError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  let payload: ExportRequest
  try {
    payload = (await req.json()) as ExportRequest
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body' }, 400)
  }

  const latex = typeof payload.latex === 'string' ? payload.latex : ''
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const docType = payload.docType

  if (!title) {
    return jsonResponse({ error: 'Title is required' }, 400)
  }

  if (docType !== 'resume' && docType !== 'cv') {
    return jsonResponse({ error: 'docType must be either resume or cv' }, 400)
  }

  if (!latex.trim()) {
    return jsonResponse({ error: 'LaTeX content is required' }, 400)
  }

  if (latex.length > MAX_LATEX_LENGTH) {
    return jsonResponse(
      { error: `LaTeX content exceeds max length of ${MAX_LATEX_LENGTH} characters` },
      413
    )
  }

  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS)

  let compileResponse: Response
  try {
    compileResponse = await fetch(compilerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${compilerSecret}`,
      },
      body: JSON.stringify({
        latex,
        timeoutMs: REQUEST_TIMEOUT_MS,
      }),
      signal: abortController.signal,
    })
  } catch (error) {
    clearTimeout(timeout)
    if (error instanceof DOMException && error.name === 'AbortError') {
      return jsonResponse({ error: 'Compilation timed out' }, 504)
    }
    return jsonResponse({ error: 'Compiler service unavailable' }, 503)
  }

  clearTimeout(timeout)

  if (!compileResponse.ok) {
    let message = 'Compilation failed'
    try {
      const errBody = await compileResponse.json()
      if (typeof errBody.error === 'string' && errBody.error.trim()) {
        message = errBody.error.trim()
      }
    } catch {
      // keep fallback message
    }
    return jsonResponse({ error: message }, 422)
  }

  const pdfBytes = new Uint8Array(await compileResponse.arrayBuffer())
  if (!pdfBytes.byteLength) {
    return jsonResponse({ error: 'Compiler returned an empty PDF' }, 422)
  }

  if (pdfBytes.byteLength > MAX_PDF_BYTES) {
    return jsonResponse({ error: 'Generated PDF exceeds maximum allowed size' }, 413)
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)
  const filePath = buildStoragePath(user.id, title)
  const fileName = `${sanitizeFileName(title)}.pdf`

  const { error: uploadError } = await adminClient.storage
    .from(RESUME_BUCKET)
    .upload(filePath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    return jsonResponse({ error: 'Failed to upload generated PDF' }, 500)
  }

  const { data: document, error: insertError } = await adminClient
    .from('resume_documents')
    .insert({
      user_id: user.id,
      title,
      doc_type: docType,
      file_name: fileName,
      file_path: filePath,
      mime_type: 'application/pdf',
      file_size: pdfBytes.byteLength,
    })
    .select('*')
    .single()

  if (insertError || !document) {
    await adminClient.storage.from(RESUME_BUCKET).remove([filePath])
    return jsonResponse({ error: 'Failed to save generated document metadata' }, 500)
  }

  const { data: signed, error: signError } = await adminClient.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(filePath, 60 * 5)

  if (signError || !signed?.signedUrl) {
    return jsonResponse({ error: 'PDF created but could not generate download link' }, 500)
  }

  return jsonResponse({
    document,
    signedUrl: signed.signedUrl,
  })
})
