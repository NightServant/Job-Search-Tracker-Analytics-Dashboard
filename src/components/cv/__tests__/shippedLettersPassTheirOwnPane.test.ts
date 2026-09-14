import { describe, it, expect } from 'vitest'
import type { JSONContent } from '@tiptap/core'
import { letterReview, type LetterFindingId } from '../letterSuggestions'
import { COVER_LETTER_TEMPLATES } from '@/services/resumeTemplateService'
import { personalizeTemplate } from '@/services/templatePersonalization'
import { EMPTY_PROFILE, type UserProfile } from '@/services/profile'

/**
 * The letters this app ships must not be told off by the pane this app ships.
 *
 * THIS TEST EXISTS BECAUSE THE SEAM ACTUALLY BROKE. The cover-letter templates
 * and `letterSuggestions` were built at the same time by two people who could
 * not see each other's work, and they disagreed on the most visible sentence
 * in the document: FOUR of the five templates opened "I am writing to apply
 * for...", which is the first entry on the pane's own tired-openings list. So
 * picking a template and opening the suggestions rail greeted you with a
 * complaint about text you had not written yet -- which reads as the app being
 * broken, not as advice.
 *
 * The templates were rewritten rather than the rule loosened. The rule is
 * right: those openings announce that a letter has arrived, which the reader
 * already knows. A template is the app demonstrating what good looks like, and
 * it cannot demonstrate that while failing its own check.
 *
 * IT CROSSES `services/` INTO `components/` ON PURPOSE, the way
 * postingDigest's round-trip test crosses the other way: the property being
 * proved is a contract BETWEEN the two modules, and neither one can state it
 * alone.
 */

/** The rule ids a shipped template is expected to trip, and why each is fine. */
const EXPECTED: Record<string, string> = {
  // A template IS scaffolding. `[Company]` and `[role]` are the slots the
  // writer fills in, so this finding is the pane doing its job -- it is the
  // checklist for turning the template into a letter.
  placeholders: 'a template is scaffolding by definition',
  // Every concrete number is the writer's to supply: `[number]` years, the
  // outcome with the figure attached. A specimen letter has no evidence in it
  // because the evidence is the part only they have.
  evidence: 'the numbers are the writer\'s to fill in',
}

function plainText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? ''
  const inner = (node.content ?? []).map(plainText).join('')
  // Blocks are what the pane counts paragraphs by, so they have to survive
  // flattening -- run them together and a five-paragraph letter reads as one.
  return node.type === 'doc' ? inner : `${inner}\n`
}

/** A profile with something in every field the letters actually substitute. */
const FILLED: UserProfile = {
  ...EMPTY_PROFILE,
  name: 'Gabriel Cervantes',
  headline: 'Software Engineer',
  email: 'gabe@example.com',
  location: 'Tarlac, Philippines',
  industry: 'software development',
  summary: 'Six years building web applications.',
}

describe.each([
  ['as shipped', EMPTY_PROFILE],
  ['personalised from a profile', FILLED],
])('every cover letter template, %s', (_label, profile) => {
  it.each(COVER_LETTER_TEMPLATES.map((t) => [t.id, t] as const))(
    '%s trips nothing but the findings a specimen is meant to trip',
    (_id, template) => {
      const text = plainText(personalizeTemplate(template.content, profile))
      const unexpected = letterReview(text).findings
        .map((finding) => finding.id)
        .filter((id: LetterFindingId) => !(id in EXPECTED))

      expect(unexpected).toEqual([])
    }
  )
})

describe('the rule the templates broke', () => {
  it('still fires on the opening they used to have', () => {
    // The positive companion. Without it, a typo in the rule's phrase list
    // would make the suite above pass by checking nothing.
    // A WHOLE LETTER, not a fragment: `opening` reads the first paragraph long
    // enough to be a body paragraph, so a five-line stub has nothing for it to
    // look at and the assertion would pass or fail for the wrong reason.
    const text = [
      'Dear Ms Reyes,',
      'I am writing to apply for the Frontend Engineer position at Meridian Labs, which I saw advertised on your careers page. The role asks for someone who can own a design system end to end, and that is what I have been doing for the past three years.',
      'At Northwind I rebuilt the component library that eleven product teams ship on, and cut the largest bundle by 40 percent in the process. I ran the migration myself, one team at a time, so nobody had to stop shipping while it happened.',
      'My CV is attached and has the rest of it. I would welcome a conversation and can make time this week or next.',
    ].join('\n')

    expect(letterReview(text).findings.map((f) => f.id)).toContain('opening')
  })
})
