import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { JSONContent } from '@tiptap/core'
import {
  ArrowLeft,
  Bold,
  Code2,
  Download,
  FileText,
  Heading1,
  Heading2,
  Italic,
  List,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'

type ResumeMode = 'word' | 'latex'
type ResumeContent = JSONContent | { type: 'latex'; source: string }

type ResumeRow = {
  id: string
  title: string
  mode: ResumeMode | null
  content: ResumeContent | null
  updated_at: string
}

type ResumeDraft = {
  id: string
  title: string
  mode: ResumeMode
  content: ResumeContent | null
  updated_at: string
}

const DEFAULT_WORD_CONTENT: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Resume Title' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'email@example.com | (000) 000-0000 | portfolio.example' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Summary' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Experience' }] },
    { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Achieved measurable impact using clear, quantifiable results.' }] }] }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Projects' }] },
    { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Built a product with modern frontend and database tooling.' }] }] }] },
  ],
}

const DEFAULT_LATEX_SOURCE = String.raw`\documentclass[10pt,a4paper]{article}
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

function isLatexContent(content: ResumeContent | null | undefined): content is { type: 'latex'; source: string } {
  return !!content && typeof content === 'object' && (content as { type?: string }).type === 'latex'
}

function normalizeMode(mode: ResumeMode | null | undefined): ResumeMode {
  return mode === 'latex' ? 'latex' : 'word'
}

function normalizeWordContent(content: ResumeContent | null | undefined): JSONContent {
  if (content && typeof content === 'object' && (content as { type?: string }).type === 'doc') {
    return content as JSONContent
  }
  return DEFAULT_WORD_CONTENT
}

function normalizeLatexSource(content: ResumeContent | null | undefined): string {
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

function formatSaveTime(timestamp: string | null): string {
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

function buildLatexPreviewHtml(latexCode: string, cdnAvailable: boolean): string {
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
        root.innerHTML = '<p class="error">' + safeMessage + '</p><h3 style="margin-top:1rem">Readable Preview</h3><pre class="fallback">' + friendlyText + '</pre>';
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
            fallback('LaTeX live renderer unavailable. Showing fallback preview.');
            return;
          }
          const parsed = latexLib.parse(normalizeForPreview(code), {
            generator: new latexLib.HtmlGenerator({ hyphenate: false })
          });
          const fragment = parsed && parsed.domFragment ? parsed.domFragment : null;
          if (!fragment) {
            fallback('Could not parse LaTeX. Showing fallback preview.');
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
  
  return `<!doctype html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>${scriptTag}<style>body{margin:0;padding:1rem;font-family:ui-serif,Georgia,serif;background:#fafafa;color:#111827;font-size:14px}#root{background:#fff;border:1px solid #e5e7eb;border-radius:.75rem;padding:1.5rem;min-height:calc(100vh - 2rem);overflow:auto}h1,h2,h3,h4,h5,h6{margin-top:1rem;margin-bottom:0.5rem;font-weight:bold}h1{font-size:1.5rem}h2{font-size:1.25rem}h3{font-size:1.1rem}h4{font-size:1rem}pre{white-space:pre-wrap;word-break:break-word;background:#f4f4f5;border-radius:.5rem;padding:.75rem;font-size:0.9rem;line-height:1.4}.error{color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;border-radius:.5rem;padding:.75rem;margin-bottom:1rem;font-size:0.9rem}.info{color:#1d4ed8;background:#dbeafe;border:1px solid #bfdbfe;border-radius:.5rem;padding:.75rem;margin-bottom:1rem;font-size:0.9rem}.fallback{font-family:ui-serif,Georgia,serif;font-size:.95rem;line-height:1.6;white-space:pre-wrap;word-break:break-word}ul{list-style:disc;margin-left:1.5rem;margin-top:0.5rem;margin-bottom:0.5rem}li{margin:0.25rem 0}strong{font-weight:bold}em{font-style:italic}</style></head><body><div id="root"><pre class="fallback">${safeFallbackText}</pre></div><script>${rendererScript}</script></body></html>`
}

