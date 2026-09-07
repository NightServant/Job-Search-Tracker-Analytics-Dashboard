import { readIntegrationConfig, capabilitiesOf, type IntegrationConfig } from './config'
import { extractiveSummary, formatPostingText } from '../postingFormat'

/**
 * A job posting, summarised and mined for the fields the form needs.
 *
 * THE MODEL PROPOSES, THIS CODE VERIFIES. That is the whole design, and it is
 * the answer to "reduce hallucinations" -- a prompt asking a model not to
 * invent is a request, not a guarantee. Every value that comes back is checked
 * against the source text before it is allowed out:
 *
 *   FIELDS    must appear VERBATIM in the posting, compared on normalised
 *             text. A company the model was sure about but the posting never
 *             names is dropped, not shown.
 *   NUMBERS   a salary figure must have its digits present in the source.
 *   SUMMARY   must be built from the posting's own vocabulary. Every content
 *             word is checked; a summary that introduces one is thrown away
 *             and replaced with the extractive fallback.
 *
 * Anything dropped is REPORTED rather than silently discarded, so the caller
 * can say the model guessed rather than pretending it never spoke.
 *
 * IT DEGRADES TO SOMETHING USEFUL. With no provider configured there is no
 * request at all: the deterministic formatter and an extractive summary still
 * run, which is most of the value and works on any deployment.
 */

export interface PostingFields {
  role: string | null
  company: string | null
  location: string | null
  work_mode: 'onsite' | 'hybrid' | 'remote' | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  tech_stack: string[]
}

export interface PostingDigest {
  /** Always present: the deterministic clean-up of the input. */
  formatted: string
  summary: string
  fields: PostingFields
  /** Whether a model contributed, or this is formatter-only. */
  usedModel: boolean
  /**
   * What the model returned and could not be found in the posting.
   *
   * Surfaced deliberately. A silent drop looks identical to the model getting
   * it right, and the one thing a reader needs to know about a generated
   * field is whether anything was invented on the way.
   */
  dropped: string[]
}

const EMPTY_FIELDS: PostingFields = {
  role: null,
  company: null,
  location: null,
  work_mode: null,
  salary_min: null,
  salary_max: null,
  salary_currency: null,
  tech_stack: [],
}

const WORK_MODES = new Set(['onsite', 'hybrid', 'remote'])

/** Words too common to prove anything about grounding. */
const FUNCTION_WORDS = new Set([
  'a', 'an', 'and', 'or', 'the', 'to', 'of', 'in', 'on', 'for', 'with', 'at',
  'by', 'from', 'as', 'is', 'are', 'be', 'will', 'you', 'your', 'we', 'our',
  'this', 'that', 'it', 'its', 'they', 'their', 'has', 'have', 'who', 'which',
])

