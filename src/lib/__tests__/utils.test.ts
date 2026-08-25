import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn', () => {
  it('keeps a text colour alongside a custom type-scale size', () => {
    // tailwind-merge reads unknown `text-*` as a colour. Left untaught, it
    // dropped text-accent-on-accent and turned the primary button's label from
    // white to inherited near-black on orange -- well under AA.
    const out = cn('text-accent-on-accent', 'text-body-m')
    expect(out).toContain('text-accent-on-accent')
    expect(out).toContain('text-body-m')
  })

  it('still lets one size displace another', () => {
    expect(cn('text-body-m', 'text-heading-l')).toBe('text-heading-l')
  })

  it('still lets one colour displace another', () => {
    expect(cn('text-text-muted', 'text-text-primary')).toBe('text-text-primary')
  })

  it('resolves ordinary conflicts', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6')
  })
})
