import { describe, it, expect } from 'vitest'
import { resolveDefaultCurrency, isSupportedCurrency } from '../userPreferences'

describe('resolveDefaultCurrency', () => {
  it('returns the stored preference when one exists', () => {
    expect(resolveDefaultCurrency({ default_currency: 'SGD' })).toBe('SGD')
  })

  it('falls back to PHP when the user has no preferences row', () => {
    expect(resolveDefaultCurrency(null)).toBe('PHP')
  })

  it('falls back to PHP when the stored code is not supported', () => {
    expect(resolveDefaultCurrency({ default_currency: 'XYZ' })).toBe('PHP')
  })
})

describe('isSupportedCurrency', () => {
  it('accepts every code the database CHECK allows', () => {
    for (const c of ['PHP','USD','EUR','GBP','SGD','AUD']) {
      expect(isSupportedCurrency(c)).toBe(true)
    }
  })
})
