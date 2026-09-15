/**
 * Everything this app checks before it reads a file somebody handed it.
 *
 * WHY IT IS ONE MODULE AND NOT THREE CHECKS IN THREE COMPONENTS. There are
 * three file inputs -- the document import on /documents, the CSV import on
 * /applications, and the LinkedIn export on /settings -- and before 2026-09-15
 * exactly none of them checked anything. `accept=".csv,text/csv"` looks like a
 * control and is not: it filters the picker's default view, and the picker has
 * an "All files" option. Every one of the three then read the file straight
 * into memory.
 *
 * WHAT AN UNCHECKED PICKER ACTUALLY COSTS, in the order it bites:
 *
 *   SIZE. `readFileText` on a 2GB file freezes the tab with no way back. This
 *   is not hypothetical mischief -- it is one mis-click on a disk image.
 *
 *   TYPE. The extension is a claim by whoever named the file. A `.docx` that
 *   is not a zip makes mammoth throw somewhere deep with a message meant for
 *   its own maintainers; a `.csv` that is a binary parses into thousands of
 *   rows of mojibake and is offered for import.
 *
 *   EXPANSION. A .docx IS A ZIP, and a zip declares how big it becomes. Ten
 *   kilobytes can declare four gigabytes -- the classic bomb -- and both
 *   consumers here (JSZip for the page setup, mammoth for the content) will
 *   happily decompress it. A size cap on the FILE does nothing about this,
 *   which is why the budget below is a separate gate.
 *
 *   NAME. A filename becomes the imported document's title and, downstream,
 *   part of a Content-Disposition on export. It is attacker-chosen text.
 *
 * WHAT IS DELIBERATELY NOT HERE: virus scanning, and anything claiming to
 * detect "malicious" content. Nothing this app does could run an uploaded
 * file -- the bytes are parsed into text and thrown away, never stored as
 * files, never served back with their own type, never executed. A scanner
 * would be theatre with a subscription attached. The threats that are real for
 * this app are the four above, and they are all resource and parser threats.
 *
 * IT ALL RUNS IN THE BROWSER, and that is the honest scope. These files never
 * reach a server as files: the document import parses locally and saves the
 * resulting JSON through the ordinary authenticated path. So this is not a
 * boundary against a determined attacker -- they are attacking their own tab.
 * It is a boundary against a mis-click, a hostile file somebody was SENT, and
 * a parser being handed something it cannot survive. The one genuine
 * cross-user risk, a payload that travels through the database to somebody
 * else's spreadsheet, is `escapeCsvCell` below and it is enforced at export.
 */

/** Thrown with copy meant to be shown to the reader, never logged verbatim. */
export class RejectedUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RejectedUploadError'
  }
}

/**
 * The limits, per kind of upload, in one table.
 *
 * THE NUMBERS ARE DERIVED FROM WHAT IS ON THE OTHER SIDE rather than picked.
 *
 *   document  8MB. `/api/cv/docx` refuses a body over 2MB, and that body is
 *             the JSON of an already-parsed document -- so a source file much
 *             over a few megabytes produces a CV this app cannot export
 *             anyway. 8MB leaves room for a .docx full of embedded images,
 *             whose bytes mammoth discards.
 *   csv       4MB. A CSV of applications is a few hundred rows of short
 *             strings; 4MB is tens of thousands of them. Past that the import
 *             is not a mistake in the file, it is the wrong file.
 *
 * `totalBytes` EXISTS FOR THE ONE MULTIPLE INPUT. The LinkedIn export is a
 * folder of CSVs and the settings picker takes them all at once, so a per-file
 * cap alone bounds nothing: fifty files at the limit is fifty times the limit.
 */
export const UPLOAD_LIMITS = {
  document: { maxBytes: 8_000_000, totalBytes: 8_000_000 },
  csv: { maxBytes: 4_000_000, totalBytes: 20_000_000 },
} as const

export type UploadKind = keyof typeof UPLOAD_LIMITS

const megabytes = (bytes: number) => `${Math.max(1, Math.round(bytes / 1_000_000))}MB`

