import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { LANDING_TYPE } from '../typography'

const DIR = 'src/components/landing'

/**
 * The guard behind ./typography.ts.
 *
 * The page had drifted into three sizes for one job -- item titles at
 * heading-s and heading-m, item bodies at body-s, body-m and body-l, and one
 * section title at display-m while the rest were heading-l. Naming the roles
 * fixes it once; this is what keeps it fixed, because the seventh section
 * someone writes will otherwise pick a plausible size the same way the first
 * six did.
 *
 * Gating on SOURCE TEXT. These are Tailwind classes, and jsdom has no
 * stylesheet -- a rendered `text-body-s` and a rendered `text-body-l` compute
 * to exactly the same nothing. The class string is the artefact under test.
 *
 * CHROME IS EXEMPT, and the exemption is a list rather than an assumption.
 * The hero, navbar, rail, section index and footer are sized against the
 * viewport and each other, not against the section hierarchy. Anyone adding a
 * sixth name here has to say why in a diff.
 */
const CHROME = new Set([
  'Hero.tsx',
  'HeroMedia.tsx',
  'LandingNavbar.tsx',
  'SectionRail.tsx',
  'SectionIndex.tsx',
  'SiteFooter.tsx',
])

/** Section content: everything that renders inside a <Section>. */
function sectionFiles(): { name: string; source: string }[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.tsx') && !CHROME.has(f))
    .map((name) => ({ name, source: readFileSync(join(DIR, name), 'utf8') }))
}

/** A type class written as a literal, ignoring the ones inside comments. */
function rawTypeClasses(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
  return withoutComments.match(/\btext-(?:display|heading|body)-[a-z]+\b/g) ?? []
}

describe('the landing page type contract', () => {
  it('covers every section file', () => {
    // Positive companion: a glob that matched nothing -- a renamed directory,
    // a moved component -- would turn every assertion below green while
    // checking no files at all.
    const names = sectionFiles().map((f) => f.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'Section.tsx',
        'SocialProof.tsx',
        'ProblemStatement.tsx',
        'SolutionValue.tsx',
        'LandingFaq.tsx',
        'ClosingCta.tsx',
      ])
    )
  })

  it('lets no section pick a type size for itself', () => {
    const offenders = sectionFiles()
      .filter((f) => f.name !== 'typography.ts')
      .flatMap((f) => rawTypeClasses(f.source).map((cls) => `${f.name}: ${cls}`))
    expect(
      offenders,
      'these bypass LANDING_TYPE and are how the page drifted last time'
    ).toEqual([])
  })

  it('gives each level a size or a weight the level beside it does not have', () => {
    // A hierarchy whose steps are indistinguishable is not a hierarchy. The
    // lede and the item title are DELIBERATELY the same size -- 400 against
    // 700 is what separates them -- so this asserts each pair differs on at
    // least one axis, not that every pair differs on size.
    const size = (role: keyof typeof LANDING_TYPE) =>
      LANDING_TYPE[role].match(/text-(display|heading|body)-[a-z]+/)![0]

    expect(size('sectionTitle')).toBe('text-display-m')
    expect(size('sectionLede')).toBe('text-body-l')
    expect(size('itemTitle')).toBe('text-heading-m')
    expect(size('itemBody')).toBe('text-body-m')

    // The one collision, and it is on purpose: body-l and heading-m are both
    // 16px. `heading-*` carries weight 700 and `body-*` carries 400, so the
    // two are still distinguishable -- but only because one is a heading step
    // and the other a body step, which this asserts rather than assumes.
    expect(size('sectionLede').startsWith('text-body-')).toBe(true)
    expect(size('itemTitle').startsWith('text-heading-')).toBe(true)
  })

  it('states a weight for every role, so a component library cannot win it', () => {
    // The FAQ bug, as a rule. shadcn's AccordionTrigger ships `font-medium`;
    // tailwind-merge keeps it because it is a different group from the size
    // utility, so the questions rendered 16px/500 while every other item title
    // was 16px/700. A role that leans on its size utility's DEFAULT weight is
    // a role any vendor base class can quietly overrule.
    for (const [role, cls] of Object.entries(LANDING_TYPE)) {
      expect(cls, `${role} states no weight`).toMatch(/\bfont-(bold|normal|medium|semibold)\b/)
    }
  })

  it('keeps headings bold and body regular', () => {
    // Positive companion to the above: without it, every role could satisfy
    // "states a weight" by stating the same one.
    for (const role of ['sectionTitle', 'itemTitle'] as const) {
      expect(LANDING_TYPE[role]).toContain('font-bold')
    }
    for (const role of ['sectionLede', 'itemBody', 'itemAnswer', 'meta'] as const) {
      expect(LANDING_TYPE[role]).toContain('font-normal')
    }
  })

  it('states a colour for every role, so colour cannot drift instead of size', () => {
    for (const [role, cls] of Object.entries(LANDING_TYPE)) {
      expect(cls, `${role} sets no colour`).toMatch(/\btext-(text|accent)-[a-z]+\b/)
    }
  })
})
