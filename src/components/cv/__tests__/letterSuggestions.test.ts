import { describe, it, expect } from 'vitest'
import { letterReview, type LetterFindingId } from '../letterSuggestions'

/**
 * The cover letter check: what it flags, and -- as much -- what it leaves
 * alone.
 *
 * THE QUIET HALF IS THE HALF THAT MATTERS HERE. Ten rules over one piece of
 * prose is a machine for producing false positives, and a pane that flags a
 * good letter is worse than no pane: it gets closed once and never reopened.
 * So there is one letter below that is deliberately GOOD, every rule is
 * checked against it, and every "fires" case is that same letter with one
 * thing changed -- which is what makes each assertion a statement about the
 * rule rather than about the fixture.
 *
 * THRESHOLDS ARE NOT ASSERTED TWICE. `letterSuggestions` writes each number
 * down next to the constant it sets; repeating them here would only pin the
 * arithmetic, and the numbers most worth defending (400 words, 3 paragraphs,
 * 3:1 pronouns) are judgements that may move. What is pinned is the ORDERING
 * either side of them: this trips, that does not.
 */

/**
 * A letter that should produce nothing at all.
 *
 * Written to clear every rule on purpose: a named addressee, an opening that
 * is about them rather than about the act of applying, four body paragraphs,
 * numbers in the evidence, no hollow adjectives, roughly balanced pronouns,
 * no date ranges, and a close that asks for something. 207 words.
 *
 * IT ALSO CARRIES THE NEAR-MISS for the opening rule: "I am writing" appears
 * in the second sentence of the first paragraph, which is ordinary English
 * and must not trip a rule about how a letter OPENS.
 */
const GOOD = [
  'Dear Amara Okafor,',
  'Your posting for the payments engineer role mentions that reconciliation runs overnight and still needs a human in the morning. That is the problem I spent last year on, and it is the reason I am writing to you rather than to a list of companies.',
  'At Meridian I rebuilt the settlement pipeline that your team would recognise: 40 million rows a night, reconciled in 9 minutes instead of 6 hours. I did that by moving the matching step off the application and into the database, which meant the on-call rotation stopped being woken by it. Your engineering blog describes a similar bottleneck, so you will know how much of that work is careful rather than clever.',
  'Before that I spent three years on internal tooling, which is where I learned to ask what a report is actually used for before building it. That habit is what makes me useful early: you get somebody who can read a schema and say which of its assumptions has drifted.',
  'I would welcome a conversation about where your reconciliation work goes next, and I am free most afternoons this month. If it is easier, I am happy to walk through the pipeline diagram first.',
  'Kind regards,',
  'Gabe',
].join('\n\n')

const EVIDENCE_SENTENCE =
  '40 million rows a night, reconciled in 9 minutes instead of 6 hours'
const CLOSING_PARAGRAPH =
  'I would welcome a conversation about where your reconciliation work goes next, and I am free most afternoons this month. If it is easier, I am happy to walk through the pipeline diagram first.'

const idsOf = (text: string): LetterFindingId[] =>
  letterReview(text).findings.map((finding) => finding.id)