/**
 * Refuses a file that is too big, before a single byte is read.
 *
 * PLACEMENT IS THE WHOLE POINT. After `file.arrayBuffer()` the memory has
 * already been spent and a check is a comment. `file.size` is the browser's
 * own figure for a file on the user's disk -- not a number sent by a caller --
 * so there is nothing here for anyone to forge. The server-side equivalent is
 * the byte cap in /api/cv/docx, which measures the body rather than trusting a
 * claim about it.
 */
export function assertWithinSizeLimit(file: File, kind: UploadKind): void {
  const { maxBytes } = UPLOAD_LIMITS[kind]
  if (file.size > maxBytes) {
    throw new RejectedUploadError(
      `That file is ${megabytes(file.size)}. Imports are limited to ${megabytes(maxBytes)}.`
    )
  }
}

/** The same check across a multi-file pick. See `totalBytes`. */
export function assertBatchWithinSizeLimit(files: File[], kind: UploadKind): void {
  const { totalBytes } = UPLOAD_LIMITS[kind]
  for (const file of files) assertWithinSizeLimit(file, kind)
  const total = files.reduce((sum, file) => sum + file.size, 0)
  if (total > totalBytes) {
    throw new RejectedUploadError(
      `Those ${files.length} files come to ${megabytes(total)}. ` +
        `An import is limited to ${megabytes(totalBytes)} at a time.`
    )
  }
}

/**
 * Byte signatures worth refusing outright.
 *
 * AN ALLOWLIST IS IMPOSSIBLE HERE and a denylist is the honest shape. `.txt`,
 * `.md` and `.csv` have no signature at all -- a text file starts with
 * whatever it starts with -- so there is nothing to match against. What CAN be
 * stated is that a file beginning with any of these is definitely not the text
 * document it claims to be, and handing it to a parser is pure downside.
 *
 * EXECUTABLES ARE ON THE LIST EVEN THOUGH THIS APP CANNOT RUN ONE. Nothing
 * here executes anything, so an .exe is harmless to us -- and refusing it by
 * name is still right, because the person who picked it has made a mistake
 * worth telling them about, and because "we accepted the binary and produced a
 * CV of mojibake" is a worse answer than "that is not a document".
 */
/** `PK 03 04` -- the local file header every real zip, and every .docx, starts with. */
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]

const BINARY_SIGNATURES: { bytes: number[]; label: string }[] = [
  { bytes: [0x25, 0x50, 0x44, 0x46], label: 'a PDF' }, // %PDF
  { bytes: [0xd0, 0xcf, 0x11, 0xe0], label: 'an old Office file' }, // .doc/.xls
  { bytes: [0x7f, 0x45, 0x4c, 0x46], label: 'a Linux executable' }, // ELF
  { bytes: [0x4d, 0x5a], label: 'a Windows executable' }, // MZ
  { bytes: [0xff, 0xd8, 0xff], label: 'a JPEG image' },
  { bytes: [0x89, 0x50, 0x4e, 0x47], label: 'a PNG image' },
  { bytes: [0x1f, 0x8b], label: 'a gzip archive' },
  { bytes: [0x52, 0x61, 0x72, 0x21], label: 'a RAR archive' }, // Rar!
  /*
    A ZIP, AND IT IS ON THIS LIST FOR THE TWO CSV PICKERS. It was missing from
    the first draft and a test caught it: a renamed .xlsx, or the .zip LinkedIn
    actually emails you, went straight through to the CSV parser -- which are
    the two most likely wrong files on exactly those two screens. The `.docx`
    branch returns before this loop runs, so the one extension that MUST be a
    zip is unaffected.
  */
  { bytes: ZIP_SIGNATURE, label: 'a zip archive (a .docx, .xlsx or .zip)' },
]

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false
  return signature.every((byte, i) => bytes[i] === byte)
}

/**
 * The first bytes of a file, for signature checks.
 *
 * A SLICE, NOT THE WHOLE FILE. `file.slice(0, n).arrayBuffer()` reads n bytes
 * off the disk; reading the file to check its first four bytes would spend the
 * memory the size cap exists to protect.
 *
 * The `arrayBuffer` fallback is the same story as `readFileText`'s: older
 * Safari and the jsdom this project tests against lack `Blob.arrayBuffer`, and
 * an async handler calling a missing method rejects silently -- an upload that
 * could never work looks exactly like one nobody tried.
 */
