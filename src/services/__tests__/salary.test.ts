import { describe, it, expect } from 'vitest'
import { formatSalaryRange } from '../salary'

describe('formatSalaryRange', () => {
  it('formats a PHP range with the peso sign', () => {
    expect(formatSalaryRange(90000, 120000, 'PHP')).toBe('₱90,000–₱120,000')
  })

  it('formats a USD range with the dollar sign', () => {
    expect(formatSalaryRange(90000, 120000, 'USD')).toBe('$90,000–$120,000')
  })

  it('returns a single value when min equals max', () => {
    expect(formatSalaryRange(90000, 90000, 'PHP')).toBe('₱90,000')
  })

  it('returns an em-free placeholder when both bounds are null', () => {
    expect(formatSalaryRange(null, null, 'PHP')).toBe('not specified')
  })

  it('formats an open-ended range when only min is present', () => {
    expect(formatSalaryRange(90000, null, 'PHP')).toBe('₱90,000+')
  })
})