function DraftModePill({ mode }: { mode: ResumeMode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${mode === 'latex' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300' : 'bg-primary-500/15 text-primary-700 dark:text-primary-300'}`}>{mode === 'latex' ? 'LaTeX' : 'Word'}</span>
}

function ToolbarButton({ onClick, active, disabled, title, children }: { onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode }) {
  return <button type="button" className={`rounded-md border px-3 py-2 text-sm transition-colors ${active ? 'border-primary-600 bg-primary-600 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'}`} onClick={onClick} disabled={disabled} title={title}><span className="inline-flex items-center gap-1.5">{children}</span></button>
}

function ModeChooserModal({ onClose, onChoose }: { onClose: () => void; onChoose: (mode: ResumeMode) => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50" onClick={onClose} /><div className="relative w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Create a new resume</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Choose whether you want a Word-style editor or the LaTeX source editor.</p></div><button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800">Close</button></div><div className="mt-5 grid gap-3 md:grid-cols-2"><button type="button" onClick={() => onChoose('word')} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 text-left transition hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-sm"><div className="flex items-start gap-3"><div className="rounded-lg bg-primary-500/10 p-2 text-primary-600 dark:text-primary-300"><FileText className="w-5 h-5" /></div><div><p className="font-semibold text-zinc-900 dark:text-white">Word editor</p><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">A document-style editor with autosave and PDF export.</p></div></div></button><button type="button" onClick={() => onChoose('latex')} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 text-left transition hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-sm"><div className="flex items-start gap-3"><div className="rounded-lg bg-primary-500/10 p-2 text-primary-600 dark:text-primary-300"><Code2 className="w-5 h-5" /></div><div><p className="font-semibold text-zinc-900 dark:text-white">LaTeX editor</p><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Source-code editing with live preview for LaTeX users.</p></div></div></button></div></div></div>
}

function ResumeHub({ drafts, isLoading, onOpenDraft, onCreateNew, onDeleteDraft }: { drafts: ResumeDraft[]; isLoading: boolean; onOpenDraft: (draft: ResumeDraft) => void; onCreateNew: () => void; onDeleteDraft: (draftId: string) => void }) {
  return <section className="card p-5 md:p-6"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Resume Builder</h1><p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Open an existing draft or start a new one in Word or LaTeX mode.</p></div><button className="btn-primary" onClick={onCreateNew}><Plus className="w-4 h-4" />Add New Resume</button></div><div className="mt-5 space-y-3">{isLoading ? <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6 text-center text-zinc-500 dark:text-zinc-400">Loading your drafts...</div> : drafts.length === 0 ? <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 p-8 text-center"><p className="text-lg font-semibold text-zinc-900 dark:text-white">No drafts yet</p><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Create your first resume draft, then choose Word or LaTeX.</p><button className="btn-primary mt-4" onClick={onCreateNew}><Plus className="w-4 h-4" />Add New Resume</button></div> : drafts.map((draft) => <article key={draft.id} className="flex flex-col gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 md:flex-row md:items-center md:justify-between"><button type="button" className="text-left flex-1" onClick={() => onOpenDraft(draft)}><div className="flex items-center gap-2"><p className="font-semibold text-zinc-900 dark:text-white">{draft.title}</p><DraftModePill mode={draft.mode} /></div><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Updated {new Date(draft.updated_at).toLocaleString()}</p></button><div className="flex items-center gap-2"><button type="button" className="btn-secondary" onClick={() => onOpenDraft(draft)}>Open</button><button type="button" className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900" title="Delete draft" onClick={() => onDeleteDraft(draft.id)}><Trash2 className="w-4 h-4" /></button></div></article>)}</div></section>
}

function WordResumeEditor({ draft, onBack, onDelete, onPersistDraft }: { draft: ResumeDraft; onBack: () => void; onDelete: (draftId: string) => void; onPersistDraft: (draftId: string, title: string, mode: ResumeMode, content: ResumeContent) => Promise<ResumeDraft> }) {
  const { success, error: showError, info } = useToast()
  const [title, setTitle] = useState(draft.title)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(draft.updated_at)
  const autosaveTimerRef = useRef<number | null>(null)

  const editor = useEditor({
    extensions: [StarterKit],
    content: normalizeWordContent(draft.content),
    editorProps: { attributes: { class: 'focus:outline-none min-h-[10in] text-[15px] leading-7 text-zinc-900' } },
  })

  useEffect(() => {
    setTitle(draft.title)
    setLastSavedAt(draft.updated_at)
    setIsDirty(false)
    editor?.commands.setContent(normalizeWordContent(draft.content))
  }, [draft.id])

  useEffect(() => {
    if (!editor) return
    const onUpdate = () => setIsDirty(true)
    editor.on('update', onUpdate)
    return () => {
      editor.off('update', onUpdate)
    }
  }, [editor])

  const saveDraft = async (notify = false) => {
    if (!editor) return
    setIsSaving(true)
    try {
      const updated = await onPersistDraft(draft.id, title.trim() || 'Untitled Resume', 'word', editor.getJSON())
      setLastSavedAt(updated.updated_at)
      setIsDirty(false)
      if (notify) success('Draft saved', 'Your resume draft is saved to Supabase.')
    } catch (err) {
      showError('Save failed', err instanceof Error ? err.message : 'Unable to save draft')
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (!editor || !isDirty) return
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(() => { void saveDraft(false) }, 1200)
    return () => { if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current) }
  }, [isDirty, title, editor])

  const exportPdf = async () => {
    if (!editor) return
    setIsExporting(true)
    try {
      await saveDraft(false)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('No active session found')
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const response = await fetch(`${supabaseUrl}/functions/v1/resume-export-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || 'Untitled Resume', content: editor.getJSON() }),
      })
      if (!response.ok) throw new Error(await response.text() || `Export failed (${response.status})`)
      const blob = await response.blob()
      const safeName = (title.trim() || 'resume').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeName || 'resume'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      success('PDF ready', 'Your resume PDF has been downloaded.')
    } catch (err) {
      showError('Export failed', err instanceof Error ? err.message : 'Could not export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  const resetTemplate = () => {
    editor?.commands.setContent(DEFAULT_WORD_CONTENT)
    setIsDirty(true)
    info('Template reset', 'The editor has been reset to the starter template.')
  }

  return <section className="card p-5 md:p-6 space-y-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><button className="btn-secondary" onClick={onBack}><ArrowLeft className="w-4 h-4" />Back to drafts</button><div><h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Word Resume</h1><p className="text-sm text-zinc-500 dark:text-zinc-400">Document-style editor with autosave and PDF export.</p></div></div><div className="flex flex-wrap items-center gap-2"><button className="btn-secondary" onClick={resetTemplate} disabled={!editor}><RotateCcw className="w-4 h-4" />Reset Template</button><button className="btn-secondary" onClick={() => void saveDraft(true)} disabled={!editor || isSaving}><Save className="w-4 h-4" />{isSaving ? 'Saving...' : 'Save Draft'}</button><button className="btn-primary" onClick={exportPdf} disabled={!editor || isExporting}><Download className="w-4 h-4" />{isExporting ? 'Exporting...' : 'Export PDF'}</button><button type="button" className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={() => onDelete(draft.id)} title="Delete draft"><Trash2 className="w-4 h-4" /></button></div></div><div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-center"><label className="block"><span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Resume title</span><input value={title} onChange={(e) => { setTitle(e.target.value); setIsDirty(true) }} placeholder="Untitled Resume" className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500" /></label><div className="text-sm text-zinc-500 dark:text-zinc-400 md:text-right">{formatSaveTime(lastSavedAt)}{isDirty ? <span className="ml-2 text-amber-500">Unsaved changes</span> : null}</div></div><div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-2"><ToolbarButton onClick={() => editor?.chain().focus().toggleBold().run()} active={!!editor?.isActive('bold')} disabled={!editor} title="Bold"><Bold className="w-4 h-4" />Bold</ToolbarButton><ToolbarButton onClick={() => editor?.chain().focus().toggleItalic().run()} active={!!editor?.isActive('italic')} disabled={!editor} title="Italic"><Italic className="w-4 h-4" />Italic</ToolbarButton><ToolbarButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={!!editor?.isActive('bulletList')} disabled={!editor} title="Bullet list"><List className="w-4 h-4" />Bullets</ToolbarButton><ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={!!editor?.isActive('heading', { level: 1 })} disabled={!editor} title="Heading 1"><Heading1 className="w-4 h-4" />H1</ToolbarButton><ToolbarButton onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={!!editor?.isActive('heading', { level: 2 })} disabled={!editor} title="Heading 2"><Heading2 className="w-4 h-4" />H2</ToolbarButton></div><div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950/40 p-4"><div className="mx-auto min-h-[11in] w-full max-w-[8.5in] bg-white shadow-[0_20px_45px_rgba(0,0,0,0.18)]"><EditorContent editor={editor} className="min-h-[11in] p-[0.8in] [&_.ProseMirror]:min-h-[9.4in] [&_.ProseMirror]:outline-none [&_.ProseMirror]:ring-0 [&_.ProseMirror]:shadow-none [&_.ProseMirror]:border-0 [&_.ProseMirror:focus]:outline-none [&_.ProseMirror:focus-visible]:outline-none [&_.ProseMirror:focus]:ring-0 [&_.ProseMirror:focus-visible]:ring-0 [&_.ProseMirror_*:focus]:outline-none [&_.ProseMirror_*:focus-visible]:outline-none [&_.ProseMirror_a]:outline-none [&_.ProseMirror_a:focus]:outline-none [&_.ProseMirror_h1]:mt-0 [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h1]:text-[2rem] [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:text-[1.15rem] [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_p]:my-2 [&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_li]:my-1" /></div></div><p className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400"><FileText className="w-3.5 h-3.5" />Letter-style layout preview with 0.8in margins for a print-ready resume.</p></section>
}

function LatexResumeEditor({ draft, onBack, onDelete, onPersistDraft }: { draft: ResumeDraft; onBack: () => void; onDelete: (draftId: string) => void; onPersistDraft: (draftId: string, title: string, mode: ResumeMode, content: ResumeContent) => Promise<ResumeDraft> }) {
  const { success, error: showError } = useToast()
  const [title, setTitle] = useState(draft.title)
  const [latexSource, setLatexSource] = useState(normalizeLatexSource(draft.content))
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(draft.updated_at)
  const [cdnAvailable, setCdnAvailable] = useState(false)
  const cdnCheckRef = useRef(false)
  const autosaveTimerRef = useRef<number | null>(null)

  // Load CDN with retry logic and timeout
  useEffect(() => {
    if (cdnCheckRef.current) return // Only check once per component lifetime
    cdnCheckRef.current = true
    
    let mounted = true
    let attemptCount = 0
    const maxAttempts = 2
    
    const checkCdn = async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000) // 5 second timeout
        
        const resp = await fetch('https://cdn.jsdelivr.net/npm/latex.js@0.12.4/dist/latex.min.js', { signal: controller.signal })
        clearTimeout(timeout)
        
        if (resp.ok && mounted) {
          setCdnAvailable(true)
        }
      } catch (err) {
        if (mounted && attemptCount < maxAttempts) {
          attemptCount++
          setTimeout(checkCdn, 1000) // Retry after 1 second
        }
      }
    }
    
    checkCdn()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    setTitle(draft.title)
    setLatexSource(normalizeLatexSource(draft.content))
    setLastSavedAt(draft.updated_at)
    setIsDirty(false)
  }, [draft.id])

  const previewHtml = useMemo(() => buildLatexPreviewHtml(latexSource, cdnAvailable), [latexSource, cdnAvailable])

  const saveDraft = async (notify = false) => {
    setIsSaving(true)
    try {
      const updated = await onPersistDraft(draft.id, title.trim() || 'Untitled Resume', 'latex', { type: 'latex', source: latexSource })
      setLastSavedAt(updated.updated_at)
      setIsDirty(false)
      if (notify) success('Draft saved', 'Your LaTeX draft is saved to Supabase.')
    } catch (err) {
      showError('Save failed', err instanceof Error ? err.message : 'Unable to save draft')
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (!isDirty) return
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(() => { void saveDraft(false) }, 1200)
    return () => { if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current) }
  }, [isDirty, title, latexSource])

  const copyLatex = async () => {
    try {
      await navigator.clipboard.writeText(latexSource)
      success('Copied', 'LaTeX source copied to clipboard.')
    } catch {
      showError('Copy failed', 'Clipboard is unavailable in this browser context.')
    }
  }

  const resetTemplate = () => {
    setLatexSource(DEFAULT_LATEX_SOURCE)
    setIsDirty(true)
  }

  return <section className="card p-5 md:p-6 space-y-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><button className="btn-secondary" onClick={onBack}><ArrowLeft className="w-4 h-4" />Back to drafts</button><div><h1 className="text-2xl font-bold text-zinc-900 dark:text-white">LaTeX Resume</h1><p className="text-sm text-zinc-500 dark:text-zinc-400">Source editor with live preview{cdnAvailable ? ' ✓' : ' (rendering optimized)'}.</p></div></div><div className="flex flex-wrap items-center gap-2"><button className="btn-secondary" onClick={resetTemplate}><RotateCcw className="w-4 h-4" />Reset Template</button><button className="btn-secondary" onClick={() => void saveDraft(true)} disabled={isSaving}><Save className="w-4 h-4" />{isSaving ? 'Saving...' : 'Save Draft'}</button><button className="btn-secondary" onClick={copyLatex}><Code2 className="w-4 h-4" />Copy LaTeX</button><button type="button" className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={() => onDelete(draft.id)} title="Delete draft"><Trash2 className="w-4 h-4" /></button></div></div><div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-center"><label className="block"><span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Resume title</span><input value={title} onChange={(e) => { setTitle(e.target.value); setIsDirty(true) }} placeholder="Untitled Resume" className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500" /></label><div className="text-sm text-zinc-500 dark:text-zinc-400 md:text-right">{formatSaveTime(lastSavedAt)}{isDirty ? <span className="ml-2 text-amber-500">Unsaved changes</span> : null}</div></div><div className="grid grid-cols-1 gap-4 xl:grid-cols-2"><div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3"><div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">LaTeX Source</p><span className="text-xs text-zinc-500">{latexSource.length} chars</span></div><textarea value={latexSource} onChange={(e) => { setLatexSource(e.target.value); setIsDirty(true) }} className="h-[540px] w-full resize-y rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500" spellCheck={false} aria-label="LaTeX source" /></div><div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3"><div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Preview</p><span className="inline-flex items-center gap-1 text-xs text-zinc-500"><FileText className="w-3.5 h-3.5" />{cdnAvailable ? 'Live rendering' : 'Readable preview'}</span></div><iframe title="LaTeX preview" srcDoc={previewHtml} className="h-[540px] w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white" sandbox="allow-scripts allow-same-origin" /></div></div></section>
}

export default function ResumePage() {
  const { user } = useAuth()
  const { error: showError, info } = useToast()
  const [drafts, setDrafts] = useState<ResumeDraft[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const activeDraft = useMemo(() => drafts.find((draft) => draft.id === activeDraftId) ?? null, [activeDraftId, drafts])

  const loadDrafts = async () => {
    if (!user) {
      setDrafts([])
      setActiveDraftId(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('resumes').select('id, title, mode, content, updated_at').order('updated_at', { ascending: false })
      if (error) throw error
      const nextDrafts = (data ?? []).map((row) => ({
        id: row.id,
        title: row.title || 'Untitled Resume',
        mode: normalizeMode(row.mode),
        content: row.content as ResumeContent | null,
        updated_at: row.updated_at,
      }))
      setDrafts(nextDrafts)
      setActiveDraftId((current) => (current && nextDrafts.some((draft) => draft.id === current) ? current : null))
    } catch (err) {
      showError('Failed to load resumes', err instanceof Error ? err.message : 'Could not load drafts')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void loadDrafts() }, [user])

  const persistDraft = async (draftId: string, title: string, mode: ResumeMode, content: ResumeContent): Promise<ResumeDraft> => {
    const { data, error } = await supabase.from('resumes').update({ title, mode, content }).eq('id', draftId).select('id, title, mode, content, updated_at').single<ResumeRow>()
    if (error) throw error
    const updatedDraft: ResumeDraft = { id: data.id, title: data.title || 'Untitled Resume', mode: normalizeMode(data.mode), content: data.content as ResumeContent | null, updated_at: data.updated_at }
    setDrafts((prev) => [updatedDraft, ...prev.filter((draft) => draft.id !== updatedDraft.id)])
    return updatedDraft
  }

  const createDraft = async (mode: ResumeMode) => {
    if (!user) return
    try {
      const content: ResumeContent = mode === 'latex' ? { type: 'latex', source: DEFAULT_LATEX_SOURCE } : DEFAULT_WORD_CONTENT
      const defaultTitle = mode === 'latex' ? 'Untitled LaTeX Resume' : 'Untitled Resume'
      const { data, error } = await supabase.from('resumes').insert({ user_id: user.id, title: defaultTitle, mode, content }).select('id, title, mode, content, updated_at').single<ResumeRow>()
      if (error) throw error
      const newDraft: ResumeDraft = { id: data.id, title: data.title || defaultTitle, mode: normalizeMode(data.mode), content: data.content as ResumeContent | null, updated_at: data.updated_at }
      setDrafts((prev) => [newDraft, ...prev.filter((draft) => draft.id !== newDraft.id)])
      setActiveDraftId(newDraft.id)
      setIsCreateModalOpen(false)
      info('Draft created', `${mode === 'latex' ? 'LaTeX' : 'Word'} resume draft ready.`)
    } catch (err) {
      showError('Create failed', err instanceof Error ? err.message : 'Could not create draft')
    }
  }

  const deleteDraft = async (draftId: string) => {
    if (!window.confirm('Delete this resume draft? This cannot be undone.')) return
    try {
      const { error } = await supabase.from('resumes').delete().eq('id', draftId)
      if (error) throw error
      setDrafts((prev) => prev.filter((draft) => draft.id !== draftId))
      setActiveDraftId((current) => (current === draftId ? null : current))
      info('Draft deleted', 'The resume draft was removed.')
    } catch (err) {
      showError('Delete failed', err instanceof Error ? err.message : 'Could not delete draft')
    }
  }

  return (
    <div className="space-y-6">
      {!activeDraft ? (
        <ResumeHub drafts={drafts} isLoading={isLoading} onOpenDraft={(draft) => setActiveDraftId(draft.id)} onCreateNew={() => setIsCreateModalOpen(true)} onDeleteDraft={deleteDraft} />
      ) : activeDraft.mode === 'latex' ? (
        <LatexResumeEditor key={activeDraft.id} draft={activeDraft} onBack={() => setActiveDraftId(null)} onDelete={deleteDraft} onPersistDraft={persistDraft} />
      ) : (
        <WordResumeEditor key={activeDraft.id} draft={activeDraft} onBack={() => setActiveDraftId(null)} onDelete={deleteDraft} onPersistDraft={persistDraft} />
      )}
      {isCreateModalOpen ? <ModeChooserModal onClose={() => setIsCreateModalOpen(false)} onChoose={(mode) => void createDraft(mode)} /> : null}
    </div>
  )
}
