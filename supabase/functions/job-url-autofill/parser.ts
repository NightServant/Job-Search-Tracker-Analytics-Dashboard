export interface AutofillValues {
  company?: string
  role?: string
  location?: string
  source?: string
  salary_min?: number
  salary_max?: number
  url?: string
}

export interface AutofillResponse {
  values: AutofillValues
  confidence: Record<string, number>
  warnings: string[]
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

function extractSalaryRangeFromText(text: string): { min?: number; max?: number } {
  const normalized = text.replace(/\s+/g, ' ')
  const rangePattern = /\$\s?([\d,]{2,})(?:\.\d+)?\s*(?:-|to|–|—)\s*\$\s?([\d,]{2,})(?:\.\d+)?/i
  const range = normalized.match(rangePattern)
  if (range) {
    const min = Number(range[1].replace(/,/g, ''))
    const max = Number(range[2].replace(/,/g, ''))
    return {
      min: Number.isFinite(min) ? min : undefined,
      max: Number.isFinite(max) ? max : undefined,
    }
  }

  return {}
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

function applyLinkedInHeuristics(url: URL, html: string, values: AutofillValues, confidence: Record<string, number>) {
  const ogTitle = extractMetaTag(html, 'og:title')
  const ogDescription = extractMetaTag(html, 'og:description')

  if (!values.role && ogTitle) {
    values.role = titleToRole(ogTitle.replace(/\s*\|\s*LinkedIn.*$/i, ''))
    confidence.role = 0.75
  }

  if (!values.company && ogDescription) {
    const match = ogDescription.match(/\bat\s+([^\.\,\-\|]+)/i)
    const company = cleanText(match?.[1] || '')
    if (company) {
      values.company = company
      confidence.company = 0.65
    }
  }

  values.source = 'LinkedIn'
  confidence.source = 1

  if (!values.url) {
    values.url = url.toString()
    confidence.url = 1
  }
}

function applyGreenhouseHeuristics(url: URL, html: string, values: AutofillValues, confidence: Record<string, number>) {
  const parts = url.pathname.split('/').filter(Boolean)
  const ogTitle = extractMetaTag(html, 'og:title')

  if (!values.company && parts.length > 0) {
    values.company = cleanText(parts[0].replace(/[-_]/g, ' '))
    confidence.company = 0.7
  }

  if (!values.role && ogTitle) {
    values.role = titleToRole(ogTitle)
    confidence.role = 0.8
  }

  values.source = 'Greenhouse'
  confidence.source = 1
}

function applyLeverHeuristics(url: URL, html: string, values: AutofillValues, confidence: Record<string, number>) {
  const parts = url.pathname.split('/').filter(Boolean)
  const ogTitle = extractMetaTag(html, 'og:title')

  if (!values.company && parts.length > 0) {
    values.company = cleanText(parts[0].replace(/[-_]/g, ' '))
    confidence.company = 0.75
  }

  if (!values.role && ogTitle) {
    values.role = titleToRole(ogTitle)
    confidence.role = 0.8
  }

  values.source = 'Lever'
  confidence.source = 1
}

function applyWorkdayHeuristics(url: URL, html: string, values: AutofillValues, confidence: Record<string, number>) {
  const parts = url.pathname.split('/').filter(Boolean)
  const title = extractTitle(html)

  if (!values.company && parts.length >= 2) {
    const idx = parts.findIndex((p) => /^en[-_]?[A-Z]{2,}/i.test(p))
    const companyCandidate = idx >= 0 ? parts[idx + 1] : parts[1]
    if (companyCandidate) {
      values.company = cleanText(companyCandidate.replace(/[-_]/g, ' '))
      confidence.company = 0.7
    }
  }

  if (!values.role && title) {
    values.role = titleToRole(title)
    confidence.role = 0.65
  }

  values.source = 'Workday'
  confidence.source = 1
}

export function extractAutofill(url: URL, html: string): AutofillResponse {
  const warnings: string[] = []
  const confidence: Record<string, number> = {}
  const values: AutofillValues = {
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

  const host = url.hostname.toLowerCase()
  if (host.includes('linkedin.com')) {
    applyLinkedInHeuristics(url, html, values, confidence)
  } else if (host.includes('greenhouse.io')) {
    applyGreenhouseHeuristics(url, html, values, confidence)
  } else if (host.includes('lever.co')) {
    applyLeverHeuristics(url, html, values, confidence)
  } else if (host.includes('myworkdayjobs.com') || host.includes('workday.com')) {
    applyWorkdayHeuristics(url, html, values, confidence)
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

  if (values.salary_min === undefined && values.salary_max === undefined) {
    const salaryFromText = extractSalaryRangeFromText(html)
    if (salaryFromText.min !== undefined) {
      values.salary_min = salaryFromText.min
      confidence.salary_min = 0.45
    }
    if (salaryFromText.max !== undefined) {
      values.salary_max = salaryFromText.max
      confidence.salary_max = 0.45
    }
  }

  if (!values.company) warnings.push('Could not confidently detect company. Please fill manually.')
  if (!values.role) warnings.push('Could not confidently detect role title. Please fill manually.')
  if (values.salary_min === undefined && values.salary_max === undefined) {
    warnings.push('Salary was not found in page metadata.')
  }

  return { values, confidence, warnings }
}
