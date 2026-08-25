// Mirrors user_preferences_currency_check and jobs_salary_currency_check.
export const SUPPORTED_CURRENCIES = ['PHP','USD','EUR','GBP','SGD','AUD'] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

export interface UserPreferences {
  user_id: string
  default_currency: string
  created_at: string
  updated_at: string
}

export function isSupportedCurrency(code: string): boolean {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code)
}

/**
 * The currency a new application should start in.
 *
 * Returns PHP for a user with no preferences row, since the row is created
 * lazily on first write and most users will never have one. An unrecognised
 * stored code also falls back rather than throwing: the CHECK constraint should
 * make that impossible, but a value read from the database should not be able
 * to break the form that renders it.
 */
export function resolveDefaultCurrency(
  prefs: Pick<UserPreferences, 'default_currency'> | null
): SupportedCurrency {
  if (prefs === null) return 'PHP'
  return isSupportedCurrency(prefs.default_currency)
    ? (prefs.default_currency as SupportedCurrency)
    : 'PHP'
}
