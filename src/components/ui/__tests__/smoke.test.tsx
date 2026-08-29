import { readdirSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

/**
 * 58 shadcn components were installed; roughly a third are not rendered by any
 * screen. They are still typechecked and linted (tsconfig includes all of src),
 * but nothing else would notice if one of them threw on import -- a bad icon
 * substitution, a missing peer, a token that does not resolve.
 *
 * This is deliberately a smoke test and not a substitute for behaviour: the
 * components a screen actually uses get real tests in the task that adopts
 * them. What this catches is the class of breakage that installing 58 files at
 * once produces, which is import-time, not interaction-time.
 */
const FILES = readdirSync('src/components/ui').filter((f) => f.endsWith('.tsx'))

describe('every component in src/components/ui', () => {
  it('found the installed set', () => {
    // Positive companion: a glob that matched nothing would make the loop below
    // pass vacuously, which is exactly the assertion-that-cannot-fail defect
    // this project has shipped eight times.
    expect(FILES.length).toBeGreaterThan(60)
  })

  for (const file of FILES) {
    it(`imports without throwing: ${file}`, async () => {
      const mod = await import(`../${file}`)
      // An empty module means the file parsed but exported nothing -- which is
      // what a half-applied codemod leaves behind.
      expect(Object.keys(mod).length, `${file} exports nothing`).toBeGreaterThan(0)
    })
  }
})
