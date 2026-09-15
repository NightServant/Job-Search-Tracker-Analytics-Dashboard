import { describe, it, expect } from 'vitest'
import type { JSONContent } from '@tiptap/core'
import { applySuggestions, tailoredTitle, isRetailorOfSameApplication } from '../applyTailoring'
import type { TailoringSuggestion } from '@/services/integrations/tailoring'

/**
 * The one part of tailoring that can quietly corrupt a CV.
 *
 * Everything else in the feature fails loudly -- a dead route shows an alert,
 * a missing key shows the unconfigured notice. This takes somebody's document
 * and returns a different document, so the failure mode is a file that reads
 * fine and says something its author never wrote. Tested on the shapes rather
 * than through the rail for that reason.
 */
function suggest(before: string, after: string): TailoringSuggestion {
  return { section: 'summary', before, after, rationale: 'matches the posting' }
}

const DOC: JSONContent = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Shipped the rewrite' }] },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Led a small team' }] }],
        },
      ],
    },
  ],
}

describe('applySuggestions', () => {
  it('rewrites text nodes at any depth in a Tiptap document', () => {
    const next = applySuggestions(DOC, [suggest('Led a small team', 'Led a team of four')]) as JSONContent
    const item = next.content![1].content![0].content![0].content![0]
    expect(item.text).toBe('Led a team of four')
  })

  it('leaves the document it was given untouched', () => {
    // THE OPEN EDITOR MUST SURVIVE THE REWRITE. The tailored CV is a new
    // document; if the walk mutated in place, the original would already be
    // gone by the time the new one was saved.
    applySuggestions(DOC, [suggest('Shipped the rewrite', 'Shipped the React rewrite')])
    expect(DOC.content![0].content![0].text).toBe('Shipped the rewrite')
  })

  it('returns the same document when no suggestion matched, so the caller can tell', () => {
    // Identity is the "nothing changed" signal -- it is what stops a run that
    // matched nothing from filing a byte-identical second CV.
    expect(applySuggestions(DOC, [suggest('never written here', 'anything')])).toBe(DOC)
    expect(applySuggestions(DOC, [])).toBe(DOC)
  })

  it('skips the suggestions it cannot place and keeps the ones it can', () => {
    const next = applySuggestions(DOC, [
      suggest('a line that is not in the CV', 'something else'),
      suggest('Shipped the rewrite', 'Shipped the TypeScript rewrite'),
    ]) as JSONContent
    expect(next.content![0].content![0].text).toBe('Shipped the TypeScript rewrite')
  })

  it('returns the same LaTeX content when the quote is not in the source', () => {
    const content = { type: 'latex' as const, source: '\\item Built the pipeline' }
    expect(applySuggestions(content, [suggest('not here', 'x')])).toBe(content)
  })

  it('does not throw on a malformed suggestion', () => {
    // The model's JSON is parsed at the route, not validated field by field.
    // An empty `before` matches everywhere and nowhere.
    expect(() => applySuggestions(DOC, [suggest('', 'inserted')])).not.toThrow()
    expect(applySuggestions(DOC, [suggest('', 'inserted')])).toBe(DOC)
  })
})

describe('tailoredTitle', () => {
  it('names the new CV after the company it was tailored to', () => {
    expect(tailoredTitle('Backend CV', 'Initech')).toBe('Backend CV — Initech')
  })

  it('falls back to "tailored" when the posting carries no company', () => {
    expect(tailoredTitle('Backend CV', null)).toBe('Backend CV — tailored')
    expect(tailoredTitle('Backend CV', '   ')).toBe('Backend CV — tailored')
    expect(tailoredTitle('Backend CV')).toBe('Backend CV — tailored')
  })

  it('does not append the same suffix twice', () => {
    // Tailoring a tailored CV to the same company is an ordinary thing to do,
    // and the naive version reads "Backend CV — Initech — Initech" by the
    // second pass.
    expect(tailoredTitle('Backend CV — Initech', 'Initech')).toBe('Backend CV — Initech')
    expect(tailoredTitle('Backend CV — tailored', null)).toBe('Backend CV — tailored')
    // A different company still appends: it is a different document.
    expect(tailoredTitle('Backend CV — Initech', 'Globex')).toBe('Backend CV — Initech — Globex')
  })

  it('trims and collapses whitespace on both halves', () => {
    expect(tailoredTitle('  Backend   CV \n', ' Initech  Systems ')).toBe(
      'Backend CV — Initech Systems'
    )
  })

  it('survives an untitled document', () => {
    expect(tailoredTitle('   ', 'Initech')).toBe('Initech')
  })
})


