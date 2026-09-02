/**
 * Validation and normalisation for the two credentials this app accepts.
 *
 * Pure and tested, and deliberately shared by every surface that touches an
 * email or a password, so /login, /signup and anything later cannot disagree
 * about what a valid credential is. A rule enforced in one form and not the
 * next is not a rule.
 *
 * NONE OF THIS IS A SECURITY BOUNDARY. Supabase validates and stores
 * credentials; these checks exist so a person is told what is wrong before a
 * round trip, and so the app stops generating requests that were always going
 * to fail. The boundary is the auth server and its own rate limits.
 */

/** The longest local-part + domain we will accept, per RFC 5321's 254 limit. */
const MAX_EMAIL_LENGTH = 254

/**
 * Passwords are capped as well as floored. bcrypt -- which Supabase uses --
 * silently truncates at 72 BYTES, so a longer password is not stronger, and
 * accepting one lets a person believe in protection they do not have.
 */
export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 72

/**
 * Normalises an email for submission and comparison.
 *
 * Trims, strips surrounding whitespace, and LOWERCASES. The domain half is
 * case-insensitive by RFC; the local part is technically case-sensitive but
 * no mainstream provider treats it that way, and Supabase itself lowercases
 * on store.
 *
 * This is the fix for a real duplicate-account vector rather than a cosmetic
 * tidy: without it `Gabe@example.com`, `gabe@example.com` and ` GABE@example.com `
 * are three sign-up attempts, and a script that walks the case permutations of
 * one address can create a great many rows that all belong to the same person.
 * Normalising at the edge means the database sees one identity.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

/**
 * Whether an email is plausibly deliverable.
 *
 * Deliberately not an RFC-complete grammar -- that pattern is famously
 * unreadable and still cannot tell you whether an address exists. This rejects
 * the shapes that are certainly wrong (no @, no domain dot, spaces, a leading
 * or trailing dot, consecutive dots) and lets the confirmation email be the
 * real test of whether anyone is there.
 */
export function isValidEmail(raw: string): boolean {
  const email = normalizeEmail(raw)
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return false
  if (/\s/.test(email)) return false

  const parts = email.split('@')
  if (parts.length !== 2) return false
  const [local, domain] = parts

  if (!local || !domain) return false
  if (local.length > 64) return false
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false
  if (!domain.includes('.')) return false

  // Per LABEL, not per domain. A hyphen is illegal at the edge of each
  // dot-separated label, and checking only the whole string misses
  // `example-.com` -- which ends in "m", not in a hyphen.
  for (const label of domain.split('.')) {
    if (!label) return false
    if (label.startsWith('-') || label.endsWith('-')) return false
    if (label.length > 63) return false
  }

  const tld = domain.slice(domain.lastIndexOf('.') + 1)
  if (tld.length < 2 || !/^[a-z]+$/.test(tld)) return false

  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) && /^[a-z0-9.-]+$/.test(domain)
}

export interface PasswordRequirement {
  id: string
  label: string
  met: boolean
}

/**
 * The password rules, as a list a form can render and tick off live.
 *
 * Returned as data rather than a boolean so the UI can show WHICH rule is
 * still unmet. A form that says only "password too weak" makes the person
 * guess, and guessing at a password field is how people end up with
 * `Password1!` -- the shape that satisfies every naive checker and appears in
 * every breach corpus.
 *
 * Length first and weighted heaviest, because it is the rule that actually
 * costs an attacker anything; character-class rules mostly shape a password
 * into a predictable pattern. Ten is the floor rather than eight: eight is
 * within range of commodity offline cracking against a stolen hash.
 */
export function passwordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      id: 'length',
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: 'lowercase',
      label: 'A lowercase letter',
      met: /[a-z]/.test(password),
    },
    {
      id: 'uppercase',
      label: 'An uppercase letter',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'number',
      label: 'A number',
      met: /\d/.test(password),
    },
    {
      id: 'symbol',
      label: 'A symbol, such as ! ? or #',
      met: /[^A-Za-z0-9]/.test(password),
    },
    {
      id: 'nospaces',
      label: 'No leading or trailing spaces',
      // A pasted password with a trailing space is a support ticket: it is
      // stored as typed and then never matches what the person types next time.
      met: password.length > 0 && password === password.trim(),
    },
  ]
}

export function isPasswordStrong(password: string): boolean {
  if (password.length > PASSWORD_MAX_LENGTH) return false
  return passwordRequirements(password).every((r) => r.met)
}

/** 0..1, for a strength meter. Every rule counts the same; length gates entry. */
export function passwordScore(password: string): number {
  const reqs = passwordRequirements(password)
  return reqs.filter((r) => r.met).length / reqs.length
}
