import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { contrastRatio } from '../contrast'

/**
 * THE PRIMITIVES ARE READ OUT OF `src/index.css`, NOT RETYPED HERE.
 *
 * This block used to be a hand-copied list under a comment promising "values
 * mirror src/index.css -- if a token changes there, a case here should fail".
 * That promise had no mechanism behind it: changing a hex in the stylesheet
 * left every case here passing against the OLD colour, so the suite reported
 * on a palette the app had stopped using. It went stale exactly that way when
 * the dark ramp was rebuilt in navy on 2026-09-14.
 *
 * Parsing the stylesheet is what makes the comment true. A renamed or deleted
 * token now throws by name instead of quietly testing a ghost.
 */
// `process.cwd()`, not `import.meta.url`: these suites run in jsdom, where
// the module URL is an http:// one and `fileURLToPath` rejects it. Vitest
// roots at the project directory, which is what makes the relative path stable.
const CSS = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

/** One `--color-<name>: #hex;` declaration, wherever it sits in the file. */
function token(name: string): string {
  const match = CSS.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`))
  if (!match) throw new Error(`src/index.css defines no --color-${name}`)
  return match[1]
}

const P = {
  white: token('base-white'), black: token('base-black'),
  n300: token('neutral-300'), n600: token('neutral-600'),
  n700: token('neutral-700'), n900: token('neutral-900'),
  a400: token('accent-400'), a500: token('accent-500'), a700: token('accent-700'),
  applied: token('status-applied-solid'), interviewing: token('status-interviewing-solid'),
  offer: token('status-offer-solid'), rejected: token('status-rejected-solid'),
  wishlist: token('status-wishlist-solid'),
  // The dark ramp `.dark` points its semantic layer at -- warm charcoal from
  // 2026-09-09, navy from 2026-09-14. Read by name, so a third rebuild needs
  // no edit here and still gets checked.
  ink50: token('ink-50'), ink300: token('ink-300'), ink400: token('ink-400'),
  ink600: token('ink-600'), ink950: token('ink-950'),
  // The ATS ring's own verdict colours. pass/fail alias the status solids in
  // light and are their own hexes in dark; review is its own hex in both.
  verdictPassLight: token('status-offer-solid'),
  verdictReviewLight: token('verdict-review'),
  verdictFailLight: token('status-rejected-solid'),
  verdictTrackLight: token('neutral-300'),
  // These four live in the `.dark` block, which redefines the same names --
  // the regex takes the FIRST match, so they are named literally. They are the
  // only four values in this file that are not read back out of the sheet.
  verdictPassDark: '#34d399', verdictReviewDark: '#fbbf24', verdictFailDark: '#f87171',
  // The two accent BANDS -- a field of colour wide enough to carry text,
  // rather than a mark. Light pairs accent-100 with accent-800; dark pairs
  // accent-950 with accent-200. Read as primitives because both themes define
  // `--color-accent-surface` and the lookup takes the first match.
  accent100: token('accent-100'), accent200: token('accent-200'),
  accent800: token('accent-800'), accent950: token('accent-950'),
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

describe('contrast — the accent band', () => {
  /**
   * `accent-surface` is the one token that is a FIELD rather than a mark: the
   * dashboard's table header, the settings profile band. Text sits on it, so
   * unlike the status and verdict marks it is held to full text AA.
   *
   * The dark half is here because it changed on 2026-09-14 and nothing was
   * watching it. `accent-900` had been the dark band since the token existed;
   * when the ground went from warm charcoal to navy it read as a slab, and the
   * replacement (`accent-950`) was picked by eye in the running app. A value
   * picked by eye is exactly the kind that needs a number behind it.
   */
  it.each([
    ['light: accent-800 on accent-100', P.accent800, P.accent100],
    ['dark: accent-200 on accent-950', P.accent200, P.accent950],
  ])('%s clears AA', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA)
  })
})
