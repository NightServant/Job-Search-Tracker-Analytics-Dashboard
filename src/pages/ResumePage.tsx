import { useMemo, useState } from 'react'
import {
  Eye,
  FileCode2,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

const LATEX_STORAGE_KEY = 'resume-maker-latex-v1'

const DEFAULT_RESUME_TEX = String.raw`\documentclass[11pt]{article}
\usepackage[margin=0.8in]{geometry}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\pagenumbering{gobble}

\begin{document}

\begin{center}
  {\LARGE \textbf{Your Name}} \\
  City, ST \quad|\quad your.email@example.com \quad|\quad (555) 123-4567 \\
  \href{https://linkedin.com/in/yourname}{linkedin.com/in/yourname} \quad|\quad \href{https://github.com/yourname}{github.com/yourname}
\end{center}

\vspace{0.3em}
\textbf{SUMMARY}
\hrule
Results-driven software engineer with experience building production web applications with React, TypeScript, and SQL.

\vspace{0.5em}
\textbf{EXPERIENCE}
\hrule
\textbf{Software Engineer} \hfill 2024 -- Present \\
Acme Corp, Remote
\begin{itemize}[leftmargin=1.2em]
  \item Built analytics dashboards that improved job tracking workflows for end users.
  \item Reduced page load times through lazy loading and optimized data-fetching patterns.
\end{itemize}

\vspace{0.5em}
\textbf{PROJECTS}
\hrule
\textbf{Job Search Tracker Dashboard}
\begin{itemize}[leftmargin=1.2em]
  \item Created a full-stack app with React, Tailwind, Supabase, and data visualizations.
  \item Added CSV import/export and robust filtering for high-volume application tracking.
\end{itemize}

\vspace{0.5em}
\textbf{SKILLS}
\hrule
React, TypeScript, JavaScript, Node.js, SQL, Python, Git, CI/CD

\end{document}
`

function escapeForScript(str: string): string {
  return str.replace(/<\//g, '<\\/')
}

function buildLatexPreviewHtml(latexCode: string): string {
  const safeCode = escapeForScript(latexCode)

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.jsdelivr.net/npm/latex.js/dist/latex.min.js"></script>
    <style>
      body {
        margin: 0;
        padding: 1rem;
        font-family: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;
        background: #fafafa;
        color: #111827;
      }
      #root {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        padding: 1rem;
        min-height: calc(100vh - 2rem);
        overflow: auto;
      }
      pre {
        white-space: pre-wrap;
        word-break: break-word;
        background: #f4f4f5;
        border-radius: 0.5rem;
        padding: 0.75rem;
      }
      .error {
        color: #b91c1c;
        background: #fee2e2;
        border: 1px solid #fecaca;
        border-radius: 0.5rem;
        padding: 0.75rem;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      (function () {
        const code = ${JSON.stringify(safeCode)};
        const root = document.getElementById('root');

        function normalizeForPreview(input) {
          const text = String(input || '');

          let body = text;
          const beginTag = /\\begin{document}/i;
          const endTag = /\\end{document}/i;
          const beginMatch = beginTag.exec(text);
          const endMatch = endTag.exec(text);

          if (beginMatch && endMatch && beginMatch.index < endMatch.index) {
            body = text.slice(beginMatch.index + beginMatch[0].length, endMatch.index);
          }

          // latex.js has limited support for full preambles/packages in-browser.
          body = body
            .replace(/^\\documentclass[^\n]*$/gim, '')
            .replace(/^\\usepackage[^\n]*$/gim, '')
            .replace(/^\\pagenumbering[^\n]*$/gim, '')
            .replace(/\\href{[^}]*}{([^}]*)}/g, '$1');

          return '\\begin{document}\n' + body.trim() + '\n\\end{document}';
        }

        function showFallback(message) {
          const safeMessage = String(message)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

          root.innerHTML = '<p class="error">' + safeMessage + '</p><h3>LaTeX source</h3><pre>' +
            code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
            '</pre>';
        }

        try {
          var latexLib = window.latexjs || window['latexjs'] || window['LatexJS'] || window['latex'];
          if (!latexLib || !latexLib.HtmlGenerator || !latexLib.parse) {
            showFallback('Live renderer unavailable in this browser. Showing source.');
            return;
          }

          const previewCode = normalizeForPreview(code);
          const generator = new latexLib.HtmlGenerator({ hyphenate: false });
          const parsed = latexLib.parse(previewCode, { generator: generator });
          const fragment = parsed && parsed.domFragment ? parsed.domFragment : null;
          if (!fragment) {
            showFallback('Could not parse this LaTeX. Showing source.');
            return;
          }

          root.innerHTML = '';
          root.appendChild(fragment);
        } catch (err) {
          const message = err && err.message ? err.message : 'Unknown parser error';
          showFallback('LaTeX parse error: ' + message);
        }
      })();
    </script>
  </body>
</html>`
}

export default function ResumePage() {
  const { success, error: showError, info } = useToast()
  const [latexCode, setLatexCode] = useState<string>(() => {
    try {
      return localStorage.getItem(LATEX_STORAGE_KEY) || DEFAULT_RESUME_TEX
    } catch {
      return DEFAULT_RESUME_TEX
    }
  })

  const previewHtml = useMemo(() => buildLatexPreviewHtml(latexCode), [latexCode])

  const persistLatex = (nextValue: string) => {
    setLatexCode(nextValue)
    try {
      localStorage.setItem(LATEX_STORAGE_KEY, nextValue)
    } catch {
      // localStorage can fail in privacy mode
    }
  }

  const resetTemplate = () => {
    persistLatex(DEFAULT_RESUME_TEX)
    info('Template reset', 'Loaded the starter LaTeX resume template.')
  }

  return (
    <div className="space-y-6">
      <section className="card p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Resume Maker</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Write LaTeX on the left and preview on the right. Keep refining until it looks exactly how
              you want.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-secondary" onClick={resetTemplate}>
              <RefreshCw className="w-4 h-4" />
              Reset Template
            </button>
            <button
              className="btn-primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(latexCode)
                  success('Copied', 'LaTeX code copied to clipboard.')
                } catch {
                  showError('Copy failed', 'Clipboard is unavailable in this browser context.')
                }
              }}
            >
              <FileCode2 className="w-4 h-4" />
              Copy LaTeX
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">LaTeX Source</p>
              <span className="text-xs text-zinc-500">{latexCode.length} chars</span>
            </div>
            <textarea
              value={latexCode}
              onChange={(e) => persistLatex(e.target.value)}
              className="h-[540px] w-full resize-y rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              spellCheck={false}
              aria-label="LaTeX source"
            />
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Preview</p>
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                <Eye className="w-3.5 h-3.5" />
                Live
              </span>
            </div>
            <iframe
              title="LaTeX preview"
              srcDoc={previewHtml}
              className="h-[540px] w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
