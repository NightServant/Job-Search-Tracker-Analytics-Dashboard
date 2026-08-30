import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

/**
 * tsconfig.json excluded every test file from `tsc --noEmit` for five
 * milestones. Four type errors reached main through it, including a fixture
 * missing a required field -- the same shape as the inline-literal fixtures
 * that hid a Critical for an entire milestone. When the exclusion was finally
 * lifted it surfaced 68 errors. Re-adding any of these entries should be a
 * deliberate, visible act, not something a tooling change does quietly.
 */
describe('tsconfig.json', () => {
  const raw = readFileSync('tsconfig.json', 'utf8')
  // Strip line comments before parsing rather than assuming strict JSON --
  // some editors add them on save.
  const config = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, ''))

  it('has an exclude array at all', () => {
    // Positive companion: without this, deleting `exclude` entirely would make
    // every assertion below pass vacuously while changing nothing about tsc.
    expect(Array.isArray(config.exclude)).toBe(true)
  })

  it('still typechecks the app source it always did', () => {
    expect(config.include).toContain('src')
  })

  it('does not exclude test files or fixtures from the typecheck', () => {
    const excluded: string[] = config.exclude
    for (const pattern of excluded) {
      expect(
        pattern,
        `tsconfig.json excludes "${pattern}", which hides test files from tsc`
      ).not.toMatch(/__tests__|src\/test|\.test\.tsx?$/)
    }
  })
})
