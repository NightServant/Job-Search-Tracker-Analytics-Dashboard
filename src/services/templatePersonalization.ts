import type { JSONContent } from '@tiptap/core'
import type {
  ProfileEducation,
  ProfileExperience,
  ProfileProject,
  UserProfile,
} from './profile'

/**
 * Filling a template in with the user's own details before they ever see it.
 *
 * THE PROBLEM THIS SOLVES. A template is a document somebody else wrote, and
 * the first ten minutes with one are spent deleting "Your Name" and typing the
 * same four contact fields Worktrack already stores. The profile import
 * (`user_profiles`, from the LinkedIn export) knows all of it. Doing the
 * substitution at CREATE time means the first thing on screen is already the
 * user's document rather than a form to fill in.
 *
 * TWO MECHANISMS, BECAUSE ONE IS NOT ENOUGH. A name is a value and goes in a
 * slot; a work history is a LIST and there is no slot shape that fits "between
 * two and nine entries, each with a variable number of bullets". So:
 *
 *   TOKENS       `{{name|Your Name}}` in a text node, replaced in place.
 *   SECTIONS     everything under an `Experience` heading is thrown away and
 *                regenerated from the profile's entries.
 *
 * EVERY TOKEN CARRIES ITS OWN FALLBACK, and that is the whole reason the
 * `{{token|text}}` form exists rather than a bare `{{token}}`. Most people
 * open this app before they have connected anything, and a template that
 * renders `{{name}}` to an empty line -- or worse, renders it literally -- is
 * the placeholder-copy failure `noPlaceholderCopy.test.ts` exists to catch,
 * wearing different punctuation. The fallback is the template's own original
 * wording, so a profile-less user gets exactly the document they got before
 * this file existed. NO `{{` EVER SURVIVES: an unknown token with no fallback
 * is deleted rather than left visible.
 *
 * AN EMPTY SECTION IS LEFT ALONE, deliberately. If the profile has no
 * education, the template's own specimen entry stays -- it shows the shape the
 * section wants and it is what the user is going to overwrite anyway. Emptying
 * the section instead would leave a heading over nothing, which reads as a
 * bug rather than as an invitation.
 *
 * IT NEVER MUTATES ITS INPUT. `WORD_TEMPLATES` and `COVER_LETTER_TEMPLATES`
 * are module-level constants shared by every caller in the process; writing
 * through one of them would personalise the template itself and hand the next
 * user the previous user's name. `structuredClone` up front, then the rest of
 * this file is free to work in place on the copy -- which is a lot less code
 * than a persistent-rebuild walk, and it is native, so there is no clone
 * helper to maintain.
 */

/**
 * `{{token}}` or `{{token|fallback text}}`.
 *
 * The fallback runs to the closing brace and may itself contain `|`, so the
 * contact lines in the CV templates (`{{email|a@b.c}} | {{phone|...}}`) split
 * on the FIRST pipe only. Whitespace around the token name is tolerated
 * because a template is hand-written and `{{ name }}` is the obvious typo.
 */
const TOKEN = /\{\{\s*([a-zA-Z]+)\s*(?:\|([^}]*))?\}\}/g

