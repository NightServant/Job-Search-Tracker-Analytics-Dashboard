import type { JSONContent } from '@tiptap/core'
import type { ResumeContent } from '@/services/resumeService'

/**
 * The pure content helpers the two CV editors share: the starter documents a
 * new CV opens with, the normalizers that decide what a stored `content` blob
 * actually is, and the LaTeX preview document.
 *
 * Lifted out of `src/screens/ResumePage.tsx` unchanged when that file was
 * split into `/documents` and `/cv`. Deliberately unchanged: the LaTeX preview
 * builder in particular is a nest of escaping that is correct and very easy to
 * break, and the split was a move, not a rewrite. Both editors and the route
 * that creates drafts need these, so they live beside the editors rather than
 * inside one of them.
 */


export const DEFAULT_WORD_CONTENT: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'CV Title' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'email@example.com | (000) 000-0000 | portfolio.example' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Summary' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Experience' }] },
    { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Achieved measurable impact using clear, quantifiable results.' }] }] }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Projects' }] },
    { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Built a product with modern frontend and database tooling.' }] }] }] },
  ],
}

export const DEFAULT_LATEX_SOURCE = String.raw`\documentclass[10pt,a4paper]{article}
\usepackage[ignoreheadfoot,top=1 cm,bottom=0.75 cm,left=1 cm,right=1 cm,footskip=1cm]{geometry}
\usepackage{titlesec}
\usepackage{tabularx}
\usepackage{array}
\usepackage[dvipsnames]{xcolor}
\usepackage{enumitem}
\usepackage{hyperref}
\usepackage{paracol}
\usepackage{needspace}
\usepackage{iftex}
\usepackage{multicol}
\ifPDFTeX
  \input{glyphtounicode}
  \pdfgentounicode=1
  \usepackage[T1]{fontenc}
  \usepackage[utf8]{inputenc}
  \usepackage{lmodern}
\fi
\usepackage{charter}
\raggedright
\pagestyle{empty}
\setcounter{secnumdepth}{0}
\setlength{\parindent}{0pt}
\pagenumbering{gobble}
\titleformat{\section}{\needspace{4\baselineskip}\bfseries\large}{}{0pt}{}[\vspace{1pt}\titlerule]
\begin{document}
\begin{center}
{\LARGE \textbf{Resume Title}}\\
email@example.com \textbar{} (000) 000-0000 \textbar{} portfolio.example
\end{center}
\section{Summary}
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
\section{Experience}
\textbf{Role Title} \hfill 2025 -- Present\\
Organization Name
\begin{itemize}
  \item Lorem ipsum dolor sit amet.
  \item Sed do eiusmod tempor incididunt.
\end{itemize}
\section{Projects}
\textbf{Project Title}
\begin{itemize}
  \item Built a product with modern frontend and database tooling.
\end{itemize}
\end{document}`

export function isLatexContent(content: ResumeContent | null | undefined): content is { type: 'latex'; source: string } {
  return !!content && typeof content === 'object' && (content as { type?: string }).type === 'latex'
}

export function normalizeWordContent(content: ResumeContent | null | undefined): JSONContent {
  if (content && typeof content === 'object' && (content as { type?: string }).type === 'doc') {
    return content as JSONContent
  }
  return DEFAULT_WORD_CONTENT
}

export function normalizeLatexSource(content: ResumeContent | null | undefined): string {
  if (!isLatexContent(content) || !content.source.trim()) {
    return DEFAULT_LATEX_SOURCE
  }

  const source = content.source
  const legacyMarkers = [
    'Eric Janssen P. Quiambao',
    'eric.j.quiambao@gmail.com',
    'ensues.github.io',
    'linkedin.com/in/ericjanssenquiambao',
    'github.com/Ensues',
    'Wireless Access for Health',
    'CodSoft',
    'Tarlac State University',
  ]

  if (legacyMarkers.some((marker) => source.includes(marker))) {
    return DEFAULT_LATEX_SOURCE
  }

  return source
}

