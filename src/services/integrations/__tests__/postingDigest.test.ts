import { describe, it, expect, vi } from 'vitest'
import { digestPosting, groundFields, ungroundedNumbers } from '../postingDigest'
/* THE RECORD'S OWN PARSER, imported into a service test on purpose: the
   round-trip below is a contract BETWEEN the two, and proving it against a
   local copy of the heading rule would prove only that the copy agrees with
   itself. */
import { parsePosting, serializePosting } from '@/components/applications/record/postingSections'
import { formatPostingText } from '../../postingFormat'
import type { IntegrationConfig } from '../config'

function configWith(tailoring: Partial<IntegrationConfig['tailoring']> = {}): IntegrationConfig {
  return {
    tailoring: {
      baseUrl: 'https://llm.test/v1',
      apiKey: 'k',
      model: 'test-model',
      ...tailoring,
    },
    esco: { baseUrl: 'https://esco.test/api', enabled: true },
  }
}

const POSTING = `Senior Frontend Engineer at Acme Corp.
Location: Pasig City, Philippines. Hybrid setup.
Salary: PHP 50,000 - 70,000 per month.
You will build interfaces with React and TypeScript.`

function reply(payload: unknown) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
  } as unknown as Response
}

describe('formatting a scraped posting', () => {
  it('normalises every bullet glyph to one', () => {
    const out = formatPostingText('• React\n▪ TypeScript\n‣ GraphQL')
    expect(out).toBe('- React\n- TypeScript\n- GraphQL')
  })

  it('drops a line a page rendered twice', () => {
    // Sites render a heading once for mobile and once for desktop, and a text
    // extraction picks up both.
    expect(formatPostingText('Requirements\nRequirements\nReact')).toBe('Requirements\nReact')
  })

  it('keeps a repeat that is not adjacent', () => {
    const out = formatPostingText('React\nTypeScript\nReact')
    expect(out).toBe('React\nTypeScript\nReact')
  })

  it('collapses runs of blank lines and stray whitespace', () => {
    expect(formatPostingText('A\n\n\n\nB   C')).toBe('A\n\nB C')
  })

  it('invents nothing -- every word survives', () => {
    const source = 'Build things with React. Ship them.'
    const out = formatPostingText(source)
    for (const word of ['Build', 'things', 'React', 'Ship']) expect(out).toContain(word)
  })

})

describe('grounding what the model returns', () => {
  it('keeps fields the posting actually contains', () => {
    const { fields, dropped } = groundFields(
      { role: 'Senior Frontend Engineer', company: 'Acme Corp', location: 'Pasig City' },
      POSTING
    )
    expect(fields.role).toBe('Senior Frontend Engineer')
    expect(fields.company).toBe('Acme Corp')
    expect(dropped).toEqual([])
  })

  it('drops a company the posting never names', () => {
    // THE POINT OF THE WHOLE FILE. A prompt asking a model not to invent is a
    // request; this is the check.
    const { fields, dropped } = groundFields({ company: 'Google' }, POSTING)
    expect(fields.company).toBeNull()
    expect(dropped).toEqual(['company: "Google"'])
  })

  it('drops a salary figure whose digits are not in the posting', () => {
    const { fields, dropped } = groundFields({ salary_min: 90000 }, POSTING)
    expect(fields.salary_min).toBeNull()
    expect(dropped[0]).toContain('90000')
  })

  it('accepts a figure the posting writes with a thousands separator', () => {
    const { fields } = groundFields({ salary_min: 50000, salary_max: 70000 }, POSTING)
    expect(fields.salary_min).toBe(50000)
    expect(fields.salary_max).toBe(70000)
  })

  it('will not take a currency with no figure beside it', () => {
    // A currency alone is a fact about the page's footer, not the salary.
    const { fields } = groundFields({ salary_currency: 'PHP' }, POSTING)
    expect(fields.salary_currency).toBeNull()
  })

  it('takes a currency that sits with a grounded figure', () => {
    const { fields } = groundFields({ salary_min: 50000, salary_currency: 'PHP' }, POSTING)
    expect(fields.salary_currency).toBe('PHP')
  })

  it('filters a tech stack item by item rather than all or nothing', () => {
    const { fields, dropped } = groundFields(
      { tech_stack: ['React', 'TypeScript', 'Kubernetes'] },
      POSTING
    )
    expect(fields.tech_stack).toEqual(['React', 'TypeScript'])
    expect(dropped).toEqual(['tech_stack: "Kubernetes"'])
  })

  it('rejects a work mode outside the three the form knows', () => {
    const { fields, dropped } = groundFields({ work_mode: 'from-the-moon' }, POSTING)
    expect(fields.work_mode).toBeNull()
    expect(dropped[0]).toContain('from-the-moon')
  })
})

