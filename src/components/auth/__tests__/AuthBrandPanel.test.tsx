import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AuthBrandPanel } from '../AuthBrandPanel'

const SOURCE = readFileSync('src/components/auth/AuthBrandPanel.tsx', 'utf8')

/**
 * The panel this replaced was `bg-[#050507]` with `#fafafa` text in BOTH
 * themes, which is the deviation from Figma 50:566 / 101:2032 that Gabe
 * spotted. Those two frames are the same layers with the Semantic variable
 * collection switched, so every colour in them is a token -- and a token is
 * exactly what a literal is not.
 */
describe('the auth brand panel', () => {
  it('paints from tokens, never from colour literals', () => {
    // Asserted on SOURCE, not on computed style: jsdom has no stylesheet, so
    // a rendered `bg-[#050507]` and a rendered `bg-bg-surface` both compute to
    // nothing. The class is the artefact under test.
    //
    // The class position matters -- `[#050507]` inside a docblock explaining
    // why the literal went would fail a bare substring check, which would
    // penalise the comment that exists to stop it coming back.
    const classAttrs = SOURCE.match(/className="[^"]*"/g) ?? []
    expect(classAttrs.length).toBeGreaterThan(0)
    for (const attr of classAttrs) {
      expect(attr, 'a colour literal survives in a className').not.toMatch(
        /\[(#|rgba?\()/
      )
    }
  })

  it('takes its surface, rule and text from the semantic scale', () => {
    const { container } = render(<AuthBrandPanel />)
    const panel = container.querySelector('[data-brand-panel]') as HTMLElement
    expect(panel).not.toBeNull()

    // Positive companion: without these the negative above holds for a panel
    // that sets no colour at all.
    expect(panel.className).toContain('bg-bg-surface')
    expect(panel.className).toContain('border-border-subtle')
    expect(container.innerHTML).toContain('text-text-primary')
    expect(container.innerHTML).toContain('text-text-secondary')
    expect(container.innerHTML).toContain('text-text-muted')
  })

  it('holds half the split and refuses to shrink out of it', () => {
    // Gabe asked for 50/50 on 2026-09-03, over Figma's 620/820. `w-` alone
    // would not hold it: a flex item defaults to shrink:1, so the declared
    // width is only a starting point once either column's content asks for
    // more room.
    const { container } = render(<AuthBrandPanel />)
    const cls = (container.querySelector('[data-brand-panel]') as HTMLElement).className
    expect(cls).toContain('basis-1/2')
    expect(cls).toContain('shrink-0')
    expect(cls).not.toMatch(/basis-\[\d+%\]/)
  })

  it('lets the lockup follow the theme instead of pinning it to one palette', () => {
    // The old panel forced the mark's dark-mode colours and redefined
    // --color-accent-default, because accent-700 fails contrast on near-black.
    // On bg-surface that is no longer true in either theme, and keeping the
    // override would pin the mark to one theme's palette on a ground that
    // follows both.
    const { container } = render(<AuthBrandPanel />)

    // The OVERRIDE, not the reference. BrandMark's active cell legitimately
    // binds `fill="var(--color-accent-default)"` -- that binding IS the theme
    // awareness. What must not come back is the arbitrary-property form that
    // REDEFINES the token for this subtree, `[--color-accent-default:...]`.
    expect(container.innerHTML).not.toMatch(/\[--color-accent-default:/)
    expect(container.innerHTML).not.toContain('accent-400')
    // Positive companion: the mark is still bound to the token, so the
    // negatives above cannot pass on a panel that renders no mark at all.
    expect(container.innerHTML).toContain('var(--color-accent-default)')
  })
})
