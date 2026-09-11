import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import JSZip from 'jszip'
import { readPageGeometry, readTypography, textColumnInches } from '../pageGeometry'
import { sectionsFrom } from '@/services/integrations/docxExport'

/**
 * Driven by a real Word export rather than a hand-written fixture, because the
 * bug was in what Word actually puts in a package -- tight `pgMar` values and
 * no manual page break at all -- which a sample written to pass would not have
 * reproduced.
 *
 * THE PATH COMES FROM AN ENV VAR AND THE TEST SKIPS WITHOUT IT. The document
 * that reported this is a personal CV living outside the repo, and a CV does
 * not belong in version control; hard-coding its path would also publish one
 * machine's directory layout in a public repository and make the test
 * unrunnable for anyone else. Point `WORKTRACK_TEST_DOCX` at any .docx to run
 * these three against it:
 *
 *   WORKTRACK_TEST_DOCX=/path/to/cv.docx npx vitest run realDocxImport
 *
 * The page-size cases below need no file and always run.
 */
const FILE = process.env.WORKTRACK_TEST_DOCX
const present = !!FILE && existsSync(FILE)

describe.skipIf(!present)('a real .docx from Word', () => {
  const load = async () => {
    const zip = await JSZip.loadAsync(readFileSync(FILE!))
    return (await zip.file('word/document.xml')!.async('string'))
  }

  it('reads a real page setup rather than assuming the editor default', async () => {
    const g = readPageGeometry(await load())
    expect(g.width).toBeGreaterThan(0)
    expect(g.height).toBeGreaterThan(0)
    // The reported document declared 0.35in top and 0.65in sides, against the
    // editor's hard-coded 0.8in. Asserted as "read something real" so any
    // .docx can drive this, not only that one.
    expect(Number.isFinite(g.margin.top)).toBe(true)
    expect(Number.isFinite(g.margin.left)).toBe(true)
  })

  it('yields a usable text column', async () => {
    // On the reported CV this was 7.2in written against 6.9in rendered: every
    // paragraph wrapped early, so the document grew and stopped matching Word.
    const column = textColumnInches(readPageGeometry(await load()))
    expect(column).toBeGreaterThan(0)
    expect(column).toBeLessThan(readPageGeometry(await load()).width)
  })

  it('reads the type the document is actually set in', async () => {
    // The half of the bug that survived fixing the margins: mammoth drops
    // every run property, so the CV rendered in the editor's stylesheet
    // instead of its author's face. On the reported file this is Garamond
    // 11pt against sans-serif 15px.
    const zip = await JSZip.loadAsync(readFileSync(FILE!))
    const documentXml = await zip.file('word/document.xml')!.async('string')
    const stylesXml = (await zip.file('word/styles.xml')?.async('string')) ?? ''
    const t = readTypography(documentXml, stylesXml)

    expect(t.fontFamily).toBeTruthy()
    expect(t.fontSize).toBeGreaterThan(5)
    expect(t.fontSize).toBeLessThan(30)
    // Whatever the face is, it must come from the RUNS. On this file
    // docDefaults says Times New Roman and no run uses it.
    const runFaces = [...documentXml.matchAll(/<w:rFonts\b[^>]*w:ascii="([^"]+)"/g)].map((m) => m[1])
    expect(runFaces.length).toBeGreaterThan(0)
    expect(t.fontFamily).toContain(runFaces[0])
  })

  it('exports back at its own page, not at the editor default', async () => {
    const geometry = readPageGeometry(await load())
    const [section] = sectionsFrom({ type: 'doc', attrs: { pageGeometry: geometry }, content: [] })
    const page = section.properties!.page!
    // Round-tripped through twips and back to the same numbers the file
    // declares -- which is the half of the bug that would otherwise have
    // re-margined the document on the way OUT.
    expect(page.margin).toMatchObject({
      top: Math.round(geometry.margin.top * 1440),
      left: Math.round(geometry.margin.left * 1440),
    })
    expect(page.size).toMatchObject({
      width: Math.round(geometry.width * 1440),
      height: Math.round(geometry.height * 1440),
    })
  })
})

describe('the editor adapts to other page sizes', () => {
  // Gabe: "make sure that the editor adapts different page sizes".
  const cases = [
    { name: 'A4', xml: '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>', w: 8.27, h: 11.69 },
    { name: 'Legal', xml: '<w:pgSz w:w="12240" w:h="20160"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>', w: 8.5, h: 14 },
    { name: 'A5', xml: '<w:pgSz w:w="8391" w:h="11906"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>', w: 5.83, h: 8.27 },
    { name: 'Letter landscape', xml: '<w:pgSz w:w="15840" w:h="12240"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>', w: 11, h: 8.5 },
  ]

  it.each(cases)('reads $name at the right size', ({ xml, w, h }) => {
    const g = readPageGeometry(xml)
    expect(g.width).toBeCloseTo(w, 1)
    expect(g.height).toBeCloseTo(h, 1)
  })

  it.each(cases)('exports $name back at the same size', ({ xml }) => {
    const geometry = readPageGeometry(xml)
    const [section] = sectionsFrom({ type: 'doc', attrs: { pageGeometry: geometry }, content: [] })
    const size = section.properties!.page!.size!
    expect(size.width).toBe(Math.round(geometry.width * 1440))
    expect(size.height).toBe(Math.round(geometry.height * 1440))
  })

  it('derives a typing area that follows the page, not a fixed 9.4in', () => {
    // The old hard-code was 11in minus 0.8in margins. On A4 that is wrong by
    // a third of an inch and on Legal by three.
    const body = (xml: string) => {
      const g = readPageGeometry(xml)
      return g.height - g.margin.top - g.margin.bottom
    }
    expect(body(cases[0].xml)).toBeCloseTo(9.69, 1) // A4 at 1in
    expect(body(cases[1].xml)).toBeCloseTo(12, 1)   // Legal at 1in
    expect(body(cases[1].xml)).not.toBeCloseTo(9.4, 1)
  })
})
