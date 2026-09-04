import { describe, it, expect } from 'vitest'
import mammoth from 'mammoth'
import { buildDocx, sectionsFrom, type TipTapNode } from '../docxExport'

const DOC: TipTapNode = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'ELIJAH GABE CERVANTES' }] },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Front-end developer', marks: [{ type: 'bold' }] }],
    },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'EXPERIENCE' }] },
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Shipped the rewrite' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Cut load time 40%' }] }] },
      ],
    },
  ],
}

/** A .docx is a zip; every zip starts `PK`. */
function isZip(buffer: Buffer): boolean {
  return buffer.subarray(0, 2).toString('latin1') === 'PK'
}

/**
 * Read the file back the way a consumer would.
 *
 * A .docx is a DEFLATE zip, so the text is not visible in the raw bytes -- the
 * first version of these tests grepped the buffer and failed against a
 * perfectly good file. `mammoth` is already a dependency (the app uses it to
 * import Word CVs), and reading the export back through it makes these
 * ROUND-TRIP tests: what a parser gets out, not what the packer thinks it put
 * in.
 */
async function readBack(buffer: Buffer): Promise<{ text: string; html: string }> {
  const [{ value: text }, { value: html }] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({ buffer }),
  ])
  return { text, html }
}

describe('exporting the Word CV', () => {
  it('produces a real .docx, not a renamed text file', async () => {
    const buffer = await buildDocx(DOC, 'Gabe CV (ATS)')
    expect(isZip(buffer)).toBe(true)
    // A trivially small file means the packer produced an empty shell.
    expect(buffer.length).toBeGreaterThan(4000)
  })

  it('keeps every line of the CV', async () => {
    // The failure this catches is a converter that walks the tree wrongly and
    // silently drops a branch -- the file still opens, still looks like a CV,
    // and is missing a job. Asserted against the packed XML rather than the
    // intermediate objects, so it covers the packing step too.
    const { text } = await readBack(await buildDocx(DOC, 'CV'))
    for (const line of [
      'ELIJAH GABE CERVANTES',
      'Front-end developer',
      'EXPERIENCE',
      'Shipped the rewrite',
      'Cut load time 40%',
    ]) {
      expect(text, `"${line}" did not survive the export`).toContain(line)
    }
  })

  it('makes list items real Word lists, not hyphens typed into the text', async () => {
    // A literal "- " is part of the sentence as far as a parser is concerned.
    // Word list structure is something it can strip, which is the whole reason
    // .docx is worth exporting for ATS uploads.
    const { html, text } = await readBack(await buildDocx(DOC, 'CV'))
    // mammoth renders real Word list structure as <ul><li>. If the bullets had
    // been typed as literal hyphens, this would be <p>- Shipped...</p>.
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>Shipped the rewrite</li>')
    expect(text).not.toContain('- Shipped the rewrite')
  })

  it('preserves heading structure, which is what an ATS reads sections from', async () => {
    // Section headings are how a parser knows where EXPERIENCE starts. Flat
    // paragraphs would still look right on screen and parse as one blob.
    const { html } = await readBack(await buildDocx(DOC, 'CV'))
    expect(html).toContain('<h1>ELIJAH GABE CERVANTES</h1>')
    expect(html).toContain('<h2>EXPERIENCE</h2>')
  })

  it('keeps bold emphasis rather than flattening it', async () => {
    const { html } = await readBack(await buildDocx(DOC, 'CV'))
    expect(html).toMatch(/<strong>Front-end developer<\/strong>/)
  })

  it('survives an empty or malformed document instead of throwing', async () => {
    // This runs behind an export button. A throw there is an unhandled
    // rejection and a control stuck on "exporting".
    for (const input of [null, undefined, {}, { type: 'doc' }, { type: 'doc', content: [] }]) {
      const buffer = await buildDocx(input, 'CV')
      expect(isZip(buffer)).toBe(true)
    }
  })

  it('keeps the editor\'s own page margins', async () => {
    // 0.8in all round, the same as the letter preview on screen -- so what was
    // on screen is what comes out. 1152 twips = 0.8in.
    const [section] = sectionsFrom(DOC)
    expect(section.properties?.page?.margin).toMatchObject({
      top: 1152,
      right: 1152,
      bottom: 1152,
      left: 1152,
    })
  })

  it('ignores node types it does not know rather than losing their text', async () => {
    const odd = {
      type: 'doc',
      content: [{ type: 'someFutureNode', content: [{ type: 'text', text: 'still here' }] }],
    }
    const { text } = await readBack(await buildDocx(odd, 'CV'))
    expect(text).toContain('still here')
  })
})
