'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RotateCcwIcon, TrashIcon } from '@/components/icons'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { ResumeVersionHistory } from './ResumeVersionHistory'
import { TemplatePresetSelector } from './TemplatePresetSelector'
import {
  DEFAULT_LATEX_SOURCE,
  buildLatexPreviewHtml,
  formatSaveTime,
  normalizeLatexSource,
} from './content'
import { createSnapshot } from '@/services/resumeSnapshotService'
import type { ResumeTemplate } from '@/services/resumeTemplateService'
import type { ResumeContent, ResumeDraft, ResumeMode } from '@/services/resumeService'

/**
 * The LaTeX source editor with its live preview.
 *
 * Moved out of `src/screens/ResumePage.tsx` when that file was split. The
 * engine is unchanged -- the same CDN probe with its two retries, the same
 * `buildLatexPreviewHtml` document in a sandboxed iframe, the same 1200ms save
 * and 5000ms snapshot debounces -- because this was a move, not a rewrite. The
 * chrome is M4, and the only lucide glyphs it carried (`Save`, `RotateCcw`,
 * `Code2`) resolve to a text button, `RotateCcwIcon` and another text button.
 */
export interface LatexResumeEditorProps {
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

export function LatexResumeEditor({
  draft,
  backHref,
  onDelete,
  onPersistDraft,
}: LatexResumeEditorProps) {
  const { user } = useAuth()
  const { success, error: showError, info } = useToast()
  const [title, setTitle] = useState(draft.title)
  const [latexSource, setLatexSource] = useState(normalizeLatexSource(draft.content))
  const [isSaving, setIsSaving] = useState(false)
  /**
   * Dirtiness is a comparison between two counters, not a boolean.
   *
   * A boolean cannot survive the save round trip. The debounce captures the
   * source as it is now, awaits the write, and then has to decide whether the
   * editor is still clean -- and by then more keystrokes may have arrived.
   * Clearing a boolean at that point marks work saved that was never sent, and
   * the header says "Saved 3:42 PM" with no unsaved marker over content that
   * exists only in the textarea. Stamping `savedRevision` with the revision
   * that was actually written leaves the editor dirty for anything typed since.
   *
   * The same two counters are what let an edit that changes no other state
   * re-arm the debounce, which a boolean could not do once it was already true.
   */
  const [revision, setRevision] = useState(0)
  const [savedRevision, setSavedRevision] = useState(0)
  const isDirty = revision !== savedRevision
  const markDirty = () => setRevision((current) => current + 1)
  const [lastSavedAt, setLastSavedAt] = useState(draft.updated_at)
  const [cdnAvailable, setCdnAvailable] = useState(false)
  const cdnCheckRef = useRef(false)
  const autosaveTimerRef = useRef<number | null>(null)
  const snapshotTimerRef = useRef<number | null>(null)

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

        const resp = await fetch('https://cdn.jsdelivr.net/npm/latex.js@0.12.4/dist/latex.min.js', {
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (resp.ok && mounted) {
          setCdnAvailable(true)
        }
      } catch {
        if (mounted && attemptCount < maxAttempts) {
          attemptCount++
          setTimeout(checkCdn, 1000) // Retry after 1 second
        }
      }
    }

    void checkCdn()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    setTitle(draft.title)
    setLatexSource(normalizeLatexSource(draft.content))
    setLastSavedAt(draft.updated_at)
    setRevision(0)
    setSavedRevision(0)
  }, [draft.id])

  const previewHtml = useMemo(
    () => buildLatexPreviewHtml(latexSource, cdnAvailable),
    [latexSource, cdnAvailable]
  )

  /** Resolves to whether the write landed, matching the Word editor. */
  const saveDraft = async (notify = false): Promise<boolean> => {
    // Captured before the await: this is the revision the write carries.
    const writing = revision
    setIsSaving(true)
    try {
      const updated = await onPersistDraft(draft.id, title.trim() || 'Untitled CV', 'latex', {
        type: 'latex',
        source: latexSource,
      })
      setLastSavedAt(updated.updated_at)
      // Never rewind: an older overlapping save landing second must not
      // un-save what the newer one already wrote.
      setSavedRevision((current) => Math.max(current, writing))
      if (notify) success('Draft saved', 'Your LaTeX draft is saved to Supabase.')
      return true
    } catch (err) {
      showError('Save failed', err instanceof Error ? err.message : 'Unable to save draft')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const createSnapshotForAutosave = async () => {
    if (!user) return
    try {
      await createSnapshot(draft.id, user.id, { type: 'latex', source: latexSource })
    } catch (err) {
      // Silently fail for snapshots - don't interrupt user workflow
      console.error('Snapshot failed:', err)
    }
  }

  useEffect(() => {
    if (!isDirty) return
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(() => {
      void saveDraft(false)
    }, 1200)
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [revision, isDirty])

  /**
   * Keyed on `revision` alone -- see the Word editor's note. `isDirty` in here
   * meant the 1200ms save cancelled the 5000ms snapshot every time, so version
   * history was never written at all.
   */
  useEffect(() => {
    if (revision === 0) return
    if (snapshotTimerRef.current) window.clearTimeout(snapshotTimerRef.current)
    snapshotTimerRef.current = window.setTimeout(() => {
      void createSnapshotForAutosave()
    }, 5000)
    return () => {
      if (snapshotTimerRef.current) window.clearTimeout(snapshotTimerRef.current)
    }
  }, [revision])

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
    markDirty()
    info('Template reset', 'The editor has been reset to the starter template.')
  }

  const applyTemplate = (template: ResumeTemplate) => {
    if (template.mode !== 'latex' || (template.content as { type?: string }).type !== 'latex') {
      showError('Invalid template', 'Cannot apply Word template to LaTeX editor')
      return
    }
    setLatexSource((template.content as { source: string }).source)
    markDirty()
    success('Template applied', `"${template.name}" template has been applied.`)
  }

  const restoreSnapshot = async (content: unknown) => {
    if (content && typeof content === 'object' && (content as { type?: string }).type === 'latex') {
      setLatexSource((content as { source: string }).source)
      markDirty()
      await saveDraft(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="LaTeX CV"
        action={
          <Link href={backHref} className={buttonVariants({ variant: 'ghost', size: 's' })}>
            Back
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4">
        {user && (
          <ResumeVersionHistory resumeId={draft.id} userId={user.id} onRestore={restoreSnapshot} />
        )}
        <TemplatePresetSelector mode="latex" onSelect={applyTemplate} />
        <Button variant="secondary" size="s" onClick={resetTemplate}>
          <RotateCcwIcon size={14} aria-hidden />
          Reset
        </Button>
        <Button variant="secondary" size="s" onClick={() => void saveDraft(true)} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button variant="secondary" size="s" onClick={copyLatex}>
          Copy LaTeX
        </Button>
        <Button
          variant="ghost"
          size="s"
          aria-label={`Delete ${draft.title}`}
          onClick={() => onDelete(draft.id)}
        >
          <TrashIcon size={14} aria-hidden />
          Delete
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
            placeholder="Untitled CV"
            className="mt-1"
          />
        </label>
        <p className="text-body-s text-text-muted md:text-right">
          {formatSaveTime(lastSavedAt)}
          {isDirty ? <span className="ml-2 text-amber-600">Unsaved changes</span> : null}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
          <div className="flex items-center justify-between">
            <p className="text-heading-s text-text-primary">LaTeX source</p>
            <span className="tabular text-body-s text-text-muted">{latexSource.length} chars</span>
          </div>
          <textarea
            value={latexSource}
            onChange={(e) => {
              setLatexSource(e.target.value)
              markDirty()
            }}
            className="h-[540px] w-full resize-y rounded-md border border-border-default bg-bg-canvas px-3 py-2 font-mono text-body-s text-text-primary focus-visible:border-accent-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default/30"
            spellCheck={false}
            aria-label="LaTeX source"
          />
        </div>
        <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
          <div className="flex items-center justify-between">
            <p className="text-heading-s text-text-primary">Preview</p>
            <span className="text-body-s text-text-muted">
              {cdnAvailable ? 'Live rendering' : 'Readable preview'}
            </span>
          </div>
          {/* The preview is a rendered page, not app chrome, so it keeps its own
              white sheet in both themes -- that is what the CV will look like. */}
          <iframe
            title="LaTeX preview"
            srcDoc={previewHtml}
            className="h-[540px] w-full rounded-md border border-border-default bg-white"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  )
}
