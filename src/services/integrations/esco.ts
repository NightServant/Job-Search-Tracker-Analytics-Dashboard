/**
 * ESCO, the European Commission's skills and occupations taxonomy, used as a
 * free synonym source for ATS keyword matching.
 *
 * WHY IT IS HERE. `atsMatch.matchKeywords` compares raw tokens, so a posting
 * asking for "JavaScript" and a CV written in "ECMAScript" score zero overlap
 * on a term both documents are about. A synonym table fixes that, and ESCO is
 * the only one that is genuinely free: `GET ec.europa.eu/esco/api/search`
 * returned 200 with real results and NO credentials of any kind (verified
 * 2026-09-04).
 *
 * WHY IT IS USED SO NARROWLY, which is the important part of this file.
 *
 * ESCO is an OCCUPATIONAL taxonomy -- trades, duties and soft skills -- not a
 * technology index. Measured against it directly:
 *
 *   "javascript"        6 hits, top title "JavaScript"           usable
 *   "typescript"        1 hit,  "TypeScript"                     usable
 *   "postgresql"        1 hit,  "PostgreSQL"                     usable
 *   "kubernetes"        0 hits                                   absent
 *   "docker"            0 hits                                   absent
 *   "react"             top hit "react to emergency situations
 *                       in a live performance environment"       WRONG SENSE
 *   "software engineer" 604 hits, led by "utilise computer-aided
 *                       software engineering tools"              NOISE
 *
 * So a naive "search the term, take the synonyms" would have taught the
 * matcher that a CV mentioning "react to emergency situations appropriately"
 * satisfies a React requirement. That is worse than no synonyms at all,
 * because it inflates a score the user is trusting.
 *
 * THE GUARD IS EXACT TITLE EQUALITY. A result counts only when its title,
 * case-folded, IS the term that was searched for. That is exactly the
 * condition under which every usable row above succeeds and every trap above
 * fails: "react" never equals "react to emergency situations...", and
 * "software engineer" never equals "utilise computer-aided software
 * engineering tools". Everything else falls through to the existing local
 * matching, unchanged.
 *
 * The cost of the guard is recall -- Kubernetes and Docker get no synonyms,
 * and neither does any term ESCO spells differently. That is the right trade:
 * a missing synonym costs a point of score, a wrong one costs the user's
 * trust in the number.
 */

/** One row of ESCO's `_embedded.results`, narrowed to what this file reads. */
export interface EscoResult {
  title?: string
  /** Per-language arrays. Only `en` is read; the rest are other locales. */
  alternativeLabel?: Record<string, string[] | string | undefined>
}

export interface EscoSearchResponse {
  total?: number
  _embedded?: { results?: EscoResult[] }
}

/** ESCO returns a string for some languages and an array for others. */
function asArray(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

function fold(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * The guard, as a pure function over a response body.
 *
 * Separated from the fetch so it can be tested against the real captured
 * shapes -- including the two traps -- without a network call, which is what
 * makes "react must return nothing" an assertion rather than a hope.
 */
export function synonymsFromResponse(term: string, body: EscoSearchResponse): string[] {
  const wanted = fold(term)
  if (!wanted) return []

  const results = body._embedded?.results ?? []
  const exact = results.find((result) => fold(result.title ?? '') === wanted)
  if (!exact) return []

  const alternatives = asArray(exact.alternativeLabel?.en)
  const seen = new Set<string>([wanted])
  const out: string[] = []
  for (const label of alternatives) {
    const folded = fold(label)
    // A synonym identical to the term teaches the matcher nothing, and a
    // repeat would weight one term twice.
    if (!folded || seen.has(folded)) continue
    seen.add(folded)
    out.push(folded)
  }
  return out
}

export interface EscoClientOptions {
  baseUrl: string
  /** Injected so tests drive it without a network and callers can add caching. */
  fetchImpl?: typeof fetch
  /** ESCO is a third party on the request path; it does not get to hang. */
  timeoutMs?: number
}

/**
 * Synonyms for one term, or `[]` for anything ESCO does not know exactly.
 *
 * NEVER THROWS. This is an optional enrichment on a scoring path that already
 * works without it, so a taxonomy being slow, rate-limited or down must
 * degrade the score slightly rather than fail the user's request.
 */
export async function fetchEscoSynonyms(
  term: string,
  options: EscoClientOptions
): Promise<string[]> {
  const cleaned = term.trim()
  if (!cleaned) return []

  const doFetch = options.fetchImpl ?? fetch
  const url = new URL(`${options.baseUrl.replace(/\/$/, '')}/search`)
  url.searchParams.set('text', cleaned)
  url.searchParams.set('language', 'en')
  url.searchParams.set('type', 'skill')
  url.searchParams.set('full', 'true')
  // Three is enough for an exact-title check and keeps the payload small;
  // ESCO returns its best matches first and the guard rejects the rest.
  url.searchParams.set('limit', '3')

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 4000)
  try {
    const response = await doFetch(url.toString(), {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return []
    return synonymsFromResponse(cleaned, (await response.json()) as EscoSearchResponse)
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Synonyms for many terms at once, as a lookup the matcher can consult.
 *
 * CONCURRENCY IS CAPPED. A long posting yields dozens of terms, and firing
 * dozens of parallel requests at a free public service run by the European
 * Commission is how an integration gets an IP blocked. Six at a time is
 * polite and still finishes a whole posting in well under a second.
 */
export async function buildSynonymIndex(
  terms: string[],
  options: EscoClientOptions & { concurrency?: number }
): Promise<Map<string, string[]>> {
  const unique = [...new Set(terms.map(fold).filter(Boolean))]
  const index = new Map<string, string[]>()
  const limit = Math.max(1, options.concurrency ?? 6)

  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, unique.length) }, async () => {
    while (cursor < unique.length) {
      const term = unique[cursor++]
      const synonyms = await fetchEscoSynonyms(term, options)
      if (synonyms.length > 0) index.set(term, synonyms)
    }
  })
  await Promise.all(workers)
  return index
}
