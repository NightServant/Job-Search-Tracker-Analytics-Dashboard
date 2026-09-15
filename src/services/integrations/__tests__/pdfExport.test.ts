import { describe, it, expect } from 'vitest'
import { buildPdf, faceFor, styleForMarks, toPoints } from '../pdfExport'

/**
 * The mapping, not the bytes.
 *
 * `buildPdf` produces a PDF and reading one back to find out whether bold
 * survived is a test nobody writes twice -- so the pieces that decide what a
 * run of text looks like are asserted directly, and `buildPdf` itself is
 * checked only for "it produced a PDF and did not throw".
 */
describe('toPoints', () => {
  it.each([
    ['11pt', 11],
    ['14px', 10.5],
    ['1rem', 12],
    ['11', 11],
  ])('reads %s as %s points', (input, expected) => {
    expect(toPoints(input)).toBe(expected)
  })

  it('returns undefined rather than NaN for a size it cannot read', () => {
    // A NaN fontSize renders a line at the wrong size instead of failing, and
    // it is only visible next to the rest of the CV.
    expect(toPoints('inherit')).toBeUndefined()
    expect(toPoints(undefined)).toBeUndefined()
    expect(toPoints(12)).toBe(12)
  })
})

/**
 * The four Times faces are one family to a reader and four names here:
 * `@react-pdf/renderer` selects a face by NAME, not by fontWeight/fontStyle.
 */
describe('faceFor', () => {
  it.each([
    [false, false, 'Times-Roman'],
    [true, false, 'Times-Bold'],
    [false, true, 'Times-Italic'],
    [true, true, 'Times-BoldItalic'],
  ])('bold=%s italic=%s -> %s', (bold, italic, expected) => {
    expect(faceFor(bold, italic)).toBe(expected)
  })
})

describe('styleForMarks', () => {
  it('carries bold, italic, underline and strike', () => {
    expect(styleForMarks([{ type: 'bold' }, { type: 'italic' }]).fontFamily).toBe('Times-BoldItalic')
    expect(styleForMarks([{ type: 'underline' }]).textDecoration).toBe('underline')
    expect(styleForMarks([{ type: 'strike' }]).textDecoration).toBe('line-through')
    expect(styleForMarks([{ type: 'underline' }, { type: 'strike' }]).textDecoration).toBe(
      'line-through underline'
    )
  })

  /**
   * FOUND BY LOOKING AT THE OUTPUT (2026-09-15). Every heading rendered
   * upright. Each run of text is its own <Text> nested inside the block's
   * <Text>, and a nested `fontFamily` WINS -- so a heading styled Times-Bold
   * lost its weight the moment its own text run named Times-Roman, which is
   * every heading with no bold mark on it. The block passes its weight down.
   */
  it('keeps the block weight when the run itself is unmarked', () => {
    expect(styleForMarks(undefined, true).fontFamily).toBe('Times-Bold')
    expect(styleForMarks([{ type: 'italic' }], true).fontFamily).toBe('Times-BoldItalic')
    expect(styleForMarks(undefined, false).fontFamily).toBe('Times-Roman')
  })

  it('reads size and colour off textStyle, which is what the toolbar writes', () => {
    const style = styleForMarks([
      { type: 'textStyle', attrs: { fontSize: '13pt', color: '#ff0000' } },
    ])
    expect(style.fontSize).toBe(13)
    expect(style.color).toBe('#ff0000')
  })

  it('gives an uncoloured highlight a colour, since null means the default', () => {
    expect(styleForMarks([{ type: 'highlight', attrs: { color: null } }]).backgroundColor).toBe(
      '#fef08a'
    )
    expect(styleForMarks([{ type: 'highlight', attrs: { color: '#ffff00' } }]).backgroundColor).toBe(
      '#ffff00'
    )
  })
})

describe('buildPdf', () => {
  const doc = {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Name' }] },
      {
        type: 'paragraph',
        attrs: { textAlign: 'right' },
        content: [
          {
            type: 'text',
            marks: [{ type: 'textStyle', attrs: { fontSize: '11pt' } }, { type: 'bold' }],
            text: 'Role',
          },
        ],
      },
      {
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Did a thing.' }] }] },
        ],
      },
    ],
  }

  it('produces a PDF', async () => {
    const pdf = await buildPdf(doc, 'CV')
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe('%PDF-')
    expect(pdf.length).toBeGreaterThan(500)
  })

  it('does not throw on an empty or unmapped document', async () => {
    // A node type this does not model is skipped, not fatal -- the export must
    // not die on a document the editor was perfectly happy to save.
    await expect(buildPdf({ type: 'doc', content: [] }, 'CV')).resolves.toBeDefined()
    await expect(
      buildPdf({ type: 'doc', content: [{ type: 'horizontalRule' }, { type: 'table' }] }, 'CV')
    ).resolves.toBeDefined()
    await expect(buildPdf({}, 'CV')).resolves.toBeDefined()
  })
})
