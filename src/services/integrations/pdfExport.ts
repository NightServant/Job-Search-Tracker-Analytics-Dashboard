import { generateHTML } from '@tiptap/html'
import type { JSONContent } from '@tiptap/core'
import { WORD_EDITOR_EXTENSIONS } from '@/components/cv/editorExtensions'

/**
 * PDF export for the CV editor.
 *
 * IT USED TO BE A SUPABASE EDGE FUNCTION AND COULD NEVER HAVE WORKED THERE.
 * `supabase/functions/resume-export-pdf` launched headless Chromium through
 * `puppeteer-core` and `@sparticuz/chromium`, against a runtime whose
 * published limits are 256MB of memory, 20MB of bundled function and 2s of
 * CPU per request. Chromium clears none of those bars -- the compressed binary
 * alone is over the whole function budget -- and Supabase's own Puppeteer
 * guide says to connect to a REMOTE browser rather than bundle one. So it was
 * never deployed, and the project has no edge functions at all; the browser
 * asked for a function that does not exist, the platform's 404 failed CORS
 * preflight, and the editor showed "Failed to fetch" with nothing to go on.
 *
 * Here instead, beside `/api/cv/docx` and `/api/cv/latex`, because Vercel
 * Functions take 5GB packages and a 300s budget -- enough for Chromium -- and
 * because one answer to "where do exports run" beats two. The rendering below
 * is the edge function's, carried over rather than rewritten: the page
 * geometry was tuned and there is no reason for the output to change.
 */

/** The page the CV is drawn on. Letter, zero margin, 0.8in of padding. */
export function renderResumeHtml(innerHtml: string, title: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page {
        size: Letter;
        margin: 0;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: #ffffff;
        color: #111827;
        font-family: 'Times New Roman', Times, serif;
      }
      .page {
        width: 8.5in;
        min-height: 11in;
        margin: 0 auto;
        padding: 0.8in;
        background: #ffffff;
      }
      .page h1 {
        margin: 0 0 0.2in;
        font-size: 2rem;
        line-height: 1.2;
        font-weight: 700;
      }
      .page h2 {
        margin: 0.25in 0 0.1in;
        font-size: 1.15rem;
        line-height: 1.25;
        font-weight: 600;
      }
      .page p {
        margin: 0.08in 0;
        font-size: 11.5pt;
        line-height: 1.55;
      }
      .page ul {
        margin: 0.08in 0;
        padding-left: 0.24in;
      }
      .page li {
        margin: 0.05in 0;
        font-size: 11.5pt;
        line-height: 1.5;
      }
    </style>
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <main class="page">
      ${innerHtml}
    </main>
  </body>
</html>`
}

/**
 * The title is the ONE value here that is not already HTML.
 *
 * `innerHtml` comes from `generateHTML`, which produces markup on purpose.
 * The title is a string the user typed into a filename field, and the edge
 * function dropped it into `<title>` raw -- so a CV called `</title><script>`
 * wrote a script tag into a page this server then executes in a browser. The
 * blast radius was small (their own document, their own PDF) but the fix is
 * four replacements and the rule at a trust boundary does not bend for size.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Where Chromium is.
 *
 * TWO ANSWERS, because the binary that works on Vercel is not one a Mac can
 * run. `@sparticuz/chromium` ships a Linux build for serverless; on a
 * developer's machine it resolves to a path that is not there and
 * `puppeteer.launch` fails with something that reads like a bug in this file.
 * `CHROME_EXECUTABLE_PATH` is the escape hatch, and the macOS default is the
 * common case it saves people setting.
 */
async function resolveExecutable(): Promise<{ executablePath: string; args: string[] }> {
  const override = process.env.CHROME_EXECUTABLE_PATH?.trim()
  if (override) return { executablePath: override, args: [] }

  if (process.env.VERCEL || process.platform === 'linux') {
    const chromium = (await import('@sparticuz/chromium')).default
    return { executablePath: await chromium.executablePath(), args: chromium.args }
  }

  return {
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [],
  }
}

/**
 * The document as HTML, split out so it can be tested without a browser.
 *
 * This is the half that actually broke in production: everything above it is
 * a string template and everything below it is Chromium, but the schema this
 * builds is derived from an extension list that has to match the editor's.
 */
export function renderDocumentHtml(content: unknown): string {
  return generateHTML(content as JSONContent, WORD_EDITOR_EXTENSIONS)
}

export async function buildPdf(content: unknown, title: string): Promise<Uint8Array> {
  // THE EDITOR'S OWN EXTENSIONS, not a bare StarterKit. `generateHTML` builds
  // a schema from this list and THROWS on anything the document uses that the
  // list does not declare -- "There is no mark type textStyle in this schema"
  // against a real CV, because the toolbar writes `textStyle` for every font
  // and size change. StarterKit alone also silently loses highlight, sub- and
  // superscript and text alignment, which is the quieter half of the same bug:
  // a PDF that is missing the formatting the editor is showing.
  //
  // Sharing the list is what keeps the export honest. It is the same constant
  // `WordResumeEditor` builds the editor from, so a formatting feature added
  // there cannot render on screen and vanish from the PDF.
  const innerHtml = renderDocumentHtml(content)
  const fullHtml = renderResumeHtml(innerHtml, title)

  const puppeteer = (await import('puppeteer-core')).default
  const { executablePath, args } = await resolveExecutable()

  const browser = await puppeteer.launch({
    args: [...args, '--font-render-hinting=none'],
    defaultViewport: { width: 816, height: 1056, deviceScaleFactor: 2 },
    executablePath,
    headless: true,
  })

  try {
    const page = await browser.newPage()
    // `networkidle0`: the markup has no remote assets today, but a CV with an
    // image in it would otherwise be captured before the image arrived.
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' })
    return await page.pdf({
      format: 'letter',
      printBackground: true,
      margin: { top: '0in', right: '0in', bottom: '0in', left: '0in' },
    })
  } finally {
    // ALWAYS, and this is why it is a `finally`. A browser left running holds
    // the function instance open, and Fluid Compute reuses instances -- so one
    // leaked Chromium is paid for by every later request on that instance.
    await browser.close()
  }
}