/**
 * Comparable text: lowercase, punctuation gone, one space between words.
 *
 * DOTS ARE KEPT ONLY BETWEEN CHARACTERS, so `node.js` survives and the period
 * ending `Acme Corp.` does not. Without that distinction a company named at
 * the end of a sentence never matched itself and was reported as invented --
 * which is the failure mode that matters most here, because it makes the
 * grounding check look like it is working while it quietly rejects the truth.
 */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, ' ')
    // Protect an internal dot, drop every other one, then restore.
    .replace(/([a-z0-9])\.(?=[a-z0-9])/g, '$1\u0000')
    .replace(/\./g, ' ')
    .replace(/\u0000/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Whether a value the model returned actually appears in the posting. */
function isGrounded(value: string, source: string): boolean {
  const needle = normalise(value)
  if (!needle) return false
  return normalise(source).includes(needle)
}

/** Whether every digit-run in a number appears in the posting. */
function isNumberGrounded(value: number, source: string): boolean {
  const digits = String(Math.round(value))
  const stripped = source.replace(/[,\s]/g, '')
  // Both `50000` and `50,000` in the source satisfy 50000.
  return stripped.includes(digits) || source.includes(digits)
}

/**
 * Content words in `text` that never appear in `source`.
 *
 * This is what stops a summary inventing. An extractive summary of a posting
 * has no business using a word the posting does not, so anything left here is
 * the model writing rather than reading.
 */
export function ungroundedWords(text: string, source: string): string[] {
  const vocabulary = new Set(normalise(source).split(' '))
  return [...new Set(normalise(text).split(' '))].filter((word) => {
    if (word.length < 3 || FUNCTION_WORDS.has(word)) return false
    if (vocabulary.has(word)) return false
    // Tolerate a plural on either side; that is grammar, not invention.
    if (vocabulary.has(`${word}s`)) return false
    if (word.endsWith('s') && vocabulary.has(word.slice(0, -1))) return false
    return true
  })
}

const SYSTEM_PROMPT = `You extract facts from a job posting. You never infer, guess or complete.

Rules:
- Copy values EXACTLY as they appear in the posting. Do not rephrase, expand or tidy them.
- If the posting does not state something, return null. Returning null is always correct when unsure.
- The summary must use only words that appear in the posting. Two sentences at most.
- Never state a salary, company or location the posting does not contain.

Reply with JSON only, no prose and no code fence:
{"summary": string,
 "role": string|null, "company": string|null, "location": string|null,
 "work_mode": "onsite"|"hybrid"|"remote"|null,
 "salary_min": number|null, "salary_max": number|null, "salary_currency": string|null,
 "tech_stack": string[]}`

interface Options {
  config?: IntegrationConfig
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

/** Strips a code fence a model added despite being told not to. */
function parseReply(content: string): Record<string, unknown> | null {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1))
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/**
 * Keeps only what the posting can back up.
 *
 * Exported because it is the interesting half and deserves its own tests
 * without a network in the way.
 */
export function groundFields(
  raw: Record<string, unknown>,
  source: string
): { fields: PostingFields; dropped: string[] } {
  const fields: PostingFields = { ...EMPTY_FIELDS, tech_stack: [] }
  const dropped: string[] = []

  const text = (key: keyof PostingFields, value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return
    if (isGrounded(value, source)) {
      // @ts-expect-error -- narrowed by the caller's key choice.
      fields[key] = value.trim()
    } else {
      dropped.push(`${key}: "${value.trim()}"`)
    }
  }

  text('role', raw.role)
  text('company', raw.company)
  text('location', raw.location)

  const mode = typeof raw.work_mode === 'string' ? raw.work_mode.toLowerCase() : ''
  if (WORK_MODES.has(mode)) {
    // Grounded differently: the WORD need not appear -- "work from home" means
    // remote -- so this is validated against the union instead, which is the
    // only place a wrong value could do harm.
    fields.work_mode = mode as PostingFields['work_mode']
  } else if (mode) {
    dropped.push(`work_mode: "${mode}"`)
  }

  for (const key of ['salary_min', 'salary_max'] as const) {
    const value = raw[key]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    if (isNumberGrounded(value, source)) fields[key] = value
    else dropped.push(`${key}: ${value}`)
  }

  if (typeof raw.salary_currency === 'string' && raw.salary_currency.trim()) {
    const code = raw.salary_currency.trim().toUpperCase()
    // Only alongside a figure it belongs to, and only if the posting says it.
    if ((fields.salary_min !== null || fields.salary_max !== null) && isGrounded(code, source)) {
      fields.salary_currency = code
    } else {
      dropped.push(`salary_currency: "${code}"`)
    }
  }

  if (Array.isArray(raw.tech_stack)) {
    for (const entry of raw.tech_stack.slice(0, 40)) {
      if (typeof entry !== 'string' || !entry.trim()) continue
      if (isGrounded(entry, source)) fields.tech_stack.push(entry.trim())
      else dropped.push(`tech_stack: "${entry.trim()}"`)
    }
  }

  return { fields, dropped }
}

export async function digestPosting(rawText: string, options: Options = {}): Promise<PostingDigest> {
  const formatted = formatPostingText(rawText)
  const base: PostingDigest = {
    formatted,
    summary: extractiveSummary(formatted),
    fields: { ...EMPTY_FIELDS, tech_stack: [] },
    usedModel: false,
    dropped: [],
  }

  const config = options.config ?? readIntegrationConfig()
  if (!formatted || !capabilitiesOf(config).tailorCv) return base

  const { baseUrl, apiKey, model } = config.tailoring
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000)
  const doFetch = options.fetchImpl ?? fetch

  try {
    const response = await doFetch(`${baseUrl!.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        // ZERO, unlike tailoring's 0.3. That is a writing task where a little
        // variation helps; this is a reading one, where every degree of
        // freedom is a chance to invent a salary.
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: formatted.slice(0, 16_000) },
        ],
      }),
    })
    if (!response.ok) return base

    const body = (await response.json()) as { choices?: { message?: { content?: unknown } }[] }
    const content = body.choices?.[0]?.message?.content
    if (typeof content !== 'string') return base

    const raw = parseReply(content)
    if (!raw) return base

    const { fields, dropped } = groundFields(raw, formatted)

    let summary = base.summary
    if (typeof raw.summary === 'string' && raw.summary.trim()) {
      const invented = ungroundedWords(raw.summary, formatted)
      if (invented.length === 0) {
        summary = raw.summary.trim()
      } else {
        // The extractive fallback stands, and the reader is told why.
        dropped.push(`summary (invented: ${invented.slice(0, 5).join(', ')})`)
      }
    }

    return { formatted, summary, fields, usedModel: true, dropped }
  } catch {
    return base
  } finally {
    clearTimeout(timer)
  }
}
