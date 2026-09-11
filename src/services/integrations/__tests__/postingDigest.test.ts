import { describe, it, expect, vi } from 'vitest'
import {
  brochurePhrases,
  digestPosting,
  groundFields,
  ungroundedWords,
} from '../postingDigest'
import { formatPostingText, extractiveSummary } from '../../postingFormat'
import type { IntegrationConfig } from '../config'

function configWith(tailoring: Partial<IntegrationConfig['tailoring']> = {}): IntegrationConfig {
  return {
    formatex: { baseUrl: 'https://formatex.test/api/v1' },
    tailoring: {
      baseUrl: 'https://llm.test/v1',
      apiKey: 'k',
      model: 'test-model',
      ...tailoring,
    },
    esco: { baseUrl: 'https://esco.test/api', enabled: true },
    grammar: { baseUrl: 'https://grammar.test/v1/check' },
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

  it('summarises extractively, so it cannot invent', () => {
    const summary = extractiveSummary('First sentence here. Second one. Third one.')
    expect(summary).toBe('First sentence here. Second one.')
  })

  describe('and does not run away with itself', () => {
    /**
     * THE 810-CHARACTER "SUMMARY", measured 2026-09-07 on a real posting. The
     * first version flattened newlines to spaces and split on `.!?` -- but a
     * posting is mostly bullets and bullets carry no full stop, so the first
     * "sentence" ran from the top of the advert to the first period several
     * paragraphs down.
     */
    const BULLETED = `Who Thrives Here:
Strong understanding of DNS, SEO and accessibility
Experience with GoDaddy, WIX and related website platforms
Bachelor's degree in Computer Science or related fields
Must be willing to work onsite in Taguig
Job Responsibilities:
Engage with customers by telephone, email and chat.`

    it('treats a line break as the end of a unit', () => {
      const summary = extractiveSummary(BULLETED, 2)
      expect(summary.length).toBeLessThan(200)
      expect(summary).not.toContain('Taguig')
    })

    it('skips a heading, which is a label rather than a fact', () => {
      // A summary that opens "Who Thrives Here:" has spent its first line
      // saying nothing.
      expect(extractiveSummary(BULLETED, 2)).not.toContain('Who Thrives Here')
      expect(extractiveSummary(BULLETED, 2)).not.toContain('Job Responsibilities')
    })

    it('punctuates the bullets it joins', () => {
      // Two bullets joined by a space read as one run-on. The words are the
      // posting's; the full stops are ours.
      const summary = extractiveSummary(BULLETED, 2)
      expect(summary).toContain('accessibility. Experience with')
    })

    it('caps a single enormous line rather than printing it whole', () => {
      const long = `${'word '.repeat(200)}.`
      const summary = extractiveSummary(long, 2)
      expect(summary.length).toBeLessThanOrEqual(281)
      expect(summary.endsWith('…')).toBe(true)
    })

    it('does not cut a word in half', () => {
      const summary = extractiveSummary(`${'alpha '.repeat(120)}.`, 2)
      expect(summary).not.toMatch(/alph…$/)
    })
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

describe('detecting an invented summary', () => {
  it('finds words the posting never used', () => {
    expect(ungroundedWords('Great Kubernetes opportunity', POSTING)).toContain('kubernetes')
  })

  it('tolerates a plural on either side, which is grammar not invention', () => {
    // The posting says "interfaces"; a summary saying "interface" has
    // invented nothing.
    expect(ungroundedWords('build interface', POSTING)).toEqual([])
  })

  it('does not read sentence punctuation as part of a word', () => {
    // "Acme Corp." at the end of a line must still match "Acme Corp" -- the
    // failure this guards made grounding reject the truth while looking like
    // it was working.
    expect(ungroundedWords('Acme Corp', POSTING)).toEqual([])
  })

  it('still keeps a dot inside a name', () => {
    expect(ungroundedWords('node.js', 'We use node.js here.')).toEqual([])
  })

  it('passes a summary built from the posting', () => {
    expect(ungroundedWords('Senior Frontend Engineer at Acme Corp, hybrid in Pasig City', POSTING))
      .toEqual([])
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
      expect(digest.summary).toBeTruthy()
    })
  })

  it('keeps a grounded reply', async () => {
    const digest = await digestPosting(POSTING, {
      config: configWith(),
      fetchImpl: vi.fn().mockResolvedValue(
        reply({
          summary: 'Senior Frontend Engineer at Acme Corp.',
          role: 'Senior Frontend Engineer',
          company: 'Acme Corp',
          salary_min: 50000,
          tech_stack: ['React'],
        })
      ) as unknown as typeof fetch,
    })
    expect(digest.usedModel).toBe(true)
    expect(digest.fields.role).toBe('Senior Frontend Engineer')
    expect(digest.summary).toBe('Senior Frontend Engineer at Acme Corp.')
    expect(digest.dropped).toEqual([])
  })

  it('throws away an invented summary and says so', async () => {
    const digest = await digestPosting(POSTING, {
      config: configWith(),
      fetchImpl: vi.fn().mockResolvedValue(
        reply({ summary: 'A Kubernetes role at Google paying generously.' })
      ) as unknown as typeof fetch,
    })
    // Falls back to the extractive summary, which cannot invent.
    expect(digest.summary).not.toContain('Google')
    expect(digest.dropped.join(' ')).toContain('summary (invented')
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

describe('keeping the advert out of the summary', () => {
  /**
   * THE GAP GROUNDING CANNOT CLOSE. A posting that calls itself "an exciting
   * opportunity" makes those words part of its own vocabulary, so a summary
   * echoing them passes every grounding check and still reads like a brochure
   * rather than like a person saying what the job is.
   */
  const SELLING = `An exciting opportunity for a rockstar Senior Frontend Engineer!
    Join our dynamic team at Acme Corp in Pasig City. We are looking for someone
    passionate about React and TypeScript. Salary: PHP 50,000 - 70,000.`

  it('spots the advert phrases', () => {
    expect(brochurePhrases('An exciting opportunity with a dynamic team'))
      .toEqual(expect.arrayContaining(['exciting opportunity', 'dynamic team']))
  })

  it('leaves a plain factual summary alone', () => {
    expect(brochurePhrases('Senior Frontend Engineer at Acme Corp, hybrid in Pasig.')).toEqual([])
  })

  it('rejects a grounded summary that is still selling', async () => {
    const digest = await digestPosting(SELLING, {
      config: configWith(),
      fetchImpl: vi.fn().mockResolvedValue(
        reply({ summary: 'An exciting opportunity for a rockstar engineer at Acme Corp.' })
      ) as unknown as typeof fetch,
    })
    // Every one of those words IS in the posting, so grounding passes. This is
    // the second gate.
    expect(digest.summary).not.toContain('exciting opportunity')
    expect(digest.dropped.join(' ')).toContain('advert copy')
  })

  it('keeps a summary that reports rather than sells', async () => {
    const digest = await digestPosting(SELLING, {
      config: configWith(),
      fetchImpl: vi.fn().mockResolvedValue(
        reply({ summary: 'Senior Frontend Engineer at Acme Corp in Pasig City. React and TypeScript, PHP 50,000 - 70,000.' })
      ) as unknown as typeof fetch,
    })
    expect(digest.summary).toContain('Senior Frontend Engineer')
    expect(digest.dropped).toEqual([])
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
