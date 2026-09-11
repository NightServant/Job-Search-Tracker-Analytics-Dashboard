import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

/**
 * Every SVG in this repository must actually parse.
 *
 * AN SVG IS XML, NOT HTML, and browsers hold it to XML's rules: one malformed
 * character and the file is not rendered at all. There is no partial recovery
 * and no console error a reader would see -- an `<img>` pointing at a broken
 * SVG simply shows its alt text, which looks exactly like a missing file.
 *
 * THE RULE THAT CAUGHT BOTH BRAND MARKS: an XML comment may not contain a
 * double hyphen anywhere inside it. Both README logos did, in two separate
 * ways -- once in prose used as an em dash, and once inside a CSS custom
 * property name written out as an example. Both files failed to decode for
 * their entire existence. GitHub rendered "Worktrack logo" as text where the
 * mark should have been, and because the URLs were correct and returned 200
 * with `image/svg+xml`, every check short of decoding the image said it was
 * fine. Gabe reported it as "logo is not showing" on 2026-09-11.
 *
 * The irony is worth keeping: the comment explaining why the two files exist
 * is what stopped either of them working.
 *
 * WHY THE BROWSER'S OWN PARSER rather than a regex for the double hyphen. The
 * hyphen rule is one way to malform XML and this checks for all of them --
 * an unclosed tag, a bare `&`, a stray `<` in an attribute. `DOMParser` with
 * `image/svg+xml` is the same code path that decides whether a real browser
 * renders the file, so a pass here means what it says.
 */
describe('every SVG parses as XML', () => {
  const files = execSync('git ls-files "*.svg"', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)

  it('finds SVGs to check at all', () => {
    // Positive companion: if the listing broke, every assertion below would
    // pass vacuously by iterating nothing.
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s is well-formed', (file) => {
    const source = readFileSync(file, 'utf8')
    const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
    const error = doc.querySelector('parsererror')

    expect(
      error?.textContent ?? null,
      `${file} is not well-formed XML, so no browser will render it. The ` +
        'usual cause is a double hyphen inside an XML comment.'
    ).toBeNull()
    expect(doc.documentElement.tagName.toLowerCase()).toBe('svg')
  })
})
