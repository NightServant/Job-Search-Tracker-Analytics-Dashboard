const SYMBOLS: Record<string, string> = {
  PHP: '₱', USD: '$', EUR: '€', GBP: '£', SGD: 'S$', AUD: 'A$',
}

function money(value: number, currency: string): string {
  const symbol = SYMBOLS[currency] ?? ''
  return `${symbol}${value.toLocaleString('en-US')}`
}

/**
 * Renders a salary range in its own currency.
 *
 * Currency is never inferred: a job stores the code it was entered in, so a
 * PHP figure can never be read as USD by anything downstream.
 */
export function formatSalaryRange(
  min: number | null,
  max: number | null,
  currency: string
): string {
  if (min === null && max === null) return 'not specified'
  if (min !== null && max === null) return `${money(min, currency)}+`
  if (min === null && max !== null) return `up to ${money(max, currency)}`
  if (min === max) return money(min as number, currency)
  return `${money(min as number, currency)}–${money(max as number, currency)}`
}
