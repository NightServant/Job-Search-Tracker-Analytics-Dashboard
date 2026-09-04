/**
 * Which integrations this deployment actually has, read once from the
 * environment.
 *
 * EVERY INTEGRATION HERE IS OPTIONAL, and that is a design rule rather than a
 * convenience. Worktrack has to keep working for someone who has configured
 * none of them -- the demo has no backend at all, CI has no secrets, and a
 * fresh clone has an empty .env. So each capability is a boolean the callers
 * branch on, and every client in this directory degrades to a documented
 * fallback instead of throwing.
 *
 * WHAT WAS VERIFIED, AND HOW, on 2026-09-04. Recorded because three of the
 * four services in the original brief turned out not to be what they looked
 * like, and the next person should not have to re-run the investigation:
 *
 *   ESCO      free, keyless, live. `GET ec.europa.eu/esco/api/search?text=react`
 *             returned 200 with 93 skill matches and no credentials.
 *   FormaTeX  real REST API. `POST api.formatex.io/api/v1/compile` returns 401
 *             `{"error":"missing API key"}` with no key and
 *             `{"error":"invalid API key"}` with a bogus `X-API-Key`, which is
 *             how the header name below was confirmed rather than guessed.
 *             `GET /api/v1/health` returns `{"status":"ok"}`.
 *   Tailoring provider-agnostic on purpose. Any OpenAI-compatible chat
 *             endpoint works, so a free tier that changes its limits or
 *             disappears is a change of two env vars, not of this code.
 *   Novoresume NO API EXISTS. No developer docs, no endpoints, no developer
 *             programme -- its career AI tools are consumer web pages. It is
 *             absent from this file because there is nothing to configure.
 */

/** Read an env var from whichever runtime this is executing in. */
function env(name: string): string | undefined {
  // `process.env` in Next's server runtime and in vitest; `import.meta.env`
  // in the Vite client build. Neither is guaranteed to exist, so both are
  // probed defensively rather than assumed.
  const fromProcess =
    typeof process !== 'undefined' && process.env ? process.env[name] : undefined
  if (fromProcess) return fromProcess
  const meta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  return meta?.[name]
}

function trimmed(name: string): string | undefined {
  const value = env(name)?.trim()
  return value ? value : undefined
}

export interface IntegrationConfig {
  /** LaTeX compilation. `undefined` key means the capability is off. */
  formatex: { baseUrl: string; apiKey?: string }
  /**
   * CV tailoring over any OpenAI-compatible chat endpoint.
   *
   * Named for the CONTRACT, not for a vendor. Groq, OpenRouter, Cloudflare
   * Workers AI, Together and a local Ollama all speak this shape, and every
   * one of their free tiers has changed its limits at least once -- so the
   * provider is configuration and never an import.
   */
  tailoring: { baseUrl?: string; apiKey?: string; model: string }
  /** The EU skills taxonomy. No key, so it is on unless explicitly disabled. */
  esco: { baseUrl: string; enabled: boolean }
}

export function readIntegrationConfig(): IntegrationConfig {
  return {
    formatex: {
      baseUrl: trimmed('FORMATEX_BASE_URL') ?? 'https://api.formatex.io/api/v1',
      apiKey: trimmed('FORMATEX_API_KEY'),
    },
    tailoring: {
      baseUrl: trimmed('TAILORING_BASE_URL'),
      apiKey: trimmed('TAILORING_API_KEY'),
      // No default that names a vendor. A model id is meaningless without the
      // base URL it belongs to, so the two are set together or not at all.
      model: trimmed('TAILORING_MODEL') ?? '',
    },
    esco: {
      baseUrl: trimmed('ESCO_BASE_URL') ?? 'https://ec.europa.eu/esco/api',
      enabled: trimmed('ESCO_ENABLED') !== 'false',
    },
  }
}

/**
 * What this deployment can actually do, as four booleans.
 *
 * Callers branch on these rather than on the presence of a key, so the reason
 * a feature is unavailable stays in one place and the UI can say which one is
 * missing instead of failing at the request.
 */
export interface IntegrationCapabilities {
  compileLatex: boolean
  tailorCv: boolean
  expandSkills: boolean
}

export function capabilitiesOf(config: IntegrationConfig): IntegrationCapabilities {
  return {
    compileLatex: !!config.formatex.apiKey,
    // Both, and neither alone: a base URL with no key cannot authenticate and
    // a key with no base URL has nowhere to go.
    tailorCv: !!config.tailoring.apiKey && !!config.tailoring.baseUrl && !!config.tailoring.model,
    expandSkills: config.esco.enabled,
  }
}
