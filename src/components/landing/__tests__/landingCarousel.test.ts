import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { SCREENS as SCREENS_MANIFEST, SCREEN_TIERS } from '../screens'

/**
 * The carousel slide's aspect ratio matches the screenshots it holds.
 *
 * THIS EXISTS BECAUSE THE PROMISE WAS NOT A MECHANISM. index.css used to say
 * "re-capture at a different size and this follows" beside a hard-coded
 * `16 / 10`. The captures were later replaced with 1440x702 ones and that line
 * was not, so a 2.05 image sat in a 1.60 slide and `object-cover` silently ate
 * 28% of every screenshot -- the sidebar and the lowest panels of each screen,
 * on the section of the landing page whose entire job is showing the product.
 *
 * Nothing caught it. The images loaded, the theme switch worked, the tests
 * passed, and the page looked plausible unless you knew what the screenshots
 * were supposed to contain. Gabe caught it by looking.
 *
 * So the comment's claim is a test now: read the ratio out of the stylesheet,
 * read the real pixel dimensions out of the files, and fail when they disagree.
 */

const CSS = 'src/index.css'
const SCREENS = 'public/screens'

/** Width and height from a JPEG's SOF marker. No dependency for two numbers. */
function jpegSize(path: string): { width: number; height: number } {
  const b = readFileSync(path)
  if (b[0] !== 0xff || b[1] !== 0xd8) throw new Error(`${path} is not a JPEG`)
  let i = 2
  while (i < b.length) {
    if (b[i] !== 0xff) throw new Error(`${path}: bad marker at ${i}`)
    const marker = b[i + 1]
    const length = b.readUInt16BE(i + 2)
    // SOF0-SOF15, excluding DHT (c4), JPG (c8) and DAC (cc).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) }
    }
    i += 2 + length
  }
  throw new Error(`${path}: no SOF marker`)
}

/** Every capture, as `{ theme, tier, path }`. The tree is theme/tier/slug.jpg. */
function screenshots(): { theme: string; tier: string; path: string }[] {
  return readdirSync(SCREENS)
    .filter((d) => statSync(join(SCREENS, d)).isDirectory())
    .flatMap((theme) =>
      readdirSync(join(SCREENS, theme))
        .filter((t) => statSync(join(SCREENS, theme, t)).isDirectory())
        .flatMap((tier) =>
          readdirSync(join(SCREENS, theme, tier))
            .filter((f) => f.endsWith('.jpg'))
            .map((f) => ({ theme, tier, path: join(SCREENS, theme, tier, f) }))
        )
    )
}

/**
 * The slide ratio declared for each tier, read out of the stylesheet.
 *
 * The base rule is the desktop one; each `max-width` block overrides it. This
 * returns them keyed by the breakpoint so they can be checked against the
 * captures that will actually land in them.
 */
function declaredRatios(css: string): Record<string, number> {
  const out: Record<string, number> = {}
  const base = css.match(/\.Carousal_005 \.swiper-slide \{[^}]*aspect-ratio:\s*([\d.]+)\s*\/\s*([\d.]+)/)
  if (base) out.desktop = Number(base[1]) / Number(base[2])
  const byQuery: Record<string, string> = { '1279px': 'laptop', '1023px': 'tablet', '639px': 'mobile' }
  for (const [px, tier] of Object.entries(byQuery)) {
    const re = new RegExp(
      `@media \\(max-width: ${px}\\) \\{\\s*\\.Carousal_005 \\.swiper-slide \\{[^}]*aspect-ratio:\\s*([\\d.]+)\\s*/\\s*([\\d.]+)`
    )
    const m = css.match(re)
    if (m) out[tier] = Number(m[1]) / Number(m[2])
  }
  return out
}

