import { describe, it, expect } from 'vitest'
import {
  WORD_TEMPLATES,
  COVER_LETTER_TEMPLATES,
  type ResumeTemplate,
} from '@/services/resumeTemplateService'
import { THUMBNAIL_IDS } from '@/components/documents/TemplateGallery'
import { normalizeGeometry, normalizeTypography } from '@/lib/pageGeometry'
import { buildLatex } from '@/services/integrations/latexExport'

/**
 * The eleven templates are actually different from each other.
 *
 * WHY THIS IS A TEST AND NOT A REVIEW NOTE. Gabe reported it on 2026-09-15 --
 * "CV and Cover Letter templates felt the same" -- and fingerprinting them
 * showed he was describing something literal rather than an impression: not
 * one of the eleven carried `attrs` on its doc node, so all eleven rendered in
 * the editor's default face, at its default size, on its default page. The
 * only thing separating "Classic" from "Modern" was the wording.
 *
 * That is a defect with no symptom. Nothing throws, nothing looks broken, and
 * every existing test passed throughout -- they assert that a template
 * personalises and that a letter survives the suggestions pane, neither of
 * which touches how it is set. A template added later with no typography would
 * rejoin the undifferentiated pile in exactly the same silence, which is what
 * these assertions are for.
 *
 * WHAT IS DELIBERATELY NOT ASSERTED: the specific numbers. `Classic` being
 * 10.5pt on 1.15 leading is a design decision and should be changeable without
 * a red build. What must not change is that it differs from its neighbours,
 * and that it states a choice at all.
 */

const ALL: ResumeTemplate[] = [...WORD_TEMPLATES, ...COVER_LETTER_TEMPLATES]

/** The design fingerprint of a template: what it says about page and type. */
function fingerprint(template: ResumeTemplate): string {
  const attrs = (template.content as { attrs?: Record<string, unknown> }).attrs
  const geometry = normalizeGeometry(attrs?.pageGeometry)
  const type = normalizeTypography(attrs?.documentTypography)
  return JSON.stringify([
    geometry.margin.top,
    geometry.margin.left,
    type.fontFamily,
    type.fontSize,
    type.lineHeight,
    type.paragraphSpacing,
  ])
}

