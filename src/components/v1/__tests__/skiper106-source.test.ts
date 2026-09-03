import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

const SOURCE = 'src/components/v1/skiper106.tsx'

describe('the copied skiper106 source', () => {
  const src = readFileSync(SOURCE, 'utf8')

  it('is the smooth-caret input we think it is', () => {
    // Positive companion for the negatives below: without it, a file that had
    // been emptied would satisfy every "not" assertion here.
    expect(src).toContain('SmoothInput')
    expect(src).toMatch(/export\s*\{[^}]*SmoothInput/)
  })

  it('exports nothing named Input', () => {
    // The vendor ships its own `Input` beside SmoothInput. There is no literal
    // module collision -- ours is @/components/ui/input -- but two components
    // called Input in one codebase is how the wrong one gets imported six
    // months from now.
    expect(src).not.toMatch(/export\s+(const|function)\s+Input\b/)
    expect(src).not.toMatch(/export\s*\{[^}]*\bInput\b[^}]*\}/)
  })

  it('imports no icons from lucide-react', () => {
    expect(src).not.toMatch(/from\s+['"]lucide-react['"]/)
  })

  it('uses the one animation library this repo depends on', () => {
    // The registry pulls framer-motion in beside the `motion` package this
    // repo already uses -- the same library under its old name.
    expect(src).not.toMatch(/from\s+['"]framer-motion['"]/)
    expect(src).toContain('motion/react')
  })

  it('carries no dialkit control panel', () => {
    // dialkit is a live-tweak GUI, and useDialKit does not merely display
    // values -- it OVERRIDES them. The vendor reads type, placeholder, font
    // size and spring config from the panel rather than from props, so an
    // email field would take its type and placeholder from a dev tool.
    expect(src).not.toMatch(/from\s+['"]dialkit['"]/)
    // The call, not the word: this file's own docblock explains why the panel
    // was removed, and a bare substring check would fail on the explanation.
    expect(src).not.toMatch(/useDialKit\s*\(/)
  })

  it('reads no browser global while the module is being evaluated', () => {
    // The vendor computes its password glyph from navigator.userAgent in a
    // top-level const. There is no `navigator` on the server, so importing
    // this file anywhere in a Next app throws during render before a component
    // mounts.
    //
    // Asserted against top-level ASSIGNMENTS specifically, not against the
    // string "navigator" anywhere before the component: reading it inside a
    // function body is fine and is exactly the fix, so a looser check would
    // fail on the corrected file and force the guard to be deleted.
    expect(src).not.toMatch(/^(?:const|let|var)\s+\w+\s*=[^\n]*\b(?:navigator|window|document)\./m)
  })

  it('respects the 4px radius cap', () => {
    // The vendor draws rounded-2xl. This system caps at 4px everywhere.
    // className positions only. The docblock names the vendor's rounded-2xl
    // when explaining why it went, and prose is not a class.
    expect(src).not.toMatch(/["'\s]rounded-(2xl|3xl|xl|lg|full)\b/)
  })
})