describe('the cover letter check', () => {
  it('says nothing about a letter that is already doing the job', () => {
    const review = letterReview(GOOD)
    expect(review.words).toBe(207)
    expect(review.findings).toEqual([])
  })

  it('has nothing to say about an empty document', () => {
    // Same call `proofreadScore` and `writingMetrics` make: an unwritten
    // letter is not a bad one, and every rule below would be dividing by or
    // indexing into something that is not there.
    expect(letterReview('')).toEqual({ words: 0, findings: [] })
    expect(letterReview('   \n\n  ').findings).toEqual([])
  })

  describe('the addressee', () => {
    it('flags the greeting every other applicant also sent', () => {
      const review = letterReview(GOOD.replace('Dear Amara Okafor,', 'To whom it may concern,'))
      const finding = review.findings.find((one) => one.id === 'addressee')
      expect(finding?.label).toBe('generic addressee')
      // THE LETTER'S OWN WORDS IN THE FINDING, not a rule from a list. This is
      // the difference Gabe asked for after the ATS ring shipped as a number.
      expect(finding?.problem).toContain('to whom it may concern')
      expect(finding?.fix).toMatch(/name/i)
    })

    it('flags a company named after a generic greeting, because the greeting is still generic', () => {
      expect(
        idsOf(GOOD.replace('Dear Amara Okafor,', 'Dear Hiring Manager at Meridian,'))
      ).toContain('addressee')
    })

    it('flags a letter with no greeting at all, and says so differently', () => {
      const review = letterReview(GOOD.replace('Dear Amara Okafor,\n\n', ''))
      expect(review.findings.find((one) => one.id === 'addressee')?.label).toBe('no addressee')
    })

    it('leaves a named greeting alone', () => {
      expect(idsOf(GOOD)).not.toContain('addressee')
      expect(idsOf(GOOD.replace('Dear Amara Okafor,', 'Hello Amara,'))).not.toContain('addressee')
    })
  })

  describe('the opening line', () => {
    it('flags an opening that only says a cover letter has arrived', () => {
      const opened = GOOD.replace(
        'Your posting for the payments engineer role mentions',
        'I am writing to apply for the payments engineer role, which mentions'
      )
      expect(idsOf(opened)).toContain('opening')
    })

    it('leaves "I am writing" alone anywhere but the first sentence', () => {
      // GOOD contains it in the second sentence of the first paragraph. A rule
      // about openings that fires on the middle of a letter is a rule nobody
      // can act on without deleting a perfectly good sentence.
      expect(GOOD).toContain('the reason I am writing to you')
      expect(idsOf(GOOD)).not.toContain('opening')
    })
  })

  describe('leftover template', () => {
    it('flags a bracketed placeholder that survived the edit', () => {
      const review = letterReview(GOOD.replace('Meridian', '[Previous Company]'))
      expect(review.findings.find((one) => one.id === 'placeholders')?.problem).toContain(
        '[Previous Company]'
      )
    })

    it('flags "your company" standing in for a name', () => {
      expect(idsOf(GOOD.replace('your team would', 'your company would'))).toContain(
        'placeholders'
      )
    })

    it('leaves ordinary prose alone, including "your team"', () => {
      expect(idsOf(GOOD)).not.toContain('placeholders')
    })
  })

  describe('length', () => {
    it('flags a letter that runs past the page, and says how much to cut', () => {
      const padded = `${GOOD}\n\n${'The settlement pipeline also needed a second reconciliation pass over the archive, which took another quarter and taught me how much of this work is waiting for a slow query to admit what it is doing. '.repeat(
        8
      )}`
      const finding = letterReview(padded).findings.find((one) => one.id === 'length')
      expect(finding?.label).toBe('runs long')
      expect(finding?.fix).toMatch(/Cut roughly \d+ words/)
    })

    it('flags a letter too short to have made an argument', () => {
      const stub = [
        'Dear Amara Okafor,',
        'I saw the payments engineer role and would like to be considered for it. My CV is attached and covers the rest of it.',
        'I would welcome a conversation whenever suits you, and I am free most afternoons this month.',
      ].join('\n\n')
      expect(letterReview(stub).findings.find((one) => one.id === 'length')?.label).toBe(
        'runs short'
      )
    })
  })

  describe('the shape of the body', () => {
    it('flags a letter with fewer paragraphs than an argument needs', () => {
      const thin = [
        'Dear Amara Okafor,',
        'Your posting for the payments engineer role mentions that reconciliation runs overnight and still needs a human in the morning. That is the problem I spent last year on, and it is why I am here.',
        CLOSING_PARAGRAPH,
      ].join('\n\n')
      expect(idsOf(thin)).toContain('shape')
    })

    it('flags a paragraph long enough to be skipped rather than read', () => {
      const wall = GOOD.replace(
        'At Meridian I rebuilt',
        'At Meridian I rebuilt the settlement pipeline three separate times over as many quarters, each attempt teaching the team something the last one had hidden, and the version that finally survived contract with production was neither the fastest nor the cleverest but simply the one whose failure modes we had written down in advance and could therefore explain to somebody at three in the morning without opening a single dashboard, which is a property that turns out to matter far more than throughput once the rotation is carrying it every night of the week for months at a time. At Meridian I rebuilt'
      )
      const finding = letterReview(wall).findings.find((one) => one.id === 'shape')
      expect(finding?.problem).toMatch(/longest paragraph runs \d+ words/)
    })

    it('leaves a four-paragraph letter alone', () => {
      expect(idsOf(GOOD)).not.toContain('shape')
    })
  })

  describe('evidence', () => {
    it('flags a letter with no numbers in it at all', () => {
      const vague = GOOD.replace(
        EVIDENCE_SENTENCE,
        'a great many rows a night, reconciled in minutes instead of hours'
      )
      expect(idsOf(vague)).toContain('evidence')
    })

    it('leaves a letter that measures something alone', () => {
      expect(idsOf(GOOD)).not.toContain('evidence')
    })

    it('stays quiet on a draft that is still two lines long', () => {
      // The whole-letter rules have a floor: a pane that is wrong for the
      // first two minutes of writing is a pane that gets closed.
      const draft = 'Dear Amara Okafor,\n\nI saw the payments engineer role and wanted to write.'
      const ids = idsOf(draft)
      expect(ids).not.toContain('evidence')
      expect(ids).not.toContain('balance')
      expect(ids).not.toContain('closing')
    })
  })

  describe('adjectives standing in for evidence', () => {
    it('flags two hollow claims', () => {
      const puffed = GOOD.replace(
        'careful rather than clever',
        'the work of a passionate team player'
      )
      const finding = letterReview(puffed).findings.find((one) => one.id === 'claims')
      expect(finding?.problem).toContain('"passionate"')
      expect(finding?.problem).toContain('"team player"')
    })

    it('leaves a single one alone, because one is a turn of phrase', () => {
      const once = GOOD.replace('careful rather than clever', 'the work of a passionate engineer')
      expect(idsOf(once)).not.toContain('claims')
    })
  })

  describe('who the letter is about', () => {
    it('flags a letter that never addresses anybody', () => {
      const monologue = [
        'Dear Amara Okafor,',
        'I have spent my career building payment systems, and I believe my experience speaks for itself. I led my team through a migration that I designed myself, and I delivered it in 4 months. I then took on the on-call rotation, which I improved by rewriting the alerting rules that I had inherited.',
        'I am looking for my next role now, and I think this one suits me. I would welcome a conversation whenever it is convenient, and I can start within a month.',
      ].join('\n\n')
      const finding = letterReview(monologue).findings.find((one) => one.id === 'balance')
      expect(finding?.problem).toMatch(/\d+ mentions of yourself against \d+ of them/)
    })

    it('leaves a letter that talks to somebody alone', () => {
      expect(idsOf(GOOD)).not.toContain('balance')
    })
  })

  describe('repeating the CV', () => {
    it('flags a work history pasted into a letter', () => {
      const history = GOOD.replace(
        'three years on internal tooling',
        'the years from 2018 to 2021, and again through 2023, on internal tooling'
      )
      expect(idsOf(history)).toContain('restates')
    })

    it('flags a bulleted list, which is a CV page in disguise', () => {
      const bulleted = `${GOOD}\n\n- Rebuilt the settlement pipeline\n- Cut reconciliation to nine minutes\n- Ran the on-call rotation`
      expect(idsOf(bulleted)).toContain('restates')
    })

    it('leaves one or two dates alone', () => {
      expect(idsOf(GOOD.replace('last year', '2024'))).not.toContain('restates')
    })
  })

  describe('the close', () => {
    it('flags a letter that ends without asking for anything', () => {
      const petered = GOOD.replace(
        CLOSING_PARAGRAPH,
        'Thank you very much for your time, and for reading this letter all the way through to the very end of it on what is certainly a busy day for the whole team.'
      )
      expect(idsOf(petered)).toContain('closing')
    })

    it('leaves a close that proposes a next step alone', () => {
      expect(idsOf(GOOD)).not.toContain('closing')
    })
  })

  it('gives every finding both halves: what is wrong and what to do', () => {
    // The one property that holds across all ten rules, and the correction
    // Gabe already made once against a bare ATS number.
    const broken = [
      'To whom it may concern,',
      'I am writing to apply for the [Role] at your company. I am a passionate and hardworking self-starter.',
      'I worked there from 2018 to 2021 and again in 2023.',
    ].join('\n\n')
    const { findings } = letterReview(broken)
    expect(findings.length).toBeGreaterThan(3)
    for (const finding of findings) {
      expect(finding.problem.length).toBeGreaterThan(20)
      expect(finding.fix.length).toBeGreaterThan(20)
      expect(finding.problem).not.toBe(finding.fix)
    }
  })
})