describe('every template states its own design', () => {
  it.each(ALL.map((t) => [t.id, t] as const))('%s sets a page and a face', (_id, template) => {
    // THE ASSERTION THAT WOULD HAVE CAUGHT THE ORIGINAL DEFECT. Before this,
    // every one of these was `undefined` and `normalizeTypography` returned
    // all-null -- which is exactly what a template added tomorrow with no
    // `attrs` will do.
    const attrs = (template.content as { attrs?: Record<string, unknown> }).attrs
    expect(attrs, `${template.id} has no doc attrs at all`).toBeTruthy()

    const type = normalizeTypography(attrs?.documentTypography)
    expect(type.fontFamily, `${template.id} states no face`).toBeTruthy()
    expect(type.fontSize, `${template.id} states no body size`).toBeTruthy()
    expect(type.lineHeight, `${template.id} states no leading`).toBeTruthy()

    // A stack, not a bare name: `fontFamily` is a CSS value, and both
    // exporters take the first family out of it.
    expect(type.fontFamily).toContain(',')
  })

  it('gives no two templates the same design', () => {
    /*
      THE HEADLINE ASSERTION. Two templates may legitimately share a face --
      three of these are Georgia -- but not a face AND a size AND a leading AND
      a paragraph spacing AND a page, because at that point they are one
      template offered twice under different names.
    */
    const seen = new Map<string, string>()
    for (const template of ALL) {
      const key = fingerprint(template)
      const twin = seen.get(key)
      expect(twin, `${template.id} is set identically to ${twin}`).toBeUndefined()
      seen.set(key, template.id)
    }
  })

  it('separates the CVs by density rather than only by face', () => {
    // Face alone is a weak distinction at a glance -- two serifs at the same
    // size read as the same document. What a reader actually notices is how
    // much is on the page, which is body size against margins.
    const byId = new Map(WORD_TEMPLATES.map((t) => [t.id, t]))
    const density = (id: string) => {
      const template = byId.get(id)!
      const attrs = (template.content as { attrs?: Record<string, unknown> }).attrs
      const type = normalizeTypography(attrs?.documentTypography)
      const geometry = normalizeGeometry(attrs?.pageGeometry)
      return { size: type.fontSize!, margin: geometry.margin.top, lead: type.lineHeight! }
    }

    const detailed = density('word-detailed')
    const entry = density('word-entry')
    // `Detailed` carries seven sections and `Entry level` carries three, so
    // the two have to sit at opposite ends or the templates are not doing the
    // job their names promise.
    expect(detailed.size).toBeLessThan(entry.size)
    expect(detailed.margin).toBeLessThan(entry.margin)
    expect(detailed.lead).toBeLessThan(entry.lead)
  })

  it('keeps ATS-safe the least styled of them', () => {
    // ITS WHOLE POINT. Every other template makes a typographic argument; this
    // one deliberately makes none, because a parser should meet nothing it has
    // to decide about. A later edit that "improves" it with a rule or a
    // centred name has misunderstood what it is for.
    const ats = WORD_TEMPLATES.find((t) => t.id === 'word-ats')!
    const json = JSON.stringify(ats.content)
    expect(json, 'ATS-safe must draw no section rules').not.toContain('"ruled":true')
    expect(json, 'ATS-safe must centre nothing').not.toContain('center')
    expect(json, 'ATS-safe must use no italics').not.toContain('"italic"')
  })

  it('uses the format levers, not only the type ones', () => {
    // "Different typography, spacing, AND format." Type alone would leave six
    // CVs that are the same document in different faces, so at least one has
    // to centre its header and at least one has to rule its sections -- and at
    // least one has to do neither, or the levers are not distinguishing.
    const json = WORD_TEMPLATES.map((t) => JSON.stringify(t.content))
    expect(json.filter((j) => j.includes('"ruled":true')).length).toBeGreaterThan(0)
    expect(json.filter((j) => j.includes('center')).length).toBeGreaterThan(0)
    expect(
      json.filter((j) => !j.includes('"ruled":true') && !j.includes('center')).length
    ).toBeGreaterThan(0)
  })

  it('gives every shipped template its own gallery card', () => {
    // The gallery's rule table used to branch on `compact` and `academic`, two
    // ids deleted some time ago -- so five of the six CVs fell through to one
    // default shape and the gallery drew the same card five times. A suffix
    // match fails silently when an id changes; this is the check that does not.
    for (const template of ALL) {
      expect(THUMBNAIL_IDS, `${template.id} has no thumbnail of its own`).toContain(template.id)
    }
    // And nothing stale in the other direction.
    const shipped = new Set(ALL.map((t) => t.id))
    for (const id of THUMBNAIL_IDS) {
      expect(shipped, `${id} has a thumbnail but is not a template`).toContain(id)
    }
  })

  it('carries each design all the way into an exported file', () => {
    /*
      THE DISTINCTION HAS TO SURVIVE THE EXPORT or it is a preview effect. The
      .tex is the cheapest of the three to assert on -- it is a string -- and
      it reads the same doc attrs the .docx exporter does, so proving it here
      proves the contract both of them share.
    */
    const sources = WORD_TEMPLATES.map((t) => buildLatex(t.content, t.name))
    // Every one names its own page and its own size.
    for (const [i, source] of sources.entries()) {
      const template = WORD_TEMPLATES[i]
      const type = normalizeTypography(
        (template.content as { attrs?: Record<string, unknown> }).attrs?.documentTypography
      )
      expect(source, `${template.id} lost its leading`).toContain(`\\setstretch{${type.lineHeight}}`)
    }
    // And no two of the six produce the same preamble.
    const preambles = sources.map((s) => s.slice(0, s.indexOf('\\begin{document}')))
    expect(new Set(preambles).size).toBe(WORD_TEMPLATES.length)
  })
})

/**
 * The design survives the one function every template passes through.
 *
 * `personalizeTemplate` is the last thing to touch a template before it is
 * written to the database -- `resumeTemplateService`'s own docblock warns that
 * anything writing `content` without going through it ships raw
 * `{{name|Your Name}}` to a person. It `structuredClone`s and then walks the
 * tree, so the doc attrs come along; this pins that, because a future
 * rewrite of that walk which REBUILT the doc node instead of mutating it
 * would silently strip every template's typography and put all eleven back on
 * the default page. There would be no error, no failing test, and no symptom
 * except that the templates felt the same again.
 */
describe('personalisation keeps the design', () => {
  it('leaves the doc attrs intact', async () => {
    const { personalizeTemplate } = await import('@/services/templatePersonalization')
    const { EMPTY_PROFILE } = await import('@/services/profile')

    for (const template of ALL) {
      const before = (template.content as { attrs?: Record<string, unknown> }).attrs
      const after = (
        personalizeTemplate(template.content, EMPTY_PROFILE) as {
          attrs?: Record<string, unknown>
        }
      ).attrs
      expect(after, `${template.id} lost its attrs through personalisation`).toEqual(before)
    }
  })
})
