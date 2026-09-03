import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

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

function screenshots(): string[] {
  return readdirSync(SCREENS)
    .filter((d) => statSync(join(SCREENS, d)).isDirectory())
    .flatMap((theme) =>
      readdirSync(join(SCREENS, theme))
        .filter((f) => f.endsWith('.jpg'))
        .map((f) => join(SCREENS, theme, f))
    )
}

describe('the landing carousel slide', () => {
  it('is declared at the ratio the screenshots actually are', () => {
    const css = readFileSync(CSS, 'utf8')
    const match = css.match(/\.Carousal_005 \.swiper-slide \{[^}]*aspect-ratio:\s*([\d.]+)\s*\/\s*([\d.]+)/)
    expect(match, 'no aspect-ratio found on the carousel slide').not.toBeNull()

    const declared = Number(match![1]) / Number(match![2])
    const files = screenshots()
    expect(files.length).toBeGreaterThan(0)

    for (const file of files) {
      const { width, height } = jpegSize(file)
      const actual = width / height
      expect(
        Math.abs(actual - declared),
        `${file} is ${width}x${height} (${actual.toFixed(4)}) but the slide is declared ${declared.toFixed(4)} — object-fit will crop or letterbox it`
      ).toBeLessThan(0.01)
    }
  })

  it('every screenshot is the same shape, so one ratio can serve them all', () => {
    // A single slide ratio is only correct if the captures agree with each
    // other. One odd screenshot would letterbox on its own slide, and the
    // assertion above would not say which end of the mismatch was wrong.
    const sizes = screenshots().map((f) => {
      const { width, height } = jpegSize(f)
      return `${width}x${height}`
    })
    expect(new Set(sizes).size, `mixed screenshot sizes: ${[...new Set(sizes)].join(', ')}`).toBe(1)
  })

  it('fits the whole screenshot rather than cropping it', () => {
    // object-cover is what turned the ratio drift into a silent 28% crop.
    // contain fails visibly instead, which is the behaviour worth keeping even
    // once the ratios agree.
    const src = readFileSync('src/components/v1/skiper51.tsx', 'utf8')
    const imgClasses = [...src.matchAll(/className="([^"]*(?:dark:hidden|dark:block)[^"]*)"/g)].map(
      (m) => m[1]
    )
    expect(imgClasses.length).toBe(2)
    for (const cls of imgClasses) {
      expect(cls).toContain('object-contain')
      expect(cls).not.toContain('object-cover')
    }
  })
})
