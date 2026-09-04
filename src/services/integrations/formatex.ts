import type { IntegrationConfig } from './config'

/**
 * FormaTeX, a hosted LaTeX compiler, used to turn a .tex CV into a PDF
 * without a local TeX Live install.
 *
 * THE CONTRACT BELOW WAS PROBED, NOT READ. Their published docs page 404s, so
 * every detail here comes from hitting the service directly on 2026-09-04:
 *
 *   GET  /api/v1/health   -> 200 {"status":"ok"}
 *   POST /api/v1/compile  -> 401 {"error":"missing API key"}       (no header)
 *   POST /api/v1/compile  -> 401 {"error":"invalid API key"}       (X-API-Key: bogus)
 *   POST /v1/compile      -> 404                                   (wrong base)
 *
 * The header name is `X-API-Key` because the error CHANGED when it was sent --
 * "missing" became "invalid", which is the service confirming it read the
 * header. That is the difference between knowing and assuming, and it is
 * recorded because the next person cannot re-derive it from documentation
 * that is not there.
 *
 * WHY THIS IS A SEPARATE SERVICE AND NOT AN EDGE FUNCTION. `cv-render` already
 * renders the Word CV to PDF through headless Chromium. LaTeX is a different
 * problem -- it needs a TeX distribution, not a browser -- and shipping one
 * into a Supabase edge function is not viable. A hosted compiler is the right
 * shape, and this client is the seam so a different one (or a self-hosted
 * container) is a config change.
 */

export interface LatexCompileRequest {
  latex: string
  /** FormaTeX supports multiple engines; omitted means the service decides. */
  engine?: 'pdflatex' | 'xelatex' | 'lualatex'
}

export type LatexCompileResult =
  | { ok: true; pdf: Blob }
  | {
      ok: false
      /**
       * `unconfigured` is not a failure the user caused, and the UI must say
       * so differently from a compile error -- one is "add a key", the other
       * is "fix line 42".
       */
      reason: 'unconfigured' | 'auth' | 'compile' | 'network'
      message: string
    }

export interface FormatexClientOptions {
  config: IntegrationConfig
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

/** Live check, for a settings screen that wants to say whether the key works. */
export async function checkFormatex(options: FormatexClientOptions): Promise<boolean> {
  const doFetch = options.fetchImpl ?? fetch
  try {
    const response = await doFetch(`${base(options)}/health`, { headers: { accept: 'application/json' } })
    return response.ok
  } catch {
    return false
  }
}

function base(options: FormatexClientOptions): string {
  return options.config.formatex.baseUrl.replace(/\/$/, '')
}

/**
 * Compile LaTeX to a PDF.
 *
 * NEVER THROWS, for the same reason the ESCO client does not: this sits on a
 * user action with a spinner attached, and a rejected promise there becomes
 * an unhandled rejection and a button stuck on "Exporting". Every outcome is
 * a value the caller can render.
 */
export async function compileLatex(
  request: LatexCompileRequest,
  options: FormatexClientOptions
): Promise<LatexCompileResult> {
  const apiKey = options.config.formatex.apiKey
  if (!apiKey) {
    return {
      ok: false,
      reason: 'unconfigured',
      message: 'LaTeX compilation is not configured. Set FORMATEX_API_KEY to enable it.',
    }
  }
  if (!request.latex.trim()) {
    return { ok: false, reason: 'compile', message: 'There is nothing to compile.' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000)
  const doFetch = options.fetchImpl ?? fetch

  try {
    const response = await doFetch(`${base(options)}/compile`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        // Confirmed by the error changing from "missing" to "invalid".
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        latex: request.latex,
        ...(request.engine ? { engine: request.engine } : {}),
      }),
    })

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        reason: 'auth',
        message: 'FormaTeX rejected the API key. Check FORMATEX_API_KEY.',
      }
    }
    if (!response.ok) {
      // A compile failure carries the TeX log, which is the only useful thing
      // to show someone whose document did not build -- so it is passed
      // through rather than replaced with a generic message.
      return {
        ok: false,
        reason: 'compile',
        message: (await response.text().catch(() => '')) || `Compilation failed (${response.status})`,
      }
    }
    return { ok: true, pdf: await response.blob() }
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message:
        err instanceof Error && err.name === 'AbortError'
          ? 'FormaTeX took too long to respond.'
          : 'Could not reach FormaTeX.',
    }
  } finally {
    clearTimeout(timer)
  }
}
