import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

const SOURCE = 'src/components/v1/skiper51.tsx'

describe('the copied skiper51 source', () => {
  const src = readFileSync(SOURCE, 'utf8')

  it('is the carousel we think it is', () => {
    // Positive companion for the four negatives below: without this, a file
    // that had been emptied or renamed would satisfy every "not" assertion.
    expect(src).toContain('swiper')
    expect(src).toMatch(/export\s+(default\s+)?(function|const)\s+\w+|export\s+\{\s*\w+/)
  })

  it('imports no icons from lucide-react', () => {
    // Global Constraint: the icon set in @/components/icons is the only icon
    // vocabulary. shadcn copies source in-tree, so this is an edit, not a fork.
    expect(src).not.toMatch(/from\s+['"]lucide-react['"]/)
  })

  it('forwards a Swiper instance to its caller', () => {
    // 6.1a drives the carousel with setProgress(0..1). Without a handle on the
    // instance there is nothing to call it on.
    expect(src).toContain('onSwiper')
  })

  it('does not ship the creative effect shadow', () => {
    // This system is flat with hairline rules; the vendor default is shadowed.
    expect(src).not.toMatch(/shadow:\s*true/)
  })

  it('registers the Navigation module it configures', () => {
    // The vendor wires navigation={{nextEl,prevEl}} but ships modules={[
    // EffectCreative, Pagination, Autoplay]} -- no Navigation. Swiper silently
    // ignores the option, so the arrows render and do nothing. Our options set
    // showNavigation: true in BOTH modes, and with touch off in the scroll-
    // driven mode the arrows are the only control there is.
    // Asserted against the modules array specifically, not `toContain
    // ('Navigation')` -- the prop is named `showNavigation`, so a substring
    // check passes on the unedited vendor file and proves nothing. \b is what
    // stops `showNavigation` from satisfying it.
    expect(src).toMatch(/modules=\{\[[^\]]*\bNavigation\b/)
  })

  it('uses the one animation library this repo depends on', () => {
    // The registry pulled framer-motion in beside the repo's existing `motion`
    // -- the same library under its old name. Two copies is a real cost and
    // every other import in src/ is motion/react.
    expect(src).not.toMatch(/from\s+['"]framer-motion['"]/)
    expect(src).toContain('motion/react')
  })
})
