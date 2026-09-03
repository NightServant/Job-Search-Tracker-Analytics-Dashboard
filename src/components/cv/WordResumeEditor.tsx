'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import type { JSONContent } from '@tiptap/core'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Input } from '@/components/ui/input'
import { DownloadIcon, RotateCcwIcon, TrashIcon } from '@/components/icons'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { ResumeVersionHistory } from './ResumeVersionHistory'
import { DEFAULT_WORD_CONTENT, formatSaveTime, normalizeWordContent } from './content'
import { maybeCreateSnapshot } from '@/services/resumeSnapshotService'
import type { ResumeContent, ResumeDraft, ResumeMode } from '@/services/resumeService'
import { currentEnvSource, readSupabaseConfig } from '@/lib/env'

const TOOLBAR =
  'h-8 rounded-md border px-3 text-body-s transition-colors duration-[--duration-fast] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default'

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        TOOLBAR,
        active
          ? 'border-accent-default bg-accent-default text-accent-on-accent'
          : 'border-border-default bg-bg-canvas text-text-secondary hover:bg-bg-inset'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

/**
 * The document-style CV editor: Tiptap, autosave, snapshots and PDF export.
 *
 * Moved out of `src/screens/ResumePage.tsx` when that file was split into
 * `/documents` and `/cv`. The engine is byte-for-byte what it was -- the same
 * 1200ms save debounce, the same 5000ms snapshot debounce, the same
 * `resume-export-pdf` call -- because the plan asked for the chrome to be
 * restyled, not for the editor to be rewritten. What changed is the chrome:
 * M4 tokens, hairline rules, 4px radius, and no lucide. Its `Save` and
 * `Back` are text (two of the four glyphs the icon set eliminated), and
 * `RotateCcw`/`Download` resolve to the drawn icons. Its five formatting
 * buttons were already text-labelled, so dropping their glyphs cost nothing.
 *
 * Which draft is open now comes from `/cv?draft=<id>` rather than the deleted
 * screen's local `activeDraftId` state, so the route -- not this component --
 * decides what to render, and a CV is linkable.
 */
export interface WordResumeEditorProps {
  draft: ResumeDraft
  backHref: string
  onDelete: (draftId: string) => void
  onPersistDraft: (
    draftId: string,
    title: string,
    mode: ResumeMode,
    content: ResumeContent
  ) => Promise<ResumeDraft>
}

