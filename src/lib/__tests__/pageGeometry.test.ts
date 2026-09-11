import { describe, it, expect } from 'vitest'
import {
  DEFAULT_GEOMETRY,
  normalizeGeometry,
  readPageGeometry,
  textColumnInches,
} from '../pageGeometry'

/** Lifted verbatim from Gabe's own CV, which is the document that reported this. */
const REAL_SECTPR =
  '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>' +
  '<w:pgMar w:top="504" w:right="936" w:bottom="504" w:left="936" ' +
  'w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'

describe('readPageGeometry', () => {
  it('reads the real CV that reported the bug', () => {
    const g = readPageGeometry(REAL_SECTPR)
    expect(g.width).toBe(8.5)
    expect(g.height).toBe(11)
    expect(g.margin.top).toBeCloseTo(0.35, 3)
    expect(g.margin.left).toBeCloseTo(0.65, 3)
  })

  it('shows the mismatch that broke the layout', () => {
    // The editor hard-coded 0.8in on every side. On this document that is a
    // 6.9in text column against the 7.2in it was written for, so every
    // paragraph wraps earlier and the document grows.
    const real = textColumnInches(readPageGeometry(REAL_SECTPR))
    const hardCoded = 8.5 - 0.8 * 2
    expect(real).toBeCloseTo(7.2, 3)
    expect(hardCoded).toBeCloseTo(6.9, 3)
    expect(real).toBeGreaterThan(hardCoded)
  })

  it('falls back to the editor\'s own sheet when there is no sectPr', () => {
    // Deliberately 0.8in and not Word's 1in: every CV already in the database
    // was written against this sheet, and switching the fallback would
    // re-margin all of them on their next open.
    expect(readPageGeometry('<w:body><w:p/></w:body>')).toEqual(DEFAULT_GEOMETRY)
    expect(DEFAULT_GEOMETRY.margin.top).toBe(0.8)
  })

  it('takes the LAST sectPr, which carries the body setup', () => {
    const two =
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>' + REAL_SECTPR
    expect(readPageGeometry(two).width).toBe(8.5)
  })

  it('reads A4 as well as Letter', () => {
    const a4 = '<w:pgSz w:w="11906" w:h="16838"/>'
    const g = readPageGeometry(a4)
    expect(g.width).toBeCloseTo(8.27, 1)
    expect(g.height).toBeCloseTo(11.69, 1)
  })

  it('clamps a negative margin, which OOXML allows and CSS cannot use', () => {
    // Word uses negative margins for headers that bleed into the body.
    const g = readPageGeometry('<w:pgMar w:top="-720" w:left="936"/>')
    expect(g.margin.top).toBe(0)
    expect(g.margin.left).toBeCloseTo(0.65, 3)
  })

  it('survives a malformed tag rather than throwing', () => {
    for (const xml of ['<w:pgSz>', '<w:pgSz w:w="abc" w:h=""/>', '']) {
      expect(() => readPageGeometry(xml)).not.toThrow()
    }
    expect(readPageGeometry('<w:pgSz w:w="abc"/>').width).toBe(DEFAULT_GEOMETRY.width)
  })
})

describe('normalizeGeometry', () => {
  it('passes a good geometry through', () => {
    const g = readPageGeometry(REAL_SECTPR)
    expect(normalizeGeometry(g)).toEqual(g)
  })

  it('replaces anything unusable with the default', () => {
    for (const bad of [null, undefined, 'letter', 42, {}, { width: 0, height: 11, margin: {} }]) {
      expect(normalizeGeometry(bad), String(bad)).toEqual(DEFAULT_GEOMETRY)
    }
  })

  it('fills in a missing side rather than rejecting the whole page', () => {
    const partial = { width: 8.5, height: 11, margin: { top: 0.5 } }
    const g = normalizeGeometry(partial)
    expect(g.margin.top).toBe(0.5)
    expect(g.margin.left).toBe(DEFAULT_GEOMETRY.margin.left)
  })
})
