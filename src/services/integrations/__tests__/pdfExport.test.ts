import { describe, it, expect } from 'vitest'
import { renderDocumentHtml, renderResumeHtml } from '../pdfExport'

/**
 * The page geometry and the one value on it that is not already markup.
 *
 * `buildPdf` itself is not tested here: it boots Chromium, which is not a unit
 * test, and the part that can go quietly wrong is the HTML handed to it. The
 * rendering was verified by hand against a real browser when it moved off the
 * edge function -- Letter, 0.8in padding, Times.
 */
describe('renderResumeHtml', () => {
  it('escapes the title instead of pasting it into the document', () => {
    // NOT HYPOTHETICAL PEDANTRY: the edge function this replaced dropped the
    // title into `<title>` raw, so a CV named `</title><script>` wrote a
    // script tag into a page the server then opened in a browser. Small blast
    // radius -- their own document -- but the rule at a trust boundary does
    // not bend for size.
    const html = renderResumeHtml('<p>body</p>', 'CV </title><script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes the ampersand first, so an entity cannot be smuggled through', () => {
    // `&lt;` written by the user must survive as text, not decode into `<`.
    expect(renderResumeHtml('', 'R&D &lt;b&gt;')).toContain('R&amp;D &amp;lt;b&amp;gt;')
  })

  it('keeps the page geometry the layout was tuned for', () => {
    const html = renderResumeHtml('<p>body</p>', 'CV')
    expect(html).toContain('size: Letter')
    expect(html).toContain('width: 8.5in')
    expect(html).toContain('padding: 0.8in')
  })

  it('places the document body inside the page', () => {
    expect(renderResumeHtml('<h1>Name</h1>', 'CV')).toMatch(/<main class="page">\s*<h1>Name<\/h1>/)
  })
})

/**
 * The schema the document is parsed against has to be the editor's.
 *
 * SHIPPED BROKEN AND CAUGHT IN PRODUCTION (2026-09-15). The first version
 * passed a bare `StarterKit` to `generateHTML`, which builds a schema without
 * `textStyle` -- a mark the toolbar writes for every font and size change. The
 * route answered 500 "Could not build the PDF" on a real CV and the log said
 * `RangeError: There is no mark type textStyle in this schema`. A fixture made
 * of plain headings and paragraphs passed the whole way; only a document
 * carrying the editor's own marks fails, which is why the fixture below has
 * them.
 */
describe('renderDocumentHtml uses the editor schema', () => {
  const marked = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            marks: [
              { type: 'textStyle', attrs: { fontFamily: 'Calibri', fontSize: '11pt' } },
              { type: 'bold' },
            ],
            text: 'Senior Frontend Engineer',
          },
          { type: 'text', marks: [{ type: 'highlight', attrs: { color: '#ffff00' } }], text: 'a11y' },
        ],
      },
    ],
  }

  it('renders a document carrying the editor marks instead of throwing', () => {
    expect(() => renderDocumentHtml(marked)).not.toThrow()
  })

  it('keeps the formatting rather than dropping it silently', () => {
    // The quieter half of the same bug: an extension list that merely omits a
    // mark loses the formatting without an error, so the PDF disagrees with
    // what the editor is showing.
    const html = renderDocumentHtml(marked)
    expect(html).toContain('Calibri')
    expect(html).toContain('<strong>')
    expect(html).toContain('<mark')
  })
})