export function WordResumeEditor({
  draft,
  backHref,
  onDelete,
  onPersistDraft,
}: WordResumeEditorProps) {
  const { user } = useAuth()
  const { success, error: showError, info } = useToast()
  const [title, setTitle] = useState(draft.title)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  /**
   * Dirtiness is a comparison between two counters, not a boolean.
   *
   * A boolean cannot survive the save round trip. The debounce captures the
   * document as it is now, awaits the write, and then has to decide whether the
   * editor is still clean -- and by then more keystrokes may have arrived.
   * Clearing a boolean at that point marks work saved that was never sent, and
   * the header says "Saved 3:42 PM" with no unsaved marker over content that
   * exists only in the DOM. Stamping `savedRevision` with the revision that
   * was actually written leaves the editor dirty for anything typed since.
   *
   * It also fixes a second defect for free: `setIsDirty(true)` on an already
   * true value is not a state change, so React skipped the render and the
   * autosave effect never re-armed. A counter always changes, so an edit that
   * touches nothing else -- a body edit, a template reset -- still re-arms the
   * debounce. Without that, one failed save stopped autosave for the session.
   */
  const [revision, setRevision] = useState(0)
  const [savedRevision, setSavedRevision] = useState(0)
  const isDirty = revision !== savedRevision
  /**
   * `revisionRef` mirrors `revision` synchronously.
   *
   * `saveDraft` has to know which revision its write carries, and reading that
   * from the `revision` state variable reads the value of the render it was
   * created in. That is one behind for any caller that marks the editor dirty
   * and then saves in the same tick -- `restoreSnapshot` does exactly that --
   * so the write got stamped one revision short, the editor stayed dirty over
   * content that was saved, and the debounce re-sent it 1200ms later.
   */
  const revisionRef = useRef(0)
  const markDirty = () => {
    revisionRef.current += 1
    setRevision(revisionRef.current)
  }
  const [lastSavedAt, setLastSavedAt] = useState(draft.updated_at)
  const autosaveTimerRef = useRef<number | null>(null)
  const snapshotTimerRef = useRef<number | null>(null)

  const editor = useEditor({
    extensions: [StarterKit],
    content: normalizeWordContent(draft.content),
    editorProps: {
      attributes: { class: 'focus:outline-none min-h-[10in] text-[15px] leading-7 text-zinc-900' },
    },
    // Tiptap v3 renders eagerly by default, including on the server. This
    // component is 'use client', but App Router still server-renders a
    // client component for its initial HTML -- /cv is statically
    // prerendered (confirmed in the build output), so `useEditor` really
    // does run server-side. Without this, tiptap throws "SSR has been
    // detected, please set `immediatelyRender` explicitly to `false`" and
    // the whole route crashes with a client-side exception on load.
    immediatelyRender: false,
  })

  useEffect(() => {
    setTitle(draft.title)
    setLastSavedAt(draft.updated_at)
    // Cross-file invariant: `cv/page.tsx` renders the editor with
    // `key={draft.id}`, so switching CVs remounts rather than reusing this
    // component and this reset is belt-and-braces. If that key is ever
    // dropped, a save still in flight from the previous CV can land after the
    // counters are zeroed and stamp `savedRevision` above `revision`, which
    // strands the editor permanently dirty. Keep the key, or make this reset
    // cancel the in-flight save.
    revisionRef.current = 0
    setRevision(0)
    setSavedRevision(0)
    editor?.commands.setContent(normalizeWordContent(draft.content))
  }, [draft.id])

  useEffect(() => {
    if (!editor) return
    const onUpdate = () => markDirty()
    editor.on('update', onUpdate)
    return () => {
      editor.off('update', onUpdate)
    }
  }, [editor])

  /** Resolves to whether the write landed, so a caller can stop on failure. */
  const saveDraft = async (notify = false): Promise<boolean> => {
    if (!editor) return false
    // Read from the ref, not the state: a caller that marked the editor dirty
    // in this same tick has not re-rendered yet.
    const writing = revisionRef.current
    setIsSaving(true)
    try {
      const updated = await onPersistDraft(
        draft.id,
        title.trim() || 'Untitled CV',
        'word',
        editor.getJSON()
      )
      setLastSavedAt(updated.updated_at)
      // Never rewind: two saves can overlap, and the older one landing second
      // must not un-save what the newer one already wrote.
      setSavedRevision((current) => Math.max(current, writing))
      if (notify) success('Draft saved', 'Your CV draft is saved to Supabase.')
      return true
    } catch (err) {
      showError('Save failed', err instanceof Error ? err.message : 'Unable to save draft')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Routes every snapshot write through the cadence policy in
   * `resumeSnapshotService`: never write one identical to the latest, and
   * never write an autosave-triggered one more than once per five minutes.
   * `{ force: true }` -- passed only from the explicit Save handler below --
   * bypasses the floor but not the delta guard.
   */
  const writeSnapshot = async (options: { force?: boolean } = {}) => {
    if (!user || !editor) return
    try {
      await maybeCreateSnapshot(supabase, draft.id, user.id, editor.getJSON(), options)
    } catch (err) {
      // Silently fail for snapshots - don't interrupt user workflow
      console.error('Snapshot failed:', err)
    }
  }

  /** The explicit Save button: persists the draft, then forces a checkpoint snapshot. */
  const handleSave = async () => {
    const saved = await saveDraft(true)
    if (saved) void writeSnapshot({ force: true })
  }

  useEffect(() => {
    if (!editor || !isDirty) return
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(() => {
      void saveDraft(false)
    }, 1200)
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [revision, isDirty, editor])

  /**
   * Keyed on `revision` alone, deliberately.
   *
   * `isDirty` used to be in here, and going clean tore the timer down: the
   * save debounce is 1200ms and this one is 5000ms, so in every real session
   * the save landed first, cleared the flag, and cancelled the snapshot before
   * it could fire. Version history was not merely sparse -- it was never
   * written. `user` is out of the deps for the same reason (a re-run cancels);
   * the (app) layout renders nothing until auth resolves, so this component
   * cannot mount without one.
   */
  useEffect(() => {
    if (revision === 0) return
    if (snapshotTimerRef.current) window.clearTimeout(snapshotTimerRef.current)
    snapshotTimerRef.current = window.setTimeout(() => {
      void writeSnapshot()
    }, 5000)
    return () => {
      if (snapshotTimerRef.current) window.clearTimeout(snapshotTimerRef.current)
    }
  }, [revision])

  const exportPdf = async () => {
    if (!editor) return
    setIsExporting(true)
    try {
      // A PDF built from content the database refused is a PDF of something
      // that does not exist. Without this the editor showed "Save failed" and
      // "PDF ready" together and handed over the second one.
      if (!(await saveDraft(false))) return
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('No active session found')
      const { url: supabaseUrl, anonKey: supabaseAnonKey } = readSupabaseConfig(currentEnvSource())
      const response = await fetch(`${supabaseUrl}/functions/v1/resume-export-pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: title.trim() || 'Untitled CV', content: editor.getJSON() }),
      })
      if (!response.ok) throw new Error((await response.text()) || `Export failed (${response.status})`)
      const blob = await response.blob()
      const safeName = (title.trim() || 'cv')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeName || 'cv'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      success('PDF ready', 'Your CV PDF has been downloaded.')
    } catch (err) {
      showError('Export failed', err instanceof Error ? err.message : 'Could not export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  const resetTemplate = () => {
    editor?.commands.setContent(DEFAULT_WORD_CONTENT)
    markDirty()
    info('Template reset', 'The editor has been reset to the starter template.')
  }

  // applyTemplate and its dropdown are gone. Templates are chosen on
  // /documents now, before the document exists, at Gabe's instruction. In the
  // editor the action was destructive dressed as a preset -- it REPLACED
  // whatever was on screen, from a control sitting between `reset` and `save`
  // in the same toolbar. `reset` still restores the starter content, which is
  // the one in-editor case that is genuinely a reset rather than a swap.

  const restoreSnapshot = async (content: unknown) => {
    if (content && typeof content === 'object' && (content as { type?: string }).type === 'doc') {
      editor?.commands.setContent(content as JSONContent)
      markDirty()
      await saveDraft(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Word CV"
        action={
          <Link
            href={backHref}
            className={buttonVariants({ variant: 'ghost', size: 's' })}
          >
            back
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
        {user && (
          <ResumeVersionHistory resumeId={draft.id} userId={user.id} onRestore={restoreSnapshot} />
        )}
        <Button variant="secondary" size="s" onClick={resetTemplate} disabled={!editor}>
          <RotateCcwIcon size={14} aria-hidden />
          reset
        </Button>
        <Button
          variant="secondary"
          size="s"
          onClick={() => void handleSave()}
          disabled={!editor || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button size="s" onClick={exportPdf} disabled={!editor || isExporting}>
          <DownloadIcon size={14} aria-hidden />
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </Button>
        <Button
          variant="ghost"
          size="s"
          aria-label={`Delete ${draft.title}`}
          onClick={() => onDelete(draft.id)}
        >
          <TrashIcon size={14} aria-hidden />
          delete
        </Button>
      </div>

      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="text-label-caps uppercase text-text-secondary">CV title</span>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              markDirty()
            }}
            placeholder="untitled CV"
            className="mt-1"
          />
        </label>
        <p className="text-body-s text-text-muted md:text-right">
          {formatSaveTime(lastSavedAt)}
          {isDirty ? <span className="ml-2 text-amber-600">unsaved changes</span> : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-y border-border-subtle py-2">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={!!editor?.isActive('bold')}
          disabled={!editor}
        >
          bold
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={!!editor?.isActive('italic')}
          disabled={!editor}
        >
          italic
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={!!editor?.isActive('bulletList')}
          disabled={!editor}
        >
          bullets
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          active={!!editor?.isActive('heading', { level: 1 })}
          disabled={!editor}
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={!!editor?.isActive('heading', { level: 2 })}
          disabled={!editor}
        >
          H2
        </ToolbarButton>
      </div>

      {/* The page preview keeps its own white sheet and letter geometry: it is a
          print proof, not app chrome, so it does not follow the app's theme. */}
      <div className="overflow-x-auto bg-bg-inset p-4">
        <div className="mx-auto min-h-[11in] w-full max-w-[8.5in] bg-white">
          <EditorContent
            editor={editor}
            className="min-h-[11in] p-[0.8in] [&_.ProseMirror]:min-h-[9.4in] [&_.ProseMirror]:outline-none [&_.ProseMirror]:ring-0 [&_.ProseMirror]:shadow-none [&_.ProseMirror]:border-0 [&_.ProseMirror:focus]:outline-none [&_.ProseMirror:focus-visible]:outline-none [&_.ProseMirror:focus]:ring-0 [&_.ProseMirror:focus-visible]:ring-0 [&_.ProseMirror_*:focus]:outline-none [&_.ProseMirror_*:focus-visible]:outline-none [&_.ProseMirror_a]:outline-none [&_.ProseMirror_a:focus]:outline-none [&_.ProseMirror_h1]:mt-0 [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h1]:text-[2rem] [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:text-[1.15rem] [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_p]:my-2 [&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_li]:my-1"
          />
        </div>
      </div>

      <p className="text-body-s text-text-muted">
        Letter-style layout preview with 0.8in margins for a print-ready CV.
      </p>
    </div>
  )
}