export function formatSaveTime(timestamp: string | null): string {
  if (!timestamp) return 'Not saved yet'
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? 'Not saved yet' : `Saved ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
}

function escapeForScript(str: string): string {
  return str.replace(/<\//g, '<\\/')
}

function escapeHtml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function toFriendlyLatexPreviewText(input: string): string {
  const source = String(input || '')
  const beginMatch = /\\begin\{document\}/i.exec(source)
  const endMatch = /\\end\{document\}/i.exec(source)
  const body = beginMatch && endMatch && beginMatch.index < endMatch.index ? source.slice(beginMatch.index + beginMatch[0].length, endMatch.index) : source

  return body
    .replace(/\\textbf\{([^}]*)\}/g, '**$1**')
    .replace(/\\textit\{([^}]*)\}/g, '*$1*')
    .replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1')
    .replace(/\\begin\{itemize\}/g, '')
    .replace(/\\end\{itemize\}/g, '')
    .replace(/^\s*\\item\s+/gm, '• ')
    .replace(/\\\\/g, '\n')
    .replace(/\\emph\{([^}]*)\}/g, '*$1*')
    .replace(/\\section\{([^}]*)\}/g, '\n### $1\n')
    .replace(/\\subsection\{([^}]*)\}/g, '\n#### $1\n')
    .replace(/[{}]/g, '')
    .trim()
}

export function buildLatexPreviewHtml(latexCode: string, cdnAvailable: boolean): string {
  const safeCode = escapeForScript(latexCode)
  const safeFallbackText = escapeHtml(toFriendlyLatexPreviewText(latexCode))
  
  const cdnUrl = 'https://cdn.jsdelivr.net/npm/latex.js@0.12.4/dist/latex.min.js'
  const scriptTag = cdnAvailable ? `<script src="${cdnUrl}" defer></script>` : ''
  
  // Build the inline script separately to avoid long lines and escape issues
  const rendererScript = `
    (function(){
      const code = ${JSON.stringify(safeCode)};
      const root = document.getElementById('root');
      const maxRetries = 3;
      let retryCount = 0;
      
      function normalizeForPreview(input) {
        let body = String(input || '');
        const beginMatch = /\\\\begin\\{document\\}/i.exec(body);
        const endMatch = /\\\\end\\{document\\}/i.exec(body);
        if (beginMatch && endMatch && beginMatch.index < endMatch.index) {
          body = body.slice(beginMatch.index + beginMatch[0].length, endMatch.index);
        }
        return '\\\\begin{document}\\n' + body
          .replace(/^\\\\documentclass[^\\n]*$/gim, '')
          .replace(/^\\\\usepackage[^\\n]*$/gim, '')
          .replace(/^\\\\pagenumbering[^\\n]*$/gim, '')
          .replace(/\\\\href\\{[^}]*\\}\\{([^}]*)\\}/g, '$1')
          .replace(/\\\\begin\\{itemize\\}\\[[^\\]]*\\]/g, '\\\\begin{itemize}')
          .replace(/\\\\vspace\\{[^}]*\\}/g, '')
          .replace(/\\\\hrule/g, '')
          .replace(/\\\\hfill/g, ' ')
          .replace(/\\\\quad/g, ' ')
          .trim() + '\\n\\\\end{document}';
      }
      
      function fallback(message) {
        const safeMessage = String(message)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const friendlyText = String(code)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\\\\textbf\\{([^}]*)\\}/g, '**$$1**')
          .replace(/\\\\textit\\{([^}]*)\\}/g, '*$$1*')
          .replace(/\\\\href\\{[^}]*\\}\\{([^}]*)\\}/g, '$$1')
          .replace(/\\\\begin\\{itemize\\}/g, '')
          .replace(/\\\\end\\{itemize\\}/g, '')
          .replace(/^\\s*\\\\item\\s+/gm, '• ')
          .replace(/\\\\\\\\\\\\\\\\/g, '\\n')
          .replace(/\\\\emph\\{([^}]*)\\}/g, '*$$1*')
          .replace(/\\\\section\\{([^}]*)\\}/g, '\\n### $$1\\n')
          .replace(/\\\\subsection\\{([^}]*)\\}/g, '\\n#### $$1\\n')
          .replace(/[{}]/g, '')
          .trim();
        root.innerHTML = '<div class="error">' + safeMessage + '</div><div class="preview-info">Readable Preview</div><pre class="fallback">' + friendlyText + '</pre>';
      }
      
      function tryRender() {
        try {
          const latexLib = window.latexjs || window['latexjs'] || window['LatexJS'];
          if (!latexLib || !latexLib.HtmlGenerator || !latexLib.parse) {
            if (retryCount < maxRetries && ${cdnAvailable}) {
              retryCount++;
              setTimeout(tryRender, 500);
              return;
            }
            fallback('LaTeX live renderer unavailable. Showing readable preview below.');
            return;
          }
          const parsed = latexLib.parse(normalizeForPreview(code), {
            generator: new latexLib.HtmlGenerator({ hyphenate: false })
          });
          const fragment = parsed && parsed.domFragment ? parsed.domFragment : null;
          if (!fragment) {
            fallback('Could not parse LaTeX. Showing readable preview below.');
            return;
          }
          root.innerHTML = '';
          root.appendChild(fragment);
        } catch (err) {
          fallback('LaTeX error: ' + (err && err.message ? err.message : 'parsing failed'));
        }
      }
      
      window.addEventListener('load', tryRender);
      setTimeout(tryRender, ${cdnAvailable ? 2000 : 100});
    })();
  `.replace(/\n\s+/g, '') // Minify by removing newlines and extra spaces
  
  return `<!doctype html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>${scriptTag}<style>body{margin:0;padding:1rem;font-family:ui-serif,Georgia,serif;background:#f5f5f5;color:#111827;font-size:14px;line-height:1.6}#root{background:#fff;border:1px solid #e5e7eb;border-radius:.75rem;padding:1.5rem;min-height:calc(100vh - 2rem);overflow:auto}h1,h2,h3,h4,h5,h6{margin-top:1.25rem;margin-bottom:0.75rem;font-weight:700;color:#000}h1{font-size:1.75rem;margin-top:0}h2{font-size:1.35rem;border-bottom:2px solid #e5e7eb;padding-bottom:0.5rem}h3{font-size:1.15rem}h4{font-size:1rem}p{margin:0.5rem 0}pre{white-space:pre-wrap;word-break:break-word;background:#f9fafb;border:1px solid #e5e7eb;border-radius:.5rem;padding:1rem;font-size:0.9rem;line-height:1.5;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow-x:auto}.error{color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;border-radius:.5rem;padding:1rem;margin-bottom:1rem;font-size:0.95rem;font-weight:500}.preview-info{color:#7c3aed;background:#ede9fe;border-bottom:2px solid #ddd6fe;padding:0.75rem 1rem;margin:1rem 0 0.5rem 0;font-weight:600;font-size:0.9rem;border-radius:.5rem}.fallback{font-family:ui-serif,Georgia,serif;font-size:.95rem;line-height:1.7;white-space:pre-wrap;word-break:break-word}ul,ol{list-style-position:outside;margin-left:1.5rem;margin-top:0.5rem;margin-bottom:0.5rem}li{margin:0.25rem 0;line-height:1.6}li > *{display:inline}strong,b{font-weight:700;color:#000}em,i{font-style:italic}a{color:#2563eb;text-decoration:underline}a:hover{color:#1d4ed8}center{text-align:center}</style></head><body><div id="root"><pre class="fallback">${safeFallbackText}</pre></div><script>${rendererScript}</script></body></html>`
}
