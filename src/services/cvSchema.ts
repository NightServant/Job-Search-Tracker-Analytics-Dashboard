// Shape follows the JSON Resume standard so themes and tooling interoperate.
export interface CvBasics {
  name: string
  label: string
  email: string
  phone: string
  location: string
  summary: string
}

export interface CvWork {
  company: string
  position: string
  location: string
  startDate: string
  endDate: string | null
  highlights: string[]
}

export interface CvEducation {
  institution: string
  studyType: string
  area: string
  location: string
  startDate: string
  endDate: string | null
  highlights: string[]
}

export interface CvDocument {
  basics: CvBasics
  work: CvWork[]
  education: CvEducation[]
  skills: string[]
  projects: string[]
  awards: string[]
}

export function emptyCvDocument(): CvDocument {
  return {
    basics: { name: '', label: '', email: '', phone: '', location: '', summary: '' },
    work: [],
    education: [],
    skills: [],
    projects: [],
    awards: [],
  }
}

/**
 * Structural check for a value read out of resumes.sections.
 *
 * The column is JSONB and nullable, so anything can be in it — legacy rows,
 * a half-written draft, hand-edited data. This guards the shape the editor and
 * renderer assume, not the correctness of the content inside it.
 */
export function isValidCvDocument(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const doc = value as Record<string, unknown>
  if (typeof doc.basics !== 'object' || doc.basics === null) return false
  for (const key of ['work', 'education', 'skills', 'projects', 'awards']) {
    if (!Array.isArray(doc[key])) return false
  }
  return true
}