describe('the landing carousel slide', () => {
  it('declares a slide ratio for every tier that matches that tier\'s captures', () => {
    /*
      THE ORIGINAL BUG, GENERALISED. This started as one ratio against one set
      of captures, after a 2.05 image in a 1.60 slide had `object-cover`
      silently eating 28% of every screenshot.

      The carousel now art-directs by viewport, so there are FOUR shapes rather
      than one -- 0.44 on a phone against 2.05 on a desktop -- and the failure
      it guards against is worse than before: leaving the desktop ratio in
      place would draw the phone capture as a 74px sliver in a 343px box, which
      is the whole reason for shipping the phone layout undone.
    */
    const css = readFileSync(CSS, 'utf8')
    const ratios = declaredRatios(css)
    const files = screenshots()
    expect(files.length).toBeGreaterThan(0)

    for (const tier of ['mobile', 'tablet', 'laptop', 'desktop']) {
      expect(ratios[tier], `no slide aspect-ratio declared for ${tier}`).toBeGreaterThan(0)
    }

    for (const { tier, path } of files) {
      const { width, height } = jpegSize(path)
      const actual = width / height
      expect(
        Math.abs(actual - ratios[tier]),
        `${path} is ${width}x${height} (${actual.toFixed(3)}) but the ${tier} slide is declared ${ratios[tier].toFixed(3)} — object-contain will letterbox it`
      ).toBeLessThan(0.01)
    }
  })

  it('keeps every capture within a tier the same shape', () => {
    /*
      NARROWED FROM "every screenshot is the same shape". That was right while
      all ten files were one desktop capture at two resolutions; it is wrong
      now by design, because the tiers are deliberately different shapes -- a
      portrait phone against a landscape desktop.

      The invariant that survives is the one that was doing the work: within a
      tier they must agree, or a single slide ratio letterboxes whichever one
      is odd. A recapture that missed one screen is exactly how that happens.
    */
    const byTier = new Map<string, { path: string; ratio: number; size: string }[]>()
    for (const { tier, path } of screenshots()) {
      const { width, height } = jpegSize(path)
      const list = byTier.get(tier) ?? []
      list.push({ path, ratio: width / height, size: `${width}x${height}` })
      byTier.set(tier, list)
    }
    expect(byTier.size).toBe(4)

    for (const [tier, files] of byTier) {
      const spread = Math.max(...files.map((f) => f.ratio)) - Math.min(...files.map((f) => f.ratio))
      expect(
        spread,
        `mixed shapes in ${tier}: ${files.map((f) => `${f.path} ${f.size}`).join(', ')}`
      ).toBeLessThan(0.01)
    }
  })

  it('has every screen in every tier and both themes, so no source 404s', () => {
    /*
      REPLACES the `-768.jpg` variant check, which guarded the same failure
      under the old srcset scheme: a capture added without its partner produced
      a source that 404s, and a 404 inside `<picture>`/`srcset` is SILENT --
      the browser just falls through to the next candidate, and the phone
      quietly gets the desktop shot again. Same trap, more slots to miss: four
      tiers times two themes is eight files per screen rather than two.
    */
    const slugs = SCREENS_MANIFEST.map((s) => s.slug)
    expect(slugs.length).toBeGreaterThan(0)
    for (const theme of ['light', 'dark']) {
      for (const tier of ['mobile', 'tablet', 'laptop', 'desktop']) {
        for (const slug of slugs) {
          const file = join(SCREENS, theme, tier, `${slug}.jpg`)
          expect(existsSync(file), `${file} is missing`).toBe(true)
        }
      }
    }
  })

  it('declares the same breakpoints in the stylesheet and in the source list', () => {
    /*
      THE TWO HALVES MUST AGREE OR THE BOX AND ITS CONTENTS DISAGREE. The CSS
      decides the SHAPE of the slide per viewport; `screenSources` decides
      which FILE goes in it. They are written in different files in different
      languages, and nothing but this connects them -- move one breakpoint and
      the phone capture lands in a laptop-shaped box with bands down both
      sides, which looks like a bug in the image rather than in a media query.
    */
    const css = readFileSync(CSS, 'utf8')
    for (const tier of SCREEN_TIERS) {
      const px = tier.media.match(/(\d+)px/)![1]
      expect(
        css.includes(`@media (max-width: ${px}px)`),
        `screens.ts serves the ${tier.dir} capture below ${px}px, but index.css declares no slide ratio at that width`
      ).toBe(true)
    }
  })

  it('walks the app in the order its own sidebar does', () => {
    /*
      Gabe, 2026-09-15: "order of pictures must be overview, applications,
      planner, documents and analytics."

      It is pinned rather than left to the array because the failure is silent:
      every screenshot in the carousel CONTAINS the sidebar, so a carousel in a
      different order shows the product disagreeing with itself, and nothing
      about the page looks broken while it happens.
    */
    expect(SCREENS_MANIFEST.map((s) => s.slug)).toEqual([
      'overview',
      'applications',
      'planner',
      'documents',
      'analytics',
    ])
  })

  it('fits the whole screenshot rather than cropping it', () => {
    // object-cover is what turned the ratio drift into a silent 28% crop.
    // contain fails visibly instead, which is the behaviour worth keeping even
    // once the ratios agree.
    //
    // Scoped to `<img` tags: the two `<picture>` wrappers carry `dark:hidden`
    // too, and matching those made this count four and fail.
    const src = readFileSync('src/components/v1/skiper51.tsx', 'utf8')
    const imgClasses = [
      ...src.matchAll(/<img\s[^>]*className="([^"]*(?:dark:hidden|dark:block)[^"]*)"/g),
    ].map((m) => m[1])
    expect(imgClasses.length).toBe(2)
    for (const cls of imgClasses) {
      expect(cls).toContain('object-contain')
      expect(cls).not.toContain('object-cover')
    }
  })
})
