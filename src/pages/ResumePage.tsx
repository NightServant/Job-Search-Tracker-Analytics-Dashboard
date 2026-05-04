import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { JSONContent } from '@tiptap/core'
import {
  Bold,
  Download,
  FileText,
  Heading1,
  Heading2,
  Italic,
  List,
  Save,
  RotateCcw,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'

type ResumeRow = {
  id: string
  title: string
  content: JSONContent
  updated_at: string
}

const DEFAULT_CONTENT: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Resume Title' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'email@example.com | (000) 000-0000 | portfolio.example',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'linkedin.example | github.example',
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Summary' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Experience' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Role Title | Date Range | Organization Name' }],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Projects' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Project Title | Technology Stack' }],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
                },
              ],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Education' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Degree Name | Institution Name | Graduation Year' }],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Courses and Certifications' }],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Certification Placeholder 1' }],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Certification Placeholder 2' }],
            },
          ],
        },
      ],
    },
  ],
}

function formatSaveTime(timestamp: string | null): string {
  if (!timestamp) return 'Not saved yet'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'Not saved yet'
  return `Saved ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`rounded-md px-3 py-2 border text-sm transition-colors ${
        active
          ? 'bg-primary-600 text-white border-primary-600'
          : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      <span className="inline-flex items-center gap-1.5">{children}</span>
    </button>
  )
}

export default function ResumePage() {
  const { user } = useAuth()
  const { success, error: showError, info } = useToast()
  const [resumeId, setResumeId] = useState<string | null>(null)
  const [title, setTitle] = useState('Untitled Resume')
  const [isLoadingDraft, setIsLoadingDraft] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const autosaveTimerRef = useRef<number | null>(null)

  const editor = useEditor({
    extensions: [StarterKit],
    content: DEFAULT_CONTENT,
    editorProps: {
      attributes: {
        class:
          'focus:outline-none min-h-[10in] text-[15px] leading-7 text-zinc-900',
      },
    },
  })

  useEffect(() => {
    if (!editor || !user) return
    let cancelled = false

    const loadDraft = async () => {
      setIsLoadingDraft(true)
      try {
        const { data, error } = await supabase
          .from('resumes')
          .select('id, title, content, updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle<ResumeRow>()

        if (error) throw error
        if (cancelled) return

        if (data?.content) {
          setResumeId(data.id)
          setTitle(data.title || 'Untitled Resume')
          editor.commands.setContent(data.content)
          setLastSavedAt(data.updated_at || null)
          info('Draft loaded', 'Loaded your latest resume draft from Supabase.')
        } else {
          setResumeId(null)
          setTitle('Untitled Resume')
          editor.commands.setContent(DEFAULT_CONTENT)
          setLastSavedAt(null)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load draft'
        showError('Failed to load resume draft', message)
      } finally {
        if (!cancelled) {
          setInitialized(true)
          setIsLoadingDraft(false)
          setIsDirty(false)
        }
      }
    }

    void loadDraft()

    return () => {
      cancelled = true
    }
  }, [editor, info, showError, user])

  useEffect(() => {
    if (!editor) return

    const onEditorUpdate = () => {
      if (initialized) setIsDirty(true)
    }

    editor.on('update', onEditorUpdate)
    return () => {
      editor.off('update', onEditorUpdate)
    }
  }, [editor, initialized])

  const saveDraft = async (notify = false) => {
    if (!editor || !user) return

    setIsSaving(true)
    try {
      const payloadId = resumeId ?? crypto.randomUUID()
      const payloadTitle = title.trim() || 'Untitled Resume'

      const { data, error } = await supabase
        .from('resumes')
        .upsert(
          {
            id: payloadId,
            user_id: user.id,
            title: payloadTitle,
            content: editor.getJSON(),
          },
          { onConflict: 'id' }
        )
        .select('id, updated_at')
        .single<{ id: string; updated_at: string }>()

      if (error) throw error

      setResumeId(data.id)
      setLastSavedAt(data.updated_at)
      setIsDirty(false)

      if (notify) {
        success('Draft saved', 'Your resume draft is saved to Supabase.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save draft'
      showError('Save failed', message)
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (!initialized || !isDirty || !user) return

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void saveDraft(false)
    }, 1200)

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [initialized, isDirty, title, user])

  const exportPdf = async () => {
    if (!editor || !user) {
      showError('Not signed in', 'Sign in first to export your resume PDF.')
      return
    }

    setIsExporting(true)
    try {
      await saveDraft(false)

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No active session found')
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(`${supabaseUrl}/functions/v1/resume-export-pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim() || 'Untitled Resume',
          content: editor.getJSON(),
        }),
      })

      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || `Export failed (${response.status})`)
      }

      const blob = await response.blob()
      const safeName = (title.trim() || 'resume')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeName || 'resume'}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      success('PDF ready', 'Your resume PDF has been downloaded.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not export PDF'
      showError('Export failed', message)
    } finally {
      setIsExporting(false)
    }
  }

  const resetTemplate = () => {
    if (!editor) return
    editor.commands.setContent(DEFAULT_CONTENT)
    setIsDirty(true)
    info('Template reset', 'The editor has been reset to the starter resume template.')
  }

  return (
    <div className="space-y-6">
      <section className="card p-5 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Resume Builder</h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Edit like a document, autosave drafts to Supabase, and export a print-ready PDF.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-secondary" onClick={resetTemplate} disabled={!editor || isLoadingDraft}>
                <RotateCcw className="w-4 h-4" />
                Reset Template
              </button>
              <button className="btn-secondary" onClick={() => void saveDraft(true)} disabled={!editor || isSaving || isLoadingDraft}>
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button className="btn-primary" onClick={exportPdf} disabled={!editor || isExporting || isLoadingDraft}>
                <Download className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Resume title</span>
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (initialized) setIsDirty(true)
                }}
                placeholder="Untitled Resume"
                className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </label>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 md:text-right">
              {isLoadingDraft ? 'Loading draft...' : formatSaveTime(lastSavedAt)}
              {isDirty ? <span className="ml-2 text-amber-500">Unsaved changes</span> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-2">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={!!editor?.isActive('bold')}
              disabled={!editor}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
              Bold
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={!!editor?.isActive('italic')}
              disabled={!editor}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
              Italic
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={!!editor?.isActive('bulletList')}
              disabled={!editor}
              title="Bullet list"
            >
              <List className="w-4 h-4" />
              Bullets
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              active={!!editor?.isActive('heading', { level: 1 })}
              disabled={!editor}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
              H1
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              active={!!editor?.isActive('heading', { level: 2 })}
              disabled={!editor}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
              H2
            </ToolbarButton>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950/40 p-4">
            <div className="mx-auto w-full max-w-[8.5in] min-h-[11in] bg-white shadow-[0_20px_45px_rgba(0,0,0,0.18)]">
              <EditorContent
                editor={editor}
                className="min-h-[11in] p-[0.8in] [&_.ProseMirror]:min-h-[9.4in] [&_.ProseMirror]:outline-none [&_.ProseMirror_h1]:mt-0 [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h1]:text-[2rem] [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:text-[1.15rem] [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_p]:my-2 [&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_li]:my-1"
              />
            </div>
          </div>

          <p className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <FileText className="w-3.5 h-3.5" />
            Letter layout preview: 8.5in x 11in with 0.8in margins for WYSIWYG-style PDF output.
          </p>
        </div>
      </section>
    </div>
  )
}
