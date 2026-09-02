import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { MD_BREAKPOINT_PX } from '../breakpoints'

describe('the shared breakpoint', () => {
  it('is the md breakpoint the rest of the app already uses', () => {
    expect(MD_BREAKPOINT_PX).toBe(768)
  })

  it('is not re-declared as a literal beside its own consumers', () => {
    // The whole reason it lives in its own module. A second `= 768` in
    // landingNav or pinnedScroll is how the navbar and the pin end up
    // disagreeing about what "mobile" means after someone tunes one of them.
    for (const file of ['src/lib/landingNav.ts', 'src/lib/pinnedScroll.ts']) {
      let src: string
      try {
        src = readFileSync(file, 'utf8')
      } catch {
        continue // pinnedScroll.ts arrives with M6 Task 3
      }
      expect(src, `${file} declares its own 768`).not.toMatch(/=\s*768\b/)
    }
  })
})
