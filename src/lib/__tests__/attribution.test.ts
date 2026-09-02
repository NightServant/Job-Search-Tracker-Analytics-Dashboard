import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { SKIPER_ATTRIBUTION } from '../attribution'

describe('third-party attribution', () => {
  it('lists every Skiper component whose source ships in this repo', () => {
    // Free-tier Skiper components require attribution. skiper51 lands in M6
    // Task 1 and skiper106 in Task 4; both are copied into src/components/v1/.
    // skiper4 and skiper26 are NOT here: their source was never installed --
    // ui/theme-toggle.tsx was written against skiper4's technique and its
    // docblock records why skiper26 was declined. They are credited as
    // inspiration in the README prose, which is a courtesy, not this
    // obligation.
    expect(SKIPER_ATTRIBUTION.map((e) => e.id)).toEqual(['skiper51', 'skiper106'])
  })

  it('gives every entry a credit sentence, a name and a link', () => {
    expect(SKIPER_ATTRIBUTION.length).toBeGreaterThan(0)
    for (const entry of SKIPER_ATTRIBUTION) {
      expect(entry.name.length).toBeGreaterThan(0)
      expect(entry.credit.length).toBeGreaterThan(0)
      expect(entry.href).toMatch(/^https:\/\//)
    }
  })

  it('reproduces every credit sentence verbatim in the README', () => {
    // The licence obligation is on what ships. The landing footer renders
    // these same strings (Task 2), so one edit keeps both honest.
    const readme = readFileSync('README.md', 'utf8')
    expect(readme).toContain('## Attribution')
    for (const entry of SKIPER_ATTRIBUTION) {
      expect(readme, `README is missing the credit for ${entry.id}`).toContain(entry.credit)
    }
  })

  it('names the upstreams the roadmap requires', () => {
    const readme = readFileSync('README.md', 'utf8')
    expect(readme).toContain('Skiper UI')
    expect(readme).toContain('Swiper.js')
    expect(readme).toContain('AarzooAly')
    expect(readme).toContain('toggles.dev')
    expect(readme).toContain('rudrodip/theme-toggle-effect')
  })
})