describe('the digest end to end', () => {
  it('formats and summarises with no model configured', () => {
    // The state of CI, a fresh clone, and any deployment with no provider --
    // and still most of the value.
    return digestPosting(POSTING, {
      config: configWith({ apiKey: undefined }),
      fetchImpl: vi.fn() as unknown as typeof fetch,
    }).then((digest) => {
      expect(digest.usedModel).toBe(false)
      expect(digest.formatted).toContain('Senior Frontend Engineer')
      // The description IS the tidied posting when nothing restructured it.
      expect(digest.description).toBe(digest.formatted)
    })
  })

  it('keeps a grounded reply', async () => {
    const digest = await digestPosting(POSTING, {
      config: configWith(),
      fetchImpl: vi.fn().mockResolvedValue(
        reply({
          role: 'Senior Frontend Engineer',
          company: 'Acme Corp',
          salary_min: 50000,
          tech_stack: ['React'],
        })
      ) as unknown as typeof fetch,
    })
    expect(digest.usedModel).toBe(true)
    expect(digest.fields.role).toBe('Senior Frontend Engineer')
    // None of the fields was dropped. The reply carries no restructured
    // description, which is a drop of its own -- see "restructuring the
    // posting" below.
    expect(digest.dropped).toEqual(['description (missing)'])
  })

  it('survives a code fence the model added anyway', async () => {
    const digest = await digestPosting(POSTING, {
      config: configWith(),
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: '```json\n{"role":"Senior Frontend Engineer"}\n```' } },
          ],
        }),
      } as unknown as Response) as unknown as typeof fetch,
    })
    expect(digest.fields.role).toBe('Senior Frontend Engineer')
  })

  it('falls back rather than throwing when the provider fails', async () => {
    const digest = await digestPosting(POSTING, {
      config: configWith(),
      fetchImpl: vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch,
    })
    expect(digest.usedModel).toBe(false)
    expect(digest.formatted).toBeTruthy()
  })
})

describe('formatting text a page shouted', () => {
  it('stops a heading shouting, without renaming a technology', () => {
    // `QUALIFICATIONS:` is a raised voice. `PHP`, `AWS` and `CSS` are not.
    expect(formatPostingText('QUALIFICATIONS AND REQUIREMENTS:')).toBe(
      'Qualifications And Requirements:'
    )
    expect(formatPostingText('PHP AWS CSS SQL')).toBe('PHP AWS CSS SQL')
  })

  it('leaves a single shouted word alone', () => {
    // One word is a label or an acronym, not a sentence being yelled.
    expect(formatPostingText('URGENT')).toBe('URGENT')
  })

  it('removes a decorative rule between sections', () => {
    expect(formatPostingText('About us\n=======\nWe build things.')).toBe(
      'About us\nWe build things.'
    )
  })

  it('strips leading emoji from a line', () => {
    expect(formatPostingText('🔥 Hiring now')).toBe('Hiring now')
  })

  it('calms repeated punctuation', () => {
    expect(formatPostingText('Apply now!!! Ready???')).toBe('Apply now! Ready?')
  })

  it('closes the gap a markup extraction leaves before punctuation', () => {
    expect(formatPostingText('React , TypeScript and Node .')).toBe('React, TypeScript and Node.')
  })

  it('leaves a label and its value on one line', () => {
    // `Salary: PHP 50,000` is a label and its value, not a heading welded to a
    // paragraph. Breaking it in two made it harder to read, not easier.
    expect(formatPostingText('Salary: PHP 50,000 per month')).toBe(
      'Salary: PHP 50,000 per month'
    )
  })

  it('still splits a heading welded to the end of a sentence', () => {
    expect(formatPostingText('Issues as they arise. Qualifications: Enrolled in a degree'))
      .toBe('Issues as they arise.\n\nQualifications:\nEnrolled in a degree')
  })

  it('strips decoration from either end of a line', () => {
    expect(formatPostingText('🔥 Hiring now 🔥')).toBe('Hiring now')
  })

  it('changes no word while doing any of it', () => {
    const out = formatPostingText('🔥 URGENT HIRING FOR REACT DEVELOPERS!!!')
    for (const word of ['Urgent', 'Hiring', 'For', 'React', 'Developers']) {
      expect(out.toLowerCase()).toContain(word.toLowerCase())
    }
  })
})

