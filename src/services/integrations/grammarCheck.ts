import {
  chunkText,
  splitByCategory,
  toIssues,
  type GrammarBotResponse,
  type GrammarIssue,
} from '../grammar'
import type { IntegrationConfig } from './config'

/**
 * The GrammarBot HTTP client, server-side only.
 *
 * SAME CONTRACT AS `tailoring.ts`: it never throws. Every outcome is a value
 * carrying a `reason`, so the route can map it to a status and the pane can
 * say which of "not configured", "rejected the key" and "the network failed"
 * happened, rather than showing one apologetic sentence for all three.
 *
 * THE KEY GOES IN THE BODY, not a header, which is the vendor's design and not
 * a choice available here. It is the reason this file must never be imported
 * from a client component: a bundled copy would put the key in the page
 * source, where a header-based key would at least have stayed in a request.
 *
 * CHUNKS ARE SENT IN PARALLEL, and the ordering is restored afterwards by
 * sorting on document position in `splitByCategory`. A long CV is a handful of
 * requests; doing them in series would multiply a one-second call by the
 * number of pages for no benefit.
 */

/** Named so the per-chunk helper can reuse it instead of inferring it back out. */
export type GrammarFailureReason =
  | 'unconfigured'
  | 'auth'
  | 'rate-limit'
  | 'bad-response'
  | 'network'

export type GrammarCheckResult =
  | { ok: true; issues: GrammarIssue[]; spelling: GrammarIssue[]; grammar: GrammarIssue[] }
  | { ok: false; reason: GrammarFailureReason; message: string }

type ChunkResult =
  | { ok: true; issues: GrammarIssue[] }
  | { ok: false; reason: GrammarFailureReason; message: string }

export interface GrammarClientOptions {
  config: IntegrationConfig
  /** Injected in tests so no network is touched. */
  fetchImpl?: typeof fetch
}

async function checkChunk(
  chunk: { text: string; offset: number },
  baseUrl: string,
  apiKey: string,
  doFetch: typeof fetch
): Promise<ChunkResult> {
  let response: Response
  try {
    response = await doFetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: chunk.text, api_key: apiKey }),
    })
  } catch {
    return { ok: false, reason: 'network', message: 'Could not reach the grammar service.' }
  }

  if (response.status === 401 || response.status === 403) {
    return { ok: false, reason: 'auth', message: 'The grammar service rejected the API key.' }
  }
  if (response.status === 429) {
    return {
      ok: false,
      reason: 'rate-limit',
      message: 'The grammar service is rate limiting this key. Try again shortly.',
    }
  }
  if (!response.ok) {
    return {
      ok: false,
      reason: 'network',
      message: `The grammar service returned ${response.status}.`,
    }
  }

  let payload: GrammarBotResponse
  try {
    payload = (await response.json()) as GrammarBotResponse
  } catch {
    return { ok: false, reason: 'bad-response', message: 'The grammar service returned malformed JSON.' }
  }

  return { ok: true, issues: toIssues(payload, chunk.offset) }
}

export async function checkGrammar(
  text: string,
  { config, fetchImpl }: GrammarClientOptions
): Promise<GrammarCheckResult> {
  const apiKey = config.grammar.apiKey
  if (!apiKey) {
    return {
      ok: false,
      reason: 'unconfigured',
      message: 'Grammar checking is not configured. Set GRAMMARBOT_API_KEY.',
    }
  }

  const chunks = chunkText(text)
  // Nothing to check is a success with no issues, not an error. An empty
  // document should show "no problems", not "something went wrong".
  if (chunks.length === 0) return { ok: true, issues: [], spelling: [], grammar: [] }

  const doFetch = fetchImpl ?? fetch
  const results = await Promise.all(
    chunks.map((chunk) => checkChunk(chunk, config.grammar.baseUrl, apiKey, doFetch))
  )

  // ONE BAD CHUNK FAILS THE CHECK. Returning the issues from four chunks out
  // of five would silently present a partial result as a complete one, and the
  // user would read "3 problems" over a document that has more.
  const failure = results.find((r) => !r.ok)
  if (failure && !failure.ok) {
    return { ok: false, reason: failure.reason, message: failure.message }
  }

  const issues = results.flatMap((r) => (r.ok ? r.issues : []))
  const { spelling, grammar } = splitByCategory(issues)
  return { ok: true, issues, spelling, grammar }
}