/** Trimmed, or null. An empty string is an absent value, not a present one. */
function clean(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * The scalar values a template can ask for.
 *
 * `phone` IS HERE AND IS ALWAYS NULL. `UserProfile` has no phone field --
 * LinkedIn's export does not carry one, so there is nothing to read. The token
 * is supported anyway because the CV templates' contact lines need a phone
 * slot and its fallback is the only sane thing to show; when a profile source
 * that has the number is added, this is the one line that changes. Dropping
 * the token instead would mean editing every template back later.
 *
 * `today` is the exception that is never absent: a letter needs a date, the
 * clock always has one, and 'en-US' is pinned for the same reason `date.ts`
 * pins it -- the alternative is the same template rendering a different date
 * format per machine, including in tests.
 */
function tokenValues(profile: UserProfile): Record<string, string | null> {
  return {
    name: clean(profile.name),
    headline: clean(profile.headline),
    email: clean(profile.email),
    phone: null,
    location: clean(profile.location),
    website: clean(profile.websites[0]),
    linkedin: clean(profile.url),
    industry: clean(profile.industry),
    summary: clean(profile.summary),
    today: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  }
}

/**
 * Replaces every token in every text node, in place, on an already-cloned tree.
 *
 * A text node whose text substitutes down to nothing is REMOVED, not left
 * empty: ProseMirror rejects an empty text node outright ("Empty text nodes
 * are not allowed") and the editor would throw on the document it was just
 * handed. Nothing in the shipped templates can produce one -- every token
 * there has a fallback -- but a template written later without one would
 * otherwise crash the editor rather than render a gap.
 */
function substituteTokens(node: JSONContent, values: Record<string, string | null>): void {
  if (!Array.isArray(node.content)) return

  const kept: JSONContent[] = []
  for (const child of node.content) {
    if (child.type === 'text' && typeof child.text === 'string') {
      const text = child.text.replace(TOKEN, (_match, name: string, fallback?: string) => {
        return values[name.toLowerCase()] ?? fallback ?? ''
      })
      if (text.length === 0) continue
      child.text = text
      kept.push(child)
      continue
    }
    substituteTokens(child, values)
    kept.push(child)
  }
  node.content = kept
}

/** The visible text of a node, its descendants included. */
function textOf(node: JSONContent): string {
  if (typeof node.text === 'string') return node.text
  if (!Array.isArray(node.content)) return ''
  return node.content.map(textOf).join('')
}

function text(value: string): JSONContent {
  return { type: 'text', text: value }
}

function bold(value: string): JSONContent {
  return { type: 'text', text: value, marks: [{ type: 'bold' }] }
}

/**
 * A paragraph of lines separated by hard breaks, skipping the absent ones.
 *
 * `null` AND the empty string are both absent. A profile field can be present
 * and blank (an export writes `""` as readily as it omits the column), and an
 * empty text node is the one thing ProseMirror refuses outright -- so the
 * filter lives here, once, rather than at each of the four call sites.
 */
function lines(...parts: (string | null)[]): JSONContent {
  // The first surviving line is the entry's title and is bold; the rest is the
  // detail under it. That is the shape every template's own specimen block
  // already uses, so a regenerated section looks like the one it replaced.
  const values = parts.map(clean).filter((value): value is string => value !== null)
  const content: JSONContent[] = []
  values.forEach((value, index) => {
    if (index > 0) content.push({ type: 'hardBreak' })
    content.push(index === 0 ? bold(value) : text(value))
  })
  return { type: 'paragraph', content }
}

/** `a | b`, with the missing halves dropped rather than leaving a bare pipe. */
function joined(...parts: (string | null)[]): string | null {
  const present = parts.filter((part): part is string => clean(part) !== null)
  return present.length > 0 ? present.join(' | ') : null
}

/**
 * The `description` field as bullets.
 *
 * The export gives one blob per role with newlines in it, and the leading
 * glyph is whatever the person typed into LinkedIn -- a bullet, a dash, an
 * asterisk. Stripping it matters because the text goes into a `bulletList`,
 * which draws its own marker: without this the CV shows "• - Built the thing".
 */
function bulletsFrom(description: string | null): JSONContent | null {
  const items = (description ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*·‣◦]\s*/, '').trim())
    .filter((line) => line.length > 0)
  if (items.length === 0) return null
  return {
    type: 'bulletList',
    content: items.map((item) => ({
      type: 'listItem',
      content: [{ type: 'paragraph', content: [text(item)] }],
    })),
  }
}

function experienceNodes(entries: ProfileExperience[]): JSONContent[] {
  return entries.flatMap((entry) => {
    const heading = lines(joined(entry.title, entry.company), joined(entry.period, entry.location))
    const bullets = bulletsFrom(entry.description)
    return bullets ? [heading, bullets] : [heading]
  })
}

