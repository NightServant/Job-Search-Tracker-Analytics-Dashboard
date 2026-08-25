import type { Job } from '@/types'

/**
 * True when a job carries usable posting text.
 *
 * Whitespace-only counts as absent: a description saved as blank should not
 * make ATS keyword matching or AI tailoring think it has something to read.
 */
export function hasStoredDescription(job: Pick<Job, 'description'>): boolean {
  return typeof job.description === 'string' && job.description.trim().length > 0
}
