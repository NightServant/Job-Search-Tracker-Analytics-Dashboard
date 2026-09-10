import { describe, it, expect } from 'vitest'
import { contrastRatio } from '../contrast'

// Values mirror src/index.css. If a token changes there, a case here should fail.
const P = {
  white: '#ffffff', black: '#000000',
  n300: '#d4d4d8', n600: '#52525b', n700: '#3f3f46', n900: '#18181b',
  a400: '#fb923c', a500: '#f97316', a700: '#c2410c',
  applied: '#2563eb', interviewing: '#6d28d9', offer: '#059669', rejected: '#dc2626',
  wishlist: '#71717a',
  // The warm dark ramp, 2026-09-09 -- `.dark` now points its semantic layer
  // at these instead of at neutral-*, so every dark-mode case below moved
  // off n50/n300/n400/n950 onto their ink equivalents.
  ink50: '#faf7f4', ink300: '#d6cec5', ink400: '#a89e94', ink600: '#5c5148', ink950: '#17120e',
  // The ATS ring's own verdict colours. pass/fail alias the status solids;
  // review is its own hex; track is the missing arc.
  verdictPassLight: '#059669', verdictReviewLight: '#b45309', verdictFailLight: '#dc2626',
  verdictTrackLight: '#d4d4d8',
  verdictPassDark: '#34d399', verdictReviewDark: '#fbbf24', verdictFailDark: '#f87171',
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
    // bg-canvas in .dark is ink-950 now, not neutral-950.
    expect(contrastRatio(P.a400, P.ink950)).toBeGreaterThanOrEqual(AA)
  })
})

describe('contrast — semantic text pairs', () => {
  it.each([
    ['text/primary on canvas (light)', P.n900, P.white],
    ['text/secondary on canvas (light)', P.n700, P.white],
    ['text/muted on canvas (light)', P.n600, P.white],
    // Dark mode ran on zinc before 2026-09-09; these three rows are the ink
    // ramp .dark now points at instead.
    ['text/primary on canvas (dark)', P.ink50, P.ink950],
    ['text/secondary on canvas (dark)', P.ink300, P.ink950],
    ['text/muted on canvas (dark)', P.ink400, P.ink950],
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

describe('contrast — verdict colours (the ATS ring)', () => {
  // pass/review/fail are marks on a ring stroke, not text -- read at the same
  // >=3 floor the five status marks use above, not full text AA.
  it.each([
    ['pass', P.verdictPassLight],
    ['review', P.verdictReviewLight],
    ['fail', P.verdictFailLight],
  ])('%s reads on the light canvas', (_v, hex) => {
    expect(contrastRatio(hex, P.white)).toBeGreaterThanOrEqual(3)
  })

  it.each([
    ['pass', P.verdictPassDark],
    ['review', P.verdictReviewDark],
    ['fail', P.verdictFailDark],
  ])('%s reads on the dark canvas', (_v, hex) => {
    expect(contrastRatio(hex, P.ink950)).toBeGreaterThanOrEqual(3)
  })

  // The track is the MISSING arc, not a signal, and stays deliberately quiet
  // -- but it replaced border-subtle (#e4e4e7, 1.27:1 on white), which
  // index.css's own docblock calls "effectively invisible". Pinned against
  // that number, not an AA floor neither the old nor the new value clears.
  it('keeps the track more visible on its canvas than the border-subtle value it replaced', () => {
    expect(contrastRatio(P.verdictTrackLight, P.white)).toBeGreaterThan(1.27)
  })
})