async function firstBytes(file: File, count = 8): Promise<Uint8Array> {
  // NO SLICE, NO CHECK, AND THAT FAILS OPEN ON PURPOSE. Every real browser
  // has `Blob.slice`; what does not is a hand-made stand-in, and there are
  // several in this repo's tests. A signature check is an affordance against a
  // mis-click, not a boundary against an attacker -- there is no attacker
  // here, the file is the reader's own and never leaves their tab -- so an
  // environment that cannot run the check must not be an environment where
  // importing a CV is impossible. The SIZE cap beside it needs no API at all
  // and still applies.
  if (typeof file.slice !== 'function') return new Uint8Array()

  const head = file.slice(0, count)
  if (typeof head.arrayBuffer === 'function') {
    return new Uint8Array(await head.arrayBuffer())
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read that file.'))
    reader.readAsArrayBuffer(head)
  })
}

/**
 * Whether the file's CONTENT agrees with the name it was given.
 *
 * THE EXTENSION IS A CLAIM. It is chosen by whoever named the file, which for
 * anything that arrived by email or download is not the person importing it.
 * This is the check that turns "we trust the name" into "we read the first
 * four bytes".
 *
 * TWO DIRECTIONS, and both matter:
 *   A `.docx` MUST BE A ZIP. Anything else makes mammoth throw from somewhere
 *   deep inside itself with a message written for its own maintainers.
 *   A TEXT FILE MUST NOT BE A KNOWN BINARY. There is no positive signature to
 *   require, so the check is the denylist above.
 *
 * An empty file passes. It is not a threat, it produces an empty document, and
 * refusing it here would be a second error message for a case the parser
 * already handles truthfully.
 */
export async function assertContentMatchesExtension(
  file: File,
  extension: string
): Promise<void> {
  const bytes = await firstBytes(file)
  if (bytes.length === 0) return

  if (extension === '.docx') {
    if (!startsWith(bytes, ZIP_SIGNATURE)) {
      throw new RejectedUploadError(
        'That file is named .docx but is not a Word document. If it was renamed, open it in Word and save it as .docx.'
      )
    }
    return
  }

  for (const signature of BINARY_SIGNATURES) {
    if (startsWith(bytes, signature.bytes)) {
      throw new RejectedUploadError(
        `That file is ${signature.label}, not a ${extension || 'text'} document.`
      )
    }
  }
}

/**
 * The ceiling on what a .docx is allowed to expand to.
 *
 * THE FILE SIZE CAP DOES NOT COVER THIS, which is the entire reason this
 * function exists separately. A zip stores how large each entry becomes, and
 * the ratio is unbounded: ten kilobytes of deflated zeroes declares four
 * gigabytes. Both consumers of an imported .docx -- JSZip for the page setup,
 * mammoth for the content -- decompress without asking, so the budget has to
 * be checked once, up front, before either of them is handed the buffer.
 *
 * 80MB AND 400 ENTRIES. A real .docx CV unzips to a few hundred kilobytes of
 * XML plus its images; the largest plausible one with full-page graphics is
 * single-digit megabytes. 80MB is an order of magnitude of headroom and still
 * two orders below the size that takes a tab down. The entry count is the
 * second half of the same defence: a bomb can also be a million tiny files.
 *
 * `_data.uncompressedSize` IS JSZip's INTERNAL FIELD and is read defensively.
 * It is populated for everything `loadAsync` parses, because it comes straight
 * out of the zip's central directory -- but it is not part of the published
 * type, so a version bump could move it. When it is missing the entry
 * contributes nothing to the total rather than blocking the import: the
 * fallback is the behaviour this app had before the check existed, which is
 * the right way round for a guard reading a private field.
 */
const MAX_UNCOMPRESSED_BYTES = 80_000_000
const MAX_ZIP_ENTRIES = 400

export function assertZipWithinBudget(files: Record<string, unknown>): void {
  const entries = Object.values(files)
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new RejectedUploadError(
      'That Word document contains an unusual number of parts and was not opened.'
    )
  }

  let total = 0
  for (const entry of entries) {
    const size = (entry as { _data?: { uncompressedSize?: unknown } })._data?.uncompressedSize
    if (typeof size === 'number' && Number.isFinite(size)) total += size
  }

  if (total > MAX_UNCOMPRESSED_BYTES) {
    throw new RejectedUploadError(
      'That Word document expands to far more than its size suggests and was not opened.'
    )
  }
}