function educationNodes(entries: ProfileEducation[]): JSONContent[] {
  return entries.map((entry) => {
    // The degree leads when there is one, because that is what a reader scans
    // for; with no degree recorded the school takes the top line instead of
    // leaving a bold blank above it.
    const degree = clean(entry.degree)
    return degree === null
      ? lines(entry.school, entry.period)
      : lines(degree, joined(entry.school, entry.period))
  })
}

function projectNodes(entries: ProfileProject[]): JSONContent[] {
  return entries.map((entry) => lines(entry.title, entry.description, entry.url))
}

/**
 * How a heading is recognised as a section, and what replaces the block under
 * it.
 *
 * MATCHED BY SUBSTRING, case-insensitively, because the six CV templates do
 * not agree on wording and neither does anything a user pastes in:
 * "Professional Experience", "Work Experience" and "Experience" are one
 * section, and so are "Skills", "Tech Skills" and "Core Competencies". A
 * strict equality check matched two of the six templates and silently did
 * nothing to the rest, which looked exactly like the feature working.
 *
 * ORDER MATTERS: the first entry whose pattern hits wins, so anything that
 * could read as two sections has to be listed under the one it belongs to.
 */
const SECTIONS: { pattern: RegExp; build: (profile: UserProfile) => JSONContent[] }[] = [
  { pattern: /experience|employment/i, build: (p) => experienceNodes(p.experiences) },
  { pattern: /education|academic/i, build: (p) => educationNodes(p.education) },
  {
    pattern: /skills?|competenc|^\s*stack\s*$/i,
    build: (p) => (p.skills.length > 0 ? [{ type: 'paragraph', content: [text(p.skills.join(', '))] }] : []),
  },
  { pattern: /projects?/i, build: (p) => projectNodes(p.projects) },
]

function headingLevel(node: JSONContent): number | null {
  if (node.type !== 'heading') return null
  const level = node.attrs?.level
  return typeof level === 'number' ? level : 1
}

/**
 * Replaces each recognised section's body with nodes built from the profile.
 *
 * A SECTION IS "THE HEADING, THEN EVERYTHING UNTIL THE NEXT HEADING OF THE
 * SAME OR HIGHER LEVEL". That rule rather than "until the next heading of any
 * level" so a template that puts an h3 per employer under an h2 Experience
 * heading has one section, not one per job.
 *
 * TOP LEVEL ONLY. Every template here is a flat list of blocks, which is what
 * the Word editor produces, and a heading nested inside a blockquote or a
 * table cell is not a CV section -- walking into containers to find one would
 * be answering a question nobody has asked.
 */
function expandSections(blocks: JSONContent[], profile: UserProfile): JSONContent[] {
  const out: JSONContent[] = []
  let i = 0
  while (i < blocks.length) {
    const block = blocks[i]
    const level = headingLevel(block)
    const section = level === null ? undefined : SECTIONS.find((s) => s.pattern.test(textOf(block)))
    out.push(block)
    i += 1
    if (!section || level === null) continue

    let end = i
    while (end < blocks.length) {
      const next = headingLevel(blocks[end])
      if (next !== null && next <= level) break
      end += 1
    }

    const replacement = section.build(profile)
    // Nothing in the profile for this section: the template's own specimen
    // block is better than a heading over empty space, so it is carried
    // through untouched.
    out.push(...(replacement.length > 0 ? replacement : blocks.slice(i, end)))
    i = end
  }
  return out
}

/**
 * A template with the user's own details in it.
 *
 * Tokens are substituted BEFORE sections are expanded, so the generated nodes
 * are never themselves scanned for `{{`. That ordering is deliberate: profile
 * text is arbitrary user content and a description that happens to contain
 * braces is a description, not a template token, and must survive verbatim.
 *
 * The returned tree is always a new object. Call it on the way into
 * `resumeService.create`, never after -- a draft in the database is the user's
 * document, and running it over saved content would rewrite work they did.
 */
export function personalizeTemplate(content: JSONContent, profile: UserProfile): JSONContent {
  const doc = structuredClone(content)
  substituteTokens(doc, tokenValues(profile))
  if (Array.isArray(doc.content)) doc.content = expandSections(doc.content, profile)
  return doc
}
