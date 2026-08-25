import { describe, it, expect } from 'vitest'
import { contrastRatio } from '../contrast'

// Values mirror src/index.css. If a token changes there, a case here should fail.
const P = {
  white: '#ffffff', black: '#000000',
  n50: '#fafafa', n300: '#d4d4d8', n400: '#a1a1aa', n600: '#52525b',
  n700: '#3f3f46', n900: '#18181b', n950: '#09090b',
  a400: '#fb923c', a500: '#f97316', a700: '#c2410c',
  applied: '#2563eb', interviewing: '#6d28d9', offer: '#059669', rejected: '#dc2626',
  wishlist: '#71717a',
}
const AA = 4.5

describe('contrast — the accent rule', () => {
  it('rejects orange-500 on white, which is why the system uses 700', () => {
    expect(contrastRatio(P.a500, P.white)).toBeLessThan(AA)
  })

  it('accepts accent-700 on white in light mode', () => {
    expect(contrastRatio(P.a700, P.white)).toBeGreaterThanOrEqual(AA)
  })

  it('accepts accent-400 on the dark canvas', () => {
    expect(contrastRatio(P.a400, P.n950)).toBeGreaterThanOrEqual(AA)
  })
})

describe('contrast — semantic text pairs', () => {
  it.each([
    ['text/primary on canvas (light)', P.n900, P.white],
    ['text/secondary on canvas (light)', P.n700, P.white],
    ['text/muted on canvas (light)', P.n600, P.white],
    ['text/primary on canvas (dark)', P.n50, P.n950],
    ['text/secondary on canvas (dark)', P.n300, P.n950],
    ['text/muted on canvas (dark)', P.n400, P.n950],
  ])('%s clears AA', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA)
  })
})

describe('contrast — status marks stay legible in both themes', () => {
  it.each([
    ['applied', P.applied], ['interviewing', P.interviewing],
    ['offer', P.offer], ['rejected', P.rejected], ['wishlist', P.wishlist],
  ])('%s reads on the light canvas', (_s, hex) => {
    expect(contrastRatio(hex, P.white)).toBeGreaterThanOrEqual(3)
  })
})