/**
 * A filename turned into something safe to use as a document title.
 *
 * WHAT IS BEING DEFENDED AGAINST, because "sanitise the filename" is usually
 * cargo cult and here it is not. This string becomes the imported document's
 * title, is stored, is rendered on /documents, and is eventually handed to
 * `safeFileName` for a `Content-Disposition` header on export. It is
 * attacker-chosen the moment a CV arrives by email.
 *
 *   PATH COMPONENTS go first. A directory picker and a drag-drop both hand
 *   over `webkitRelativePath`-shaped names, and `../../` in a title is a
 *   string nothing here should ever have to reason about.
 *   CONTROL CHARACTERS go next, INCLUDING the ones that are not visible. A
 *   right-to-left override (U+202E) in a filename renders `exe.txt` as
 *   `txt.exe` and is the oldest trick there is; a newline in a title is a
 *   header-splitting attempt looking for somewhere to land.
 *   LENGTH is capped. A 4000-character title is a layout problem on every
 *   screen that lists documents and a database row nobody meant to write.
 *
 * IT IS NOT AN ALLOWLIST OF CHARACTERS, deliberately. A CV is legitimately
 * called `Résumé — Gabe (2026).docx`, and stripping to `[A-Za-z0-9]` would
 * mangle every name that is not English. What is removed is the set that
 * cannot appear in a title anybody typed on purpose.
 */
export function safeDocumentTitle(filename: string): string {
  const base = filename.replace(/^.*[\\/]/, '')
  const dot = base.lastIndexOf('.')
  // `=== -1`, not `<= 0`. A name that is ALL extension -- `.txt` -- has no
  // stem, so the empty string falls through to the fallback below. The `<= 0` an
  // earlier draft used kept the whole `.txt` as the title, and a test caught it.
  const stem = dot === -1 ? base : base.slice(0, dot)

  const cleaned = stem
    /*
      TWO CLASSES, REPLACED DIFFERENTLY, and the difference is not pedantry.

      C0 AND C1 CONTROL CHARACTERS BECOME A SPACE. A newline between two words
      separates them, so DELETING it welds `CV` and `Gabe` into `CVGabe` -- a
      title that is wrong in a way the reader cannot explain. A space preserves
      what the name meant while removing what it could do. A test caught this.

      BIDI OVERRIDES AND MARKS ARE DELETED. They separate nothing: U+202E
      exists to reverse the rendering of what follows, which is how `exe.txt`
      displays as `txt.exe`. Turning one into a space would leave a gap where
      there was never a word boundary.
    */
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)

  return cleaned || 'Imported CV'
}

/**
 * One CSV cell, with the formula injection taken out of it.
 *
 * THIS IS THE ONE THREAT IN THIS FILE THAT CROSSES BETWEEN PEOPLE, and it is
 * the reason a module about uploads has an export function in it. Everything
 * else here protects the reader's own tab from the reader's own file. This
 * protects whoever OPENS the CSV this app writes.
 *
 * THE ATTACK. A spreadsheet treats a cell beginning `=`, `+`, `-` or `@` as a
 * formula, and Excel's formula language reaches outside the document --
 * `=HYPERLINK(...)`, `=WEBSERVICE(...)`, DDE. Every one of this app's export
 * columns is text somebody typed into a form, and one of them (`company`) is
 * often copied straight off a job posting. Import a crafted CSV, export it
 * again, mail it to a recruiter, and the payload runs on their machine. CSV
 * quoting does not help: Papa quotes the cell correctly and the spreadsheet
 * un-quotes it and evaluates it anyway, which is exactly why this is missed.
 *
 * A LEADING APOSTROPHE IS THE FIX, and it is the conventional one: Excel,
 * Sheets and Numbers all read `'` at the start of a cell as "this is text",
 * strip it on display, and never evaluate what follows. The alternative --
 * refusing or stripping the character -- corrupts the honest case, and there
 * is one: a salary note reading `-` or a role called `@Home`.
 *
 * TAB AND CARRIAGE RETURN ARE IN THE TEST because a cell starting with either
 * is trimmed by the spreadsheet before it decides, so `\\t=cmd` is evaluated
 * while `=cmd` would have been caught by a naive first-character check.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text
}
