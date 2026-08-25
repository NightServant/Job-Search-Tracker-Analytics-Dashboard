export interface Contact {
  id: string
  user_id: string
  name: string
  email: string | null
  linkedin: string | null
  notes: string | null
}

/**
 * Collapses contacts that share an email address, keeping the first seen.
 *
 * Email is the only reliable identity here — names repeat and are typed
 * inconsistently. Comparison is case-insensitive because addresses arrive from
 * signatures and job boards in whatever case they were written.
 *
 * Contacts without an email are always kept: absence of an identifier is not
 * evidence that two people are the same person.
 */
export function dedupeContactsByEmail(contacts: Contact[]): Contact[] {
  const seen = new Set<string>()
  const result: Contact[] = []
  for (const contact of contacts) {
    if (contact.email === null) {
      result.push(contact)
      continue
    }
    const key = contact.email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(contact)
  }
  return result
}
