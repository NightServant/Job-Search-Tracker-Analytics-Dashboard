import { describe, it, expect } from 'vitest'
import { writingMetrics, type WritingMetricId } from '../writingMetrics'
import { toIssues } from '@/services/grammar'

const styleIssues = (n: number) =>
  toIssues({
    matches: Array.from({ length: n }, (_, i) => ({
      offset: i,
      length: 1,
      replacements: [],
      rule: { issueType: 'style', category: { id: 'REDUNDANCY' } },
    })),
  })

const valueOf = (text: string, id: WritingMetricId, issues = toIssues({ matches: [] })) =>
  writingMetrics(text, issues).find((metric) => metric.id === id)!.value

/** Four 10-word sentences: the shape a CV bullet list actually has. */
const SHORT = 'Led the migration to a new service. '.repeat(8)

/** One idea per sentence, but forty words before the full stop. */
const LONG = ('Led the migration of the billing service to a new platform while also ' +
  'coordinating with three separate teams across two regions and documenting every ' +
  'decision that was taken along the way for the benefit of anyone reading later on. ').repeat(4)

describe('writingMetrics', () => {
  it('is 100 across the board for an empty document rather than NaN', () => {
    // Every one of the four divides by a word or sentence count. NaN renders
    // as "NaN%" instead of failing loudly, which is the way this goes wrong.
    for (const metric of writingMetrics('', [])) {
      expect(metric.value).toBe(100)
    }
  })

  it('scores a conversational paragraph below a formal one on formality', () => {
    const informal =
      "I'm really pleased with the stuff we've built, and you'll see we've got lots to show."
    const formal =
      'The migration reduced billing latency by forty percent and removed two legacy services.'
    expect(valueOf(informal, 'formality')).toBeLessThan(valueOf(formal, 'formality'))
  })

  it('scores a wall of forty-word sentences below short ones on clarity', () => {
    expect(valueOf(LONG, 'clarity')).toBeLessThan(valueOf(SHORT, 'clarity'))
  })

  it('counts style findings against clarity as well as sentence length', () => {
    // Same prose, different findings: the density of REDUNDANCY and STYLE
    // rules is the other half of what clarity means here.
    expect(valueOf(SHORT, 'clarity', styleIssues(12))).toBeLessThan(valueOf(SHORT, 'clarity'))
  })

  it('scores padded prose below tight prose on conciseness', () => {
    const padded =
      'I was responsible for a variety of tasks and was able to work on the project in order to help the team.'
    const tight = 'Rebuilt the payment pipeline, cutting settlement time from three days to four hours.'
    expect(valueOf(padded, 'conciseness')).toBeLessThan(valueOf(tight, 'conciseness'))
  })

  it('stays inside 0..100 on input built to break it', () => {
    // A single unpunctuated run of the worst of everything: no sentence
    // boundary, filler stacked on filler, informal markers throughout. Each
    // penalty on its own would overshoot; together they have to floor at 0.
    const worst = "well basically I'm really pretty sure we've got lots of stuff that I was responsible for in order to help you and your team with a variety of things ".repeat(20)
    for (const metric of writingMetrics(worst, styleIssues(400))) {
      expect(metric.value).toBeGreaterThanOrEqual(0)
      expect(metric.value).toBeLessThanOrEqual(100)
    }

    // And the other end: clean, clipped, nothing to deduct.
    for (const metric of writingMetrics(SHORT, [])) {
      expect(metric.value).toBeLessThanOrEqual(100)
      expect(metric.value).toBeGreaterThanOrEqual(0)
    }
  })

  it('ranks a run-on below CV prose on readability, and neither of them at zero', () => {
    // THE REGRESSION THIS PINS was Flesch's own formula, which scored a real
    // 949-word CV at 0% and ranked a padded 46-word run-on ABOVE it -- the
    // 84.6 syllable coefficient swamping everything a reader can act on. See
    // the docblock. Both halves matter: the ordering, and the floor.
    const cv =
      'Computer Science graduate with hands-on experience building responsive web ' +
      'applications.\nBuilt eight independent projects using React, Next.js and Laravel.\n' +
      'Delivered an accessible component library for a university client.\n' +
      'Automated the deployment pipeline, cutting release time in half.'
    const runOn =
      'Responsible for the migration of legacy systems in order to reduce costs, and was ' +
      'able to work on a variety of projects as well as the ability to lead a number of ' +
      'teams tasked with delivery across several regions of the business over an ' +
      'extended period.'

    expect(valueOf(runOn, 'readability')).toBeLessThan(valueOf(cv, 'readability'))
    expect(valueOf(cv, 'readability')).toBeGreaterThan(0)
  })

  it('carries a comment that changes with the band', () => {
    // The comment is the point of the section -- a percentage with no line
    // under it is the two counters again.
    const bad = writingMetrics(
      "I'm really not sure we've got the stuff, but you'll see lots of it. ".repeat(10),
      []
    ).find((metric) => metric.id === 'formality')!
    const good = writingMetrics(
      'The migration removed two legacy services and reduced latency by forty percent. ',
      []
    ).find((metric) => metric.id === 'formality')!

    expect(bad.comment).not.toBe(good.comment)
    expect(bad.comment).toBeTruthy()
  })
})