/**
 * The write this predicate chooses is destructive in one direction, so both
 * directions are pinned. See `isRetailorOfSameApplication` for why the links
 * are the only evidence it is allowed to use.
 */
describe('choosing between a new file and a rewrite', () => {
  const links = [{ job_id: 'job-initech' }, { job_id: 'job-globex' }]
  const TAILORED = 'Gabe - CV (ATS) — Initech'
  const MASTER = 'Gabe - CV (ATS)'

  it('rewrites when this document IS the tailored CV for this application', () => {
    expect(
      isRetailorOfSameApplication({
        draftId: 'cv-1',
        draftTitle: TAILORED,
        tailoredName: TAILORED,
        jobId: 'job-initech',
        links,
      })
    ).toBe(true)
  })

  /**
   * THE ONE THAT MATTERS. Found on the real account, 2026-09-15: the master CV
   * was pinned to FIFTY-TWO applications, because a link records that a CV was
   * SENT somewhere -- not that it is the tailored copy for it. Deciding on the
   * link alone would have overwritten the master the moment it was tailored
   * against any of those fifty-two, and the master is the document every
   * tailored copy is made from.
   */
  it('never overwrites a master CV that was merely SENT to this application', () => {
    expect(
      isRetailorOfSameApplication({
        draftId: 'cv-master',
        draftTitle: MASTER,
        // What this run WOULD call a new document -- not what the master is called.
        tailoredName: TAILORED,
        jobId: 'job-initech',
        links,
      })
    ).toBe(false)
  })

  it('writes a new file for an application this document has not been tailored for', () => {
    expect(
      isRetailorOfSameApplication({
        draftId: 'cv-1',
        draftTitle: TAILORED,
        tailoredName: TAILORED,
        jobId: 'job-acme',
        links,
      })
    ).toBe(false)
  })

  it('writes a new file for a second role at the SAME company', () => {
    // Both tailored CVs are called "... — Initech", so the title agrees and
    // only the link can tell them apart. This document was made for the first
    // role; the second one is a new file.
    expect(
      isRetailorOfSameApplication({
        draftId: 'cv-1',
        draftTitle: TAILORED,
        tailoredName: TAILORED,
        jobId: 'job-initech-second-role',
        links,
      })
    ).toBe(false)
  })

  it('writes a new file when the document has no links at all', () => {
    expect(
      isRetailorOfSameApplication({
        draftId: 'cv-1',
        draftTitle: TAILORED,
        tailoredName: TAILORED,
        jobId: 'job-initech',
        links: [],
      })
    ).toBe(false)
  })

  it('never overwrites when there is no open document', () => {
    expect(
      isRetailorOfSameApplication({
        draftId: null,
        draftTitle: TAILORED,
        tailoredName: TAILORED,
        jobId: 'job-initech',
        links,
      })
    ).toBe(false)
  })

  it('never overwrites when no application was chosen', () => {
    expect(
      isRetailorOfSameApplication({
        draftId: 'cv-1',
        draftTitle: TAILORED,
        tailoredName: TAILORED,
        jobId: '',
        links,
      })
    ).toBe(false)
  })

  it('never overwrites when the open document has no title yet', () => {
    expect(
      isRetailorOfSameApplication({
        draftId: 'cv-1',
        draftTitle: '',
        tailoredName: TAILORED,
        jobId: 'job-initech',
        links,
      })
    ).toBe(false)
  })
})
