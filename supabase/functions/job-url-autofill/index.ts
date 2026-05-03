const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const REQUEST_TIMEOUT_MS = 12000
const MAX_HTML_BYTES = 2_000_000

interface AutofillRequest {
  url: string
}

interface AutofillResponse {
  values: {
    company?: string
    role?: string
    location?: string
    source?: string
    salary_min?: number
    salary_max?: number
    url?: string
  }
  confidence: Record<string, number>
  warnings: string[]
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

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .trim()
}

function cleanText(value: string | null | undefined): string {
  if (!value) return ''
  return decodeHtmlEntities(value.replace(/\s+/g, ' ').trim())
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return cleanText(match?.[1])
}

function extractMetaTag(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    'i'
  )
  const reversePattern = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*(?:name|property)=["']${escaped}["'][^>]*>`,
    'i'
  )

  return cleanText(pattern.exec(html)?.[1] || reversePattern.exec(html)?.[1])
}

function titleToRole(title: string): string {
  if (!title) return ''
  const withoutSuffix = title.split(/\s[\-|\|]\s/)[0] || title
  return cleanText(withoutSuffix)
}

function inferSourceFromHost(hostname: string): string {
  return hostname.replace(/^www\./i, '')
}

function parseSalaryValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const digits = value.replace(/[^\d.]/g, '')
    if (!digits) return undefined
    const n = Number(digits)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value
  return value == null ? [] : [value]
}

function extractJobPostingFromJsonLd(html: string): Record<string, unknown> | null {
  const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || []

  for (const script of scripts) {
    const rawJson = script
      .replace(/<script[^>]*>/i, '')
      .replace(/<\/script>/i, '')
      .trim()

    try {
      const parsed = JSON.parse(rawJson)
      const nodes: unknown[] = []

      if (Array.isArray(parsed)) {
        nodes.push(...parsed)
      } else if (parsed && typeof parsed === 'object') {
        const asRecord = parsed as Record<string, unknown>
        nodes.push(asRecord)
        if (Array.isArray(asRecord['@graph'])) {
          nodes.push(...(asRecord['@graph'] as unknown[]))
        }
      }

      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue
        const item = node as Record<string, unknown>
        const nodeType = item['@type']
        const types = toArray(nodeType).map((t) => String(t).toLowerCase())
        if (types.includes('jobposting')) {
          return item
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  return null
}

function extractLocationFromJsonLd(jobPosting: Record<string, unknown>): string {
  const locations = toArray(jobPosting.jobLocation)
  for (const loc of locations) {
    if (!loc || typeof loc !== 'object') continue
    const address = (loc as Record<string, unknown>).address
    if (!address || typeof address !== 'object') continue
    const addr = address as Record<string, unknown>
    const locality = cleanText(String(addr.addressLocality || ''))
    const region = cleanText(String(addr.addressRegion || ''))
    const country = cleanText(String(addr.addressCountry || ''))
    const parts = [locality, region, country].filter(Boolean)
    if (parts.length > 0) {
      return parts.join(', ')
    }
  }

  const remoteType = cleanText(String(jobPosting.jobLocationType || ''))
  if (remoteType) return remoteType

  return ''
}

function extractSalaryFromJsonLd(jobPosting: Record<string, unknown>): {
  min?: number
  max?: number
} {
  const baseSalary = jobPosting.baseSalary
  if (!baseSalary || typeof baseSalary !== 'object') {
    return {}
  }

  const salaryObj = baseSalary as Record<string, unknown>
  const value = salaryObj.value

  if (typeof value === 'number' || typeof value === 'string') {
    const single = parseSalaryValue(value)
    return single ? { min: single, max: single } : {}
  }

  if (!value || typeof value !== 'object') {
    return {}
  }

  const valueObj = value as Record<string, unknown>
  return {
    min: parseSalaryValue(valueObj.minValue),
    max: parseSalaryValue(valueObj.maxValue),
  }
}

function extractAutofill(url: URL, html: string): AutofillResponse {
  const warnings: string[] = []
  const confidence: Record<string, number> = {}
  const values: AutofillResponse['values'] = {
    url: url.toString(),
    source: inferSourceFromHost(url.hostname),
  }
  confidence.url = 1
  confidence.source = 0.9

  const jsonLd = extractJobPostingFromJsonLd(html)

  if (jsonLd) {
    const title = cleanText(String(jsonLd.title || ''))
    const company =
      cleanText(
        String(
          (jsonLd.hiringOrganization as Record<string, unknown> | undefined)?.name ||
            ''
        )
      ) || ''

    const location = extractLocationFromJsonLd(jsonLd)
    const salary = extractSalaryFromJsonLd(jsonLd)

    if (title) {
      values.role = title
      confidence.role = 0.95
    }
    if (company) {
      values.company = company
      confidence.company = 0.95
    }
    if (location) {
      values.location = location
      confidence.location = 0.9
    }
    if (salary.min !== undefined) {
      values.salary_min = salary.min
      confidence.salary_min = 0.9
    }
    if (salary.max !== undefined) {
      values.salary_max = salary.max
      confidence.salary_max = 0.9
    }
  }

  const ogTitle = extractMetaTag(html, 'og:title')
  const twTitle = extractMetaTag(html, 'twitter:title')
  const pageTitle = extractTitle(html)

  if (!values.role) {
    const roleCandidate = titleToRole(ogTitle || twTitle || pageTitle)
    if (roleCandidate) {
      values.role = roleCandidate
      confidence.role = ogTitle || twTitle ? 0.7 : 0.55
    }
  }

  if (!values.company) {
    const ogSiteName = extractMetaTag(html, 'og:site_name')
    if (ogSiteName) {
      values.company = ogSiteName
      confidence.company = 0.6
    }
  }

  if (!values.location) {
    const locality = extractMetaTag(html, 'job:location') || extractMetaTag(html, 'geo.placename')
    if (locality) {
      values.location = locality
      confidence.location = 0.5
    }
  }

  if (!values.company) warnings.push('Could not confidently detect company. Please fill manually.')
  if (!values.role) warnings.push('Could not confidently detect role title. Please fill manually.')
  if (values.salary_min === undefined && values.salary_max === undefined) {
    warnings.push('Salary was not found in page metadata.')
  }

  return { values, confidence, warnings }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let body: AutofillRequest
  try {
    body = (await req.json()) as AutofillRequest
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const rawUrl = (body.url || '').trim()
  if (!rawUrl) {
    return jsonResponse({ error: 'URL is required' }, 400)
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(rawUrl)
  } catch {
    return jsonResponse({ error: 'Invalid URL format' }, 400)
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return jsonResponse({ error: 'URL must start with http:// or https://' }, 400)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(targetUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobTrackerAutofill/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof DOMException && err.name === 'AbortError') {
      return jsonResponse({ error: 'Timed out while fetching job page' }, 504)
    }
    return jsonResponse({ error: 'Could not fetch this URL' }, 422)
  }

  clearTimeout(timer)

  if (!response.ok) {
    return jsonResponse({ error: `Could not fetch page (status ${response.status})` }, 422)
  }

  const html = await response.text()
  if (!html || html.length > MAX_HTML_BYTES) {
    return jsonResponse({ error: 'Page content is too large or empty' }, 422)
  }

  const result = extractAutofill(new URL(response.url || targetUrl.toString()), html)
  return jsonResponse(result, 200)
})
