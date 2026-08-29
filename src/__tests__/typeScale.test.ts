import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

/**
 * The scale shipped with size, line-height and tracking and no weight at all,
 * so every heading rendered at the body's 400 and the levels read as flat.
 * These are the weights bound in Figma node 13:8, read on 2026-08-29.
 */
const EXPECTED: Record<string, string> = {
  'display-xl': '700', 'display-l': '700', 'display-m': '700',
  'heading-l': '700', 'heading-m': '700', 'heading-s': '700',
  'body-l': '400', 'body-m': '400', 'body-s': '400',
  'label-m': '400', 'label-caps': '700', 'caption': '500',
  'data-xl': '400', 'data-l': '400', 'data-m': '400', 'data-s': '400',
}

describe('the type scale', () => {
  const css = readFileSync('src/index.css', 'utf8')

  it('declares a size for every entry', () => {
    // Positive companion: without this, renaming a token would make its weight
    // assertion pass by matching nothing at all.
    for (const name of Object.keys(EXPECTED)) {
      expect(css, `--text-${name} is missing`).toContain(`--text-${name}:`)
    }
  })

  it('declares a font weight for every entry', () => {
    for (const [name, weight] of Object.entries(EXPECTED)) {
      expect(css, `--text-${name}--font-weight is missing or wrong`).toContain(
        `--text-${name}--font-weight: ${weight};`
      )
    }
  })

  it('caps the radius at 4px', () => {
    expect(css).toContain('--radius: 4px;')
  })

  it('maps shadcn primary onto the design system accent, not the legacy indigo', () => {
    expect(css).toContain('--color-primary: var(--color-accent-default);')
    // The legacy indigo ramp is still present for LoginPage (deleted in M6),
    // so this asserts the alias points at accent rather than that indigo is gone.
    expect(css).not.toMatch(/--color-primary:\s*(#|var\(--color-primary-)/)
  })

  it('resolves the shadcn surface names through the semantic layer, not the legacy palette', () => {
    // `@layer base` applies two of these app-wide, and all 58 installed
    // components paint themselves with them. Left as hsl(var(--background))
    // they would have rendered the pre-M4 blue-grey palette while every M4
    // component rendered the real one.
    for (const [name, target] of [
      ['background', 'bg-canvas'],
      ['foreground', 'text-primary'],
      ['muted', 'bg-inset'],
      ['border', 'border-subtle'],
      ['ring', 'accent-default'],
    ]) {
      expect(css, `--color-${name} still resolves through the legacy palette`).toContain(
        `--color-${name}: var(--color-${target});`
      )
    }
    // shadcn's `accent` is a hover surface, never this system's orange.
    expect(css).toContain('--color-accent: var(--color-bg-inset);')
  })

  it('names the licensed face first and a self-hostable fallback after it', () => {
    // Helvetica Neue cannot be self-hosted. Without a metric-compatible
    // fallback a Linux visitor gets a default sans at different metrics AND,
    // because font-synthesis is none, no bold at all.
    expect(css).toMatch(/--font-sans:.*"Helvetica Neue".*var\(--font-fallback\).*sans-serif/)
  })
})
