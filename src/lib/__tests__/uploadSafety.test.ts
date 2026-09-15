import { describe, it, expect } from 'vitest'
import {
  RejectedUploadError,
  assertBatchWithinSizeLimit,
  assertContentMatchesExtension,
  assertWithinSizeLimit,
  assertZipWithinBudget,
  escapeCsvCell,
  safeDocumentTitle,
} from '../uploadSafety'

/**
 * The gates in front of the three file pickers.
 *
 * WHY THESE ARE WORTH TESTING WHEN THE THREAT IS SMALL. None of this defends
 * against a determined attacker -- the files never leave the reader's browser,
 * so they are attacking their own tab. What it defends against is a mis-click
 * that freezes the page, a hostile file somebody was SENT, and a parser handed
 * something it cannot survive. All three are silent when they work, and all
 * three were absent until 2026-09-15, which is exactly the kind of check that
 * disappears again in a refactor because nothing notices.
 *
 * `escapeCsvCell` is the exception and the most important case here: it is the
 * only one that protects somebody other than the person clicking.
 */

/** A File-shaped stand-in with real bytes, so `slice` and `size` both work. */
function fileOf(name: string, bytes: number[] | string, padTo = 0): File {
  const body =
    typeof bytes === 'string' ? new TextEncoder().encode(bytes) : new Uint8Array(bytes)
  const padded =
    padTo > body.length
      ? new Uint8Array([...body, ...new Uint8Array(padTo - body.length)])
      : body
  return new File([padded], name)
}

describe('the size gate', () => {
  it('refuses a file past the limit and says how big it was', () => {
    // The number in the message matters: "too large" leaves somebody staring
    // at a file manager working out which of two files was the problem.
    const huge = { name: 'cv.docx', size: 900_000_000 } as File
    expect(() => assertWithinSizeLimit(huge, 'document')).toThrow(RejectedUploadError)
    expect(() => assertWithinSizeLimit(huge, 'document')).toThrow(/900MB/)
  })

  it('bounds a multi-file pick in total, not only per file', () => {
    /*
      THE LINKEDIN EXPORT IS THE ONE `multiple` INPUT, and a per-file cap alone
      bounds nothing there: fifty files just under the limit is fifty times the
      limit, and the handler holds every one of them in memory at once because
      it reads them through a Promise.all.
    */
    const many = Array.from({ length: 30 }, () => ({ name: 'x.csv', size: 3_000_000 }) as File)
    // Each one is under the 4MB per-file cap.
    for (const file of many) expect(() => assertWithinSizeLimit(file, 'csv')).not.toThrow()
    // Together they are 90MB.
    expect(() => assertBatchWithinSizeLimit(many, 'csv')).toThrow(/limited to/)
  })
})

describe('the signature gate', () => {
  it('refuses a .docx that is not a zip', async () => {
    // Every real .docx starts `PK\x03\x04`. Without this, mammoth throws from
    // somewhere deep inside itself with a message written for its own
    // maintainers, which the reader then sees.
    await expect(
      assertContentMatchesExtension(fileOf('cv.docx', 'Not a zip at all'), '.docx')
    ).rejects.toThrow(/not a Word document/)
  })

  it('accepts a .docx that is one', async () => {
    const zip = fileOf('cv.docx', [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00])
    await expect(assertContentMatchesExtension(zip, '.docx')).resolves.toBeUndefined()
  })

  it('refuses a renamed binary claiming to be text, and names what it is', async () => {
    // The mistake people actually make on the applications screen is picking
    // an .xlsx; on settings it is picking the .zip LinkedIn emails. Parsing
    // either as CSV produces a page of binary rows offered for import as if
    // they were applications.
    const cases: [string, number[], RegExp][] = [
      ['cv.txt', [0x25, 0x50, 0x44, 0x46], /a PDF/],
      ['jobs.csv', [0x50, 0x4b, 0x03, 0x04], /an? /],
      ['cv.md', [0x4d, 0x5a, 0x90, 0x00], /Windows executable/],
      ['cv.txt', [0x89, 0x50, 0x4e, 0x47], /PNG/],
    ]
    for (const [name, bytes, expected] of cases) {
      await expect(
        assertContentMatchesExtension(fileOf(name, bytes, 8), name.slice(name.lastIndexOf('.')))
      ).rejects.toThrow(expected)
    }
  })

  it('lets ordinary text through, and an empty file', async () => {
    // A text file has no signature to require, so the check is a denylist and
    // must not invent a positive rule. An empty file produces an empty
    // document, which the parser already reports truthfully.
    await expect(
      assertContentMatchesExtension(fileOf('cv.txt', 'Gabe\nSenior Engineer'), '.txt')
    ).resolves.toBeUndefined()
    await expect(assertContentMatchesExtension(fileOf('cv.txt', ''), '.txt')).resolves
      .toBeUndefined()
  })

  it('fails open where there is no slice to read', async () => {
    // Deliberate: this is an affordance against a mis-click, not a boundary,
    // so an environment that cannot run it must not be one where importing a
    // CV is impossible. The size cap beside it needs no API and still applies.
    const noSlice = { name: 'cv.docx', size: 10 } as File
    await expect(assertContentMatchesExtension(noSlice, '.docx')).resolves.toBeUndefined()
  })
})

