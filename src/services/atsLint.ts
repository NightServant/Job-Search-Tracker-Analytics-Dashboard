import type { CvDocument } from './cvSchema'

export type AtsVerdict = 'pass' | 'review' | 'fail'

export interface AtsLintResult {
  verdict: AtsVerdict
  reasons: string[]
}

/** Deliberately permissive. Rejecting a deliverable address is worse than accepting an odd one. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Checks a CV for the things that stop an applicant tracking system, or the
 * person reading its output, from doing anything useful with it.
 *
 * Three verdicts rather than a score, because a score invites polishing the
 * number. `fail` means the CV cannot be processed; `review` means it will be
 * processed but will read weakly; `pass` means neither.
 *
 * This checks structure, not prose. Whether a bullet is well written is a
 * judgement no linter should pretend to make.
 */
export function lintForAts(doc: CvDocument): AtsLintResult {
  const blocking: string[] = []
  const advisory: string[] = []

  // Blocking: an ATS indexes on these. Without them the record is unroutable.
  if (!doc.basics.name.trim()) {
    blocking.push('No name. An ATS files candidates by name and cannot index this record.')
  }
  if (!doc.basics.email.trim()) {
    blocking.push('No email. There is no way for an automated reply to reach you.')
  } else if (!EMAIL.test(doc.basics.email.trim())) {
    blocking.push(`Email "${doc.basics.email}" is not a valid address.`)
  }
  if (doc.work.length === 0) {
    blocking.push('No work history. Most ATS filters score on experience and will rank this last.')
  }

  // Advisory: parses fine, but loses to a stronger CV in the same pile.
  if (!doc.basics.summary.trim()) {
    advisory.push('No summary. This is the first text a screener reads and the densest place for keywords.')
  }
  if (doc.skills.length === 0) {
    advisory.push('No skills listed. Keyword matching leans heavily on this section.')
  }
  for (const role of doc.work) {
    const where = role.company.trim() || 'an unnamed role'
    if (role.highlights.length === 0) {
      advisory.push(`${where} has no bullet points, so there is nothing for a keyword match to find.`)
    }
    if (!role.startDate.trim()) {
      advisory.push(`${where} has no start date, so tenure cannot be calculated.`)
    }
  }

  if (blocking.length > 0) {
    return { verdict: 'fail', reasons: [...blocking, ...advisory] }
  }
  if (advisory.length > 0) {
    return { verdict: 'review', reasons: advisory }
  }
  return { verdict: 'pass', reasons: [] }
}