/**
 * THE POSTING READ, NOT REPRODUCED (Gabe, 2026-09-14: "modify the
 * job-description extraction system so it does not simply scrape and reproduce
 * the source page ... read and understand the job posting first, then generate
 * a structured job description").
 *
 * The check the whole feature rests on is the same one the rest of this file
 * describes -- the model proposes and the code verifies -- but the rule had to
 * change shape for this output, and these are the cases that say how. A
 * restructure introduces words legitimately; it never introduces a figure, a
 * company or a technology.
 */
describe('restructuring the posting', () => {
  const STRUCTURED = [
    'Role overview:',
    '- Senior Frontend Engineer at Acme Corp, building interfaces with React and TypeScript.',
    '',
    'Technical skills:',
    '- React',
    '- TypeScript',
    '',
    'Compensation:',
    '- PHP 50,000 - 70,000 per month.',
  ].join('\n')

  const structuredDigest = (description: string, source = POSTING) =>
    digestPosting(source, {
      config: configWith(),
      fetchImpl: vi.fn().mockResolvedValue(reply({ description })) as unknown as typeof fetch,
    })

  it('keeps a structured description the posting can back up', async () => {
    const digest = await structuredDigest(STRUCTURED)
    expect(digest.dropped).toEqual([])
    expect(digest.description).toContain('Role overview:')
    expect(digest.description).toContain('- React')
    // `formatted` is untouched: it is the evidence everything above was
    // checked against, and overwriting it would mean checking the model's
    // restructure against the model's restructure.
    expect(digest.formatted).toContain('Senior Frontend Engineer at Acme Corp.')
  })

  it("round-trips through the record's own section parser", async () => {
    // THE PROPERTY THE EDIT CTAs DEPEND ON. Each section is addressable only
    // if the parser reads the description back exactly as it was written; a
    // description that reshapes on the way through would make `edit` on one
    // heading rewrite its neighbours.
    const digest = await structuredDigest(STRUCTURED)
    const sections = parsePosting(digest.description)
    expect(serializePosting(sections)).toBe(digest.description)
    expect(sections.map((section) => section.heading)).toEqual([
      'Role overview:',
      'Technical skills:',
      'Compensation:',
    ])
  })

  it('gives every section a heading that ends in a colon and fits in 80 characters', async () => {
    const digest = await structuredDigest(STRUCTURED)
    for (const section of parsePosting(digest.description)) {
      expect(section.heading).not.toBeNull()
      expect(section.heading!.endsWith(':')).toBe(true)
      expect(section.heading!.length).toBeLessThanOrEqual(80)
      expect(section.body.trim()).not.toBe('')
    }
  })

  it('rejects a salary the posting does not state, and falls back', async () => {
    // THE SHARPEST CASE. Every word here is the posting's; only the figure is
    // invented, and a figure is the one thing reorganising can never produce.
    const digest = await structuredDigest(
      'Compensation:\n- PHP 90,000 - 120,000 per month.'
    )
    expect(digest.description).toBe(digest.formatted)
    expect(digest.description).not.toContain('90,000')
    expect(digest.dropped.join(' ')).toContain('invented figures')
  })

  it('rejects an invented company or technology', async () => {
    const digest = await structuredDigest(
      'Technical skills:\n- Kubernetes and Docker\n\nRole overview:\n- Engineer at Google.'
    )
    expect(digest.description).toBe(digest.formatted)
    expect(digest.dropped.join(' ')).toContain('description (invented')
  })

  it('will not let an invented name in through a heading', async () => {
    // Heading vocabulary is exempt from grounding -- a posting that never says
    // "qualifications" must still be organisable under it. That exemption is a
    // fixed list of words, not a licence for the whole line.
    const digest = await structuredDigest('Working at Google:\n- React and TypeScript.')
    expect(digest.description).toBe(digest.formatted)
    expect(digest.dropped.join(' ')).toContain('google')
  })

  it('allows the connective words reorganising actually needs', async () => {
    // The summary's rule would reject all of these, and rejecting all of them
    // is how a restructure never ships: "including", "based" and "monthly"
    // are how scattered facts get joined, not things being made up.
    const digest = await structuredDigest(
      [
        'Role overview:',
        '- Senior Frontend Engineer at Acme Corp, based in Pasig City.',
        '',
        'Technical skills:',
        '- Building interfaces, including React and TypeScript.',
      ].join('\n')
    )
    expect(digest.dropped).toEqual([])
    expect(digest.description).toContain('including React and TypeScript')
  })

  it('rejects a description that is mostly its own words', async () => {
    // Grounded on every name and figure, and still not this posting: the
    // model stopped reorganising and started writing.
    const digest = await structuredDigest(
      [
        'Benefits:',
        '- Acme offers free catered lunches, gym membership and unlimited holiday.',
        '- React engineers also get quarterly wellness retreats, learning budget and commuter allowance.',
      ].join('\n')
    )
    expect(digest.description).toBe(digest.formatted)
    expect(digest.dropped.join(' ')).toContain('description (rewritten')
  })

  it('rejects prose the record could not render as sections', async () => {
    // No heading means one orphan block where a document was asked for, and
    // the per-section editor has nothing to address.
    const digest = await structuredDigest('A tidy paragraph about the role at Acme Corp.')
    expect(digest.description).toBe(digest.formatted)
    expect(digest.dropped.join(' ')).toContain('not headings and bullets')
  })

  it('rejects a heading with nothing under it', async () => {
    const digest = await structuredDigest('Role overview:\n- React.\n\nBenefits:')
    expect(digest.description).toBe(digest.formatted)
    expect(digest.dropped.join(' ')).toContain('not headings and bullets')
  })

  it('says so when the model answered without one', async () => {
    const digest = await digestPosting(POSTING, {
      config: configWith(),
      fetchImpl: vi.fn().mockResolvedValue(
        reply({ role: 'Senior Frontend Engineer' })
      ) as unknown as typeof fetch,
    })
    expect(digest.description).toBe(digest.formatted)
    expect(digest.dropped).toContain('description (missing)')
  })

  it('still returns a usable description with no model configured', async () => {
    // THE LOAD-BEARING CASE: CI, a fresh clone, and any deployment that has
    // not bought a provider key. No restructure, no empty box either.
    const digest = await digestPosting(POSTING, {
      config: configWith({ apiKey: undefined }),
      fetchImpl: vi.fn() as unknown as typeof fetch,
    })
    expect(digest.usedModel).toBe(false)
    expect(digest.description).toBe(digest.formatted)
    expect(digest.description).toContain('Senior Frontend Engineer')
    expect(digest.dropped).toEqual([])
  })
})

describe('grounding a number rather than a word', () => {
  it('reads a thousands separator as one figure, not two', () => {
    // Without closing the separator up, `50,000` is `50` and `000` -- and a
    // check that passes anything built out of small numbers is no check.
    expect(ungroundedNumbers('PHP 50,000 - 70,000', POSTING)).toEqual([])
    expect(ungroundedNumbers('PHP 90,000', POSTING)).toEqual(['90000'])
  })

  it('finds a figure nothing in the posting supports', () => {
    expect(ungroundedNumbers('- 15 days leave', POSTING)).toEqual(['15'])
  })
})
