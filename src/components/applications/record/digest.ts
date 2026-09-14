import type { JobFormData } from '@/types'

/**
 * What `/api/posting/digest` resolves to, as the browser sees it.
 *
 * It lived on `ApplicationForm`, which no longer exists. Three surfaces import
 * it now -- the record's description column, the add wizard, and the route
 * that owns the mutation -- so it belongs in a module none of them owns.
 */
export interface PostingDigestResult {
  /** The deterministic tidy of the scrape, and the evidence `description` was checked against. */
  formatted: string
  /** The posting restructured under headings; `formatted` when that could not be verified. */
  description: string
  fields: Partial<JobFormData> & { tech_stack?: string[] }
  usedModel: boolean
  dropped: string[]
}