describe('the zip budget', () => {
  /*
    THE FILE SIZE CAP DOES NOT COVER THIS, which is the whole reason the check
    is separate. A zip declares how large each entry becomes and the ratio is
    unbounded: ten kilobytes of deflated zeroes declares four gigabytes, and
    both consumers of an imported .docx decompress without asking.
  */
  const entry = (uncompressedSize: number) => ({ _data: { uncompressedSize } })

  it('refuses a package that declares far more than it is', () => {
    expect(() =>
      assertZipWithinBudget({ 'word/document.xml': entry(4_000_000_000) })
    ).toThrow(/expands to far more/)
  })

  it('refuses a package made of a million tiny parts', () => {
    // The other shape a bomb takes. Neither check subsumes the other.
    const many = Object.fromEntries(
      Array.from({ length: 5000 }, (_, i) => [`media/${i}.png`, entry(10)])
    )
    expect(() => assertZipWithinBudget(many)).toThrow(/unusual number of parts/)
  })

  it('passes an ordinary Word document', () => {
    expect(() =>
      assertZipWithinBudget({
        '[Content_Types].xml': entry(1_500),
        'word/document.xml': entry(180_000),
        'word/styles.xml': entry(30_000),
        'word/media/photo.png': entry(400_000),
      })
    ).not.toThrow()
  })

  it('does not block an import when JSZip stops exposing the size', () => {
    // `_data.uncompressedSize` is JSZip's internal field, read defensively.
    // When it is missing the entry contributes nothing rather than blocking --
    // the fallback is the behaviour this app had before the check existed,
    // which is the right way round for a guard reading a private field.
    expect(() => assertZipWithinBudget({ 'word/document.xml': {} })).not.toThrow()
  })
})

describe('the filename', () => {
  it('drops path components', () => {
    expect(safeDocumentTitle('../../etc/passwd.txt')).toBe('passwd')
    expect(safeDocumentTitle('C:\\Users\\gabe\\CV.docx')).toBe('CV')
  })

  it('strips the characters that are invisible rather than merely odd', () => {
    // A right-to-left override renders `exe.txt` as `txt.exe` and is the
    // oldest trick there is; a newline in a title is a header-splitting
    // attempt looking for somewhere to land. Both survive a naive trim.
    expect(safeDocumentTitle('CV\u202Ecod.txt')).toBe('CVcod')
    expect(safeDocumentTitle('CV\nGabe.txt')).toBe('CV Gabe')
  })

  it('keeps a name somebody actually gave a CV', () => {
    // NOT an allowlist of characters: a CV is legitimately called this, and
    // stripping to [A-Za-z0-9] would mangle every name that is not English.
    expect(safeDocumentTitle('Résumé — Gabe (2026).docx')).toBe('Résumé — Gabe (2026)')
  })

  it('caps the length and always returns something', () => {
    expect(safeDocumentTitle(`${'a'.repeat(4000)}.txt`)).toHaveLength(120)
    expect(safeDocumentTitle('.txt')).toBe('Imported CV')
    expect(safeDocumentTitle('   .docx')).toBe('Imported CV')
  })
})

describe('CSV formula injection', () => {
  /*
    THE ONE THREAT HERE THAT CROSSES BETWEEN PEOPLE. A spreadsheet un-quotes a
    cell and then evaluates it: a value beginning `=`, `+`, `-` or `@` is a
    formula, and Excel's formula language reaches outside the document. Every
    export column is text somebody typed into a form, and `company` is
    routinely pasted off a job posting -- so a crafted posting becomes a
    crafted row becomes a CSV mailed to a recruiter.
  */
  it('defuses every character a spreadsheet treats as a formula', () => {
    for (const payload of ['=HYPERLINK("http://x","c")', '+1+1', '-2+3', '@SUM(A1)']) {
      expect(escapeCsvCell(payload)).toBe(`'${payload}`)
    }
  })

  it('catches the leading-whitespace variant a first-character check misses', () => {
    // A spreadsheet trims the cell before deciding, so `\t=cmd` is evaluated
    // while a naive `text[0] === '='` says it is safe.
    expect(escapeCsvCell('\t=cmd|" /C calc"!A0')).toMatch(/^'/)
    expect(escapeCsvCell(' =1+1')).toMatch(/^'/)
  })

  it('leaves ordinary values exactly alone', () => {
    // The apostrophe is the fix precisely because it does not corrupt the
    // honest case, and there is one: a role called "Engineer, Payments".
    expect(escapeCsvCell('Acme Corp')).toBe('Acme Corp')
    expect(escapeCsvCell('Engineer, Payments')).toBe('Engineer, Payments')
    expect(escapeCsvCell(50000)).toBe('50000')
    expect(escapeCsvCell(null)).toBe('')
    expect(escapeCsvCell(undefined)).toBe('')
  })
})
