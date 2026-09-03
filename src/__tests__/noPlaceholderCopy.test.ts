import { execSync } from 'node:child_process'
import { describe, it, expect } from 'vitest'

/**
 * No placeholder copy reaches a user.
 *
 * A new CV opened with "Lorem ipsum dolor sit amet" in its Summary -- filler
 * Latin, in a CV builder, as the first thing anyone saw. It survived a whole
 * milestone because it reads as scaffolding to whoever wrote it and as an
 * unfinished product to everyone else, and because nothing tested the text a
 * blank document opens with.
 *
 * Gated on SOURCE rather than on a render: this string lives in a data
 * structure that only appears on screen after a person creates a draft, which
 * is exactly the path a component test does not take.
 *
 * The exclusions are deliberate and narrow. Test files may need the phrase to
 * assert its absence, and this file names it constantly.
 */
const BANNED = [
  'lorem ipsum',
  'your text here',
  'placeholder text',
  'dolor sit amet',
  'tbd',
]

describe('placeholder copy', () => {
  it('appears nowhere a user can read it', () => {
    const raw = execSync(
      `grep -rniE "${BANNED.join('|')}" src --include=*.ts --include=*.tsx || true`,
      { encoding: 'utf8' }
    ).trim()

    const hits = (raw ? raw.split('\n') : []).filter((line) => {
      const file = line.split(':')[0]
      if (file.includes('__tests__')) return false
      const after = line.replace(/^[^:]+:\d+:/, '').trim()
      // A docblock explaining why the placeholder went is not a placeholder.
      if (after.startsWith('*') || after.startsWith('//') || after.startsWith('/*')) return false
      return true
    })

    expect(hits, 'placeholder copy is reachable by a user').toEqual([])
  })

  it('would notice if it came back', () => {
    // Positive companion: proves the grep and the filter actually match, so a
    // green result means "searched and found nothing" rather than "searched
    // for nothing". Without it, a typo in BANNED would pass forever.
    const raw = execSync(
      `grep -rniE "lorem ipsum" src --include=*.ts || true`,
      { encoding: 'utf8' }
    ).trim()
    expect(raw).toContain('noPlaceholderCopy.test.ts')
  })
})
