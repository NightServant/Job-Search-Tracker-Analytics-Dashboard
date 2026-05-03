import { useMemo, useRef, useState } from 'react'
import {
  Download,
  Eye,
  FileCode2,
  FileOutput,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import {
  useCreateResumeDocument,
  useDeleteResumeDocument,
  useExportResumePdf,
  useResumeDocuments,
} from '@/hooks/useResumes'
import { resumeService } from '@/services/resumeService'
import { ResumeDocType, ResumeDocument } from '@/types'

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

function prettyBytes(value: number | null): string {
  if (!value || value <= 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let idx = 0

  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024
    idx += 1
  }

  return `${size.toFixed(size >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

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
          if (!window.latexjs || !window.latexjs.HtmlGenerator || !window.latexjs.parse) {
            showFallback('Live renderer unavailable in this browser. Showing source.');
            return;
          }

          const generator = new window.latexjs.HtmlGenerator({ hyphenate: false });
          const parsed = window.latexjs.parse(code, { generator: generator });
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
  const { data: docs = [], isLoading } = useResumeDocuments()
  const createDocument = useCreateResumeDocument()
  const deleteDocument = useDeleteResumeDocument()
  const exportResumePdf = useExportResumePdf()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [docTitle, setDocTitle] = useState('My Resume')
  const [docType, setDocType] = useState<ResumeDocType>('resume')
  const [latexCode, setLatexCode] = useState<string>(() => {
    try {
      return localStorage.getItem(LATEX_STORAGE_KEY) || DEFAULT_RESUME_TEX
    } catch {
      return DEFAULT_RESUME_TEX
    }
  })
  const [search, setSearch] = useState('')

  const previewHtml = useMemo(() => buildLatexPreviewHtml(latexCode), [latexCode])

  const filteredDocs = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return docs

    return docs.filter((doc) => {
      return (
        doc.title.toLowerCase().includes(term) ||
        doc.file_name.toLowerCase().includes(term) ||
        doc.doc_type.toLowerCase().includes(term)
      )
    })
  }, [docs, search])

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

  const openUploadPicker = () => {
    fileInputRef.current?.click()
  }

  const uploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    const title = docTitle.trim()
    if (!title) {
      showError('Title is required', 'Enter a title before uploading your file.')
      return
    }

    try {
      await createDocument.mutateAsync({
        title,
        docType,
        file,
      })
      success('Document uploaded', `${file.name} is now in your resume library.`)
    } catch (err) {
      showError(
        'Upload failed',
        err instanceof Error ? err.message : 'Could not upload document.'
      )
    }
  }

  const handleDownload = async (doc: ResumeDocument) => {
    try {
      const signedUrl = await resumeService.getDownloadUrl(doc.file_path)
      window.open(signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      showError(
        'Download failed',
        err instanceof Error ? err.message : 'Could not open download link.'
      )
    }
  }

  const handleDelete = async (doc: ResumeDocument) => {
    const confirmed = window.confirm(`Delete ${doc.file_name}?`)
    if (!confirmed) return

    try {
      await deleteDocument.mutateAsync(doc)
      success('Document deleted', `${doc.file_name} was removed from your library.`)
    } catch (err) {
      showError('Delete failed', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleExportPdf = async () => {
    const title = docTitle.trim()
    if (!title) {
      showError('Title is required', 'Enter a document title before exporting to PDF.')
      return
    }

    const latex = latexCode.trim()
    if (!latex) {
      showError('LaTeX is empty', 'Add LaTeX content before exporting.')
      return
    }

    try {
      const result = await exportResumePdf.mutateAsync({
        latex,
        title,
        docType,
      })

      success('PDF exported', 'Your generated PDF was saved to the library.')
      window.open(result.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      showError(
        'Export failed',
        err instanceof Error
          ? err.message
          : 'Could not export this LaTeX document to PDF.'
      )
    }
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
            <button
              className="btn-primary"
              onClick={handleExportPdf}
              disabled={exportResumePdf.isPending}
            >
              {exportResumePdf.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileOutput className="w-4 h-4" />
              )}
              Export PDF
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
              sandbox="allow-scripts"
            />
          </div>
        </div>
      </section>

      <section className="card p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Resume and CV Library</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Upload finalized files and keep all versions organized in one place.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div>
              <label className="label">Document Title</label>
              <input
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="input min-w-[220px]"
                placeholder="Senior SWE Resume"
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as ResumeDocType)}
                className="input min-w-[140px]"
              >
                <option value="resume">Resume</option>
                <option value="cv">CV</option>
              </select>
            </div>
            <button
              className="btn-primary"
              onClick={openUploadPicker}
              disabled={createDocument.isPending}
            >
              {createDocument.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Upload File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.tex,.txt"
              onChange={uploadDocument}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="label">Search Library</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input max-w-md"
            placeholder="Search by title, filename, or type"
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100/80 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-300">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Filename</th>
                <th className="px-4 py-3 text-left font-medium">Size</th>
                <th className="px-4 py-3 text-left font-medium">Uploaded</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading documents...
                    </span>
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                    No documents yet. Upload your first resume or CV.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-t border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100"
                  >
                    <td className="px-4 py-3 font-medium">{doc.title}</td>
                    <td className="px-4 py-3 uppercase tracking-wide text-xs text-zinc-500">{doc.doc_type}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-400" />
                        {doc.file_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{prettyBytes(doc.file_size)}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button className="btn-ghost" onClick={() => handleDownload(doc)}>
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => handleDelete(doc)}
                          disabled={deleteDocument.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
