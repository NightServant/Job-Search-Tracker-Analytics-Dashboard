'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcwIcon, TrashIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import type { Job } from '@/types'
import { DocumentWorkspace } from './DocumentWorkspace'
import { useLatexCompile } from './useLatexCompile'
import { CssSpinner } from '@/components/ui/css-spinner'
import { useCvTailoring, TailoringTargetRail, TailoringAnalysisRail } from './CvTailoring'
import { ResumeVersionHistory } from './ResumeVersionHistory'
import {
  DEFAULT_LATEX_SOURCE,
  buildLatexPreviewHtml,
  formatSaveTime,
  normalizeLatexSource,
} from './content'
import { maybeCreateSnapshot } from '@/services/resumeSnapshotService'
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
  /**
   * The user's applications, for the tailoring rail's picker. A PROP, not a
   * `useJobs()` call: the route owns every read in this app, which is what
   * keeps the editors renderable in a test with no QueryClient.
   */
  jobs?: Job[]

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
  jobs = [],
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

  /**
   * `latexSourceRef` mirrors `latexSource` for the same reason, and closes a
   * second defect of the same shape: `restoreSnapshot` set the source and then
   * saved in the same tick, so the write carried the source the restore had
   * just replaced. The restored version reached the database only because the
   * stale revision stamp left the editor dirty and the debounce re-sent it.
   * Fixing one without the other would have made the restore silently discard
   * the version being restored.
   */
  const latexSourceRef = useRef(latexSource)
  const setSource = (next: string) => {
    latexSourceRef.current = next
    setLatexSource(next)
    markDirty()
  }
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
          // The scheduling check above only guards the moment the retry is
          // queued -- the callback itself ran unconditionally 1000ms later
          // even after unmount, calling whatever `fetch` happened to be
          // global at that later point. In production that is a wasted
          // request; in tests it is a leaked call that lands against a
          // different test's fetch mock and fails an unrelated assertion.
          setTimeout(() => {
            if (mounted) void checkCdn()
          }, 1000)
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
    latexSourceRef.current = normalizeLatexSource(draft.content)
    setLatexSource(latexSourceRef.current)
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
  }, [draft.id])

  const previewHtml = useMemo(
    () => buildLatexPreviewHtml(latexSource, cdnAvailable),
    [latexSource, cdnAvailable]
  )

  /** Resolves to whether the write landed, matching the Word editor. */
  const saveDraft = async (notify = false): Promise<boolean> => {
    // Both read from refs, not state: a caller that changed the source and
    // marked the editor dirty in this same tick has not re-rendered yet.
    const writing = revisionRef.current
    const source = latexSourceRef.current
    setIsSaving(true)
    try {
      const updated = await onPersistDraft(draft.id, title.trim() || 'Untitled CV', 'latex', {
        type: 'latex',
        source,
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

  /**
   * Routes every snapshot write through the cadence policy in
   * `resumeSnapshotService`: never write one identical to the latest, and
   * never write an autosave-triggered one more than once per five minutes.
   * `{ force: true }` -- passed only from the explicit Save handler below --
   * bypasses the floor but not the delta guard.
   */
  const writeSnapshot = async (options: { force?: boolean } = {}) => {
    if (!user) return
    try {
      await maybeCreateSnapshot(
        supabase,
        draft.id,
        user.id,
        { type: 'latex', source: latexSourceRef.current },
        options
      )
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
      void writeSnapshot()
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
    setSource(DEFAULT_LATEX_SOURCE)
    info('Template reset', 'The editor has been reset to the starter template.')
  }

  // applyTemplate and its dropdown are gone -- templates are chosen on
  // /documents now, before the document exists. See WordResumeEditor for why.

  // The tailoring rails read the LaTeX SOURCE as their CV text. That is the
  // honest input: it is what the author is editing and what compiles, and the
  // scorer counts words rather than parsing TeX -- a control sequence is not a
  // keyword either way.
  const tailoring = useCvTailoring({ cvText: latexSource, jobs })

  // Real compilation through FormaTeX, replacing the JS "readable preview"
  // that had been standing in for a renderer. The fallback stays: it is what
  // an unconfigured deployment, a failed build and a not-yet-compiled document
  // all show, and it is better than an empty pane in all three cases.
  const { state: compileState, compile } = useLatexCompile({ source: latexSource })

  const compileNow = () => void compile(latexSource)

  const restoreSnapshot = async (content: unknown) => {
    if (content && typeof content === 'object' && (content as { type?: string }).type === 'latex') {
      setSource((content as { source: string }).source)
      await saveDraft(false)
    }
  }

  return (
    <DocumentWorkspace
      kindLabel="latex"
      documentsHref={backHref}
      title={title}
      onTitleChange={(next) => {
        setTitle(next)
        markDirty()
      }}
      savedLabel={formatSaveTime(lastSavedAt)}
      dirty={isDirty}
      actions={
        <>
          {user && (
            <ResumeVersionHistory resumeId={draft.id} userId={user.id} onRestore={restoreSnapshot} />
          )}
          <Button variant="ghost" size="s" onClick={resetTemplate}>
            <RotateCcwIcon size={14} aria-hidden className={iconMotion('back')} />
            reset
          </Button>
          <Button variant="ghost" size="s" onClick={copyLatex}>
            copy LaTeX
          </Button>
          <Button
            variant="secondary"
            size="s"
            onClick={compileNow}
            disabled={compileState.status === 'compiling' || !latexSource.trim()}
          >
            {compileState.status === 'compiling' && <CssSpinner size={14} />}
            {compileState.status === 'compiling' ? 'compiling' : 'compile'}
          </Button>
          {/* Save is primary here for the same reason it is in the Word
              editor: in an editor the verb is Save, and it was previously the
              only plain-text control in a row of outlined ones. */}
          <Button size="s" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? 'saving' : 'save'}
          </Button>
        </>
      }
      destructiveActions={
        <Button
          variant="ghost"
          size="s"
          aria-label={`Delete ${draft.title}`}
          onClick={() => onDelete(draft.id)}
        >
          <TrashIcon size={14} aria-hidden className={iconMotion('lid')} />
          delete
        </Button>
      }
      leftRail={
        <div className="flex flex-col gap-8">
          {/*
            ONE RAIL, BOTH PANELS, STACKED (Gabe, 2026-09-05).

            The analysis used to sit opposite the document, which is right for
            the Word editor -- the page is a single block and the score belongs
            beside it. The LaTeX editor is already two panes, so a rail on each
            side left the source and the preview about 470px apart in the
            middle: narrower than the preamble lines the source has to show,
            and too narrow to judge a rendered page.

            Collapsed into the left rail they read in the order they are used
            anyway -- pick the target, then see how the document scores against
            it -- and the 320px that was on the right goes to the editor and
            the preview, which are what this screen is for.
          */}
          <TailoringTargetRail state={tailoring} jobs={jobs} />
          <TailoringAnalysisRail state={tailoring} />
        </div>
      }
    >
      {/*
        SOURCE ABOVE PREVIEW, not beside it. Side by side was right when this
        editor owned the full width; with a tailoring rail either side the
        middle column is ~980px, and splitting that again gives a monospace
        LaTeX pane about 470px wide -- narrower than most of the preamble
        lines it has to show, so every one of them wraps. Stacked, each gets
        the whole column, and the order reads as the job does: edit, then look.
      */}
      {/*
        SIDE BY SIDE FROM `lg`, on Gabe's instruction (2026-09-05). It is a
        comparison view: the point is reading the source against what it
        produced, and stacking them puts a scroll between the line you are
        editing and the paragraph it renders.

        Below `lg` they stack -- two 400px columns are worse than one 800px
        one for both a code pane and a page proof. `items-start` so the two
        panes keep their own heights instead of the shorter one stretching.
      */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-heading-s text-text-primary">LaTeX source</p>
            <span className="tabular text-body-s text-text-muted">{latexSource.length} chars</span>
          </div>
          <textarea
            value={latexSource}
            onChange={(e) => {
              setSource(e.target.value)
            }}
            className="h-[620px] w-full resize-y rounded-md border border-border-default bg-bg-canvas px-3 py-2 font-mono text-body-s text-text-primary focus-visible:border-accent-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-default/30"
            spellCheck={false}
            aria-label="LaTeX source"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-heading-s text-text-primary">preview</p>
            {/*
              THREE DISTINCT STATES, named. A compiled PDF is what the CV will
              actually look like; the readable preview is an approximation; a
              failed build is neither. Collapsing them into one label is how
              somebody sends out a CV they never really saw.
            */}
            <span className="text-body-s text-text-muted">
              {compileState.status === 'ok'
                ? 'compiled PDF'
                : compileState.status === 'compiling'
                  ? 'compiling'
                  : cdnAvailable
                    ? 'readable preview — not compiled'
                    : 'readable preview'}
            </span>
          </div>

          {/* A rendered page, not app chrome, so it keeps its own white sheet
              in both themes -- that is what the CV will look like. */}
          {compileState.status === 'ok' ? (
            // `#toolbar=0&navpanes=0&scrollbar=0` strips the browser's own PDF
            // chrome -- the download, print, rotate and page controls Gabe
            // asked to remove. They are the WRONG controls here: this is a
            // proof of the document being edited, and the app already owns
            // export. A second download button that saves an intermediate
            // build is a way to send out the wrong file.
            <iframe
              title="Compiled CV"
              src={`${compileState.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              className="h-[620px] w-full rounded-md border border-border-default bg-white"
            />
          ) : (
            <iframe
              title="LaTeX preview"
              srcDoc={previewHtml}
              className="h-[620px] w-full rounded-md border border-border-default bg-white"
              sandbox="allow-scripts allow-same-origin"
            />
          )}

          {compileState.status === 'error' && (
            <p
              role="alert"
              className={
                compileState.unconfigured
                  ? 'text-body-s text-text-muted'
                  : 'whitespace-pre-wrap font-mono text-body-s text-status-rejected-mark'
              }
            >
              {compileState.message}
            </p>
          )}
        </div>
      </div>
    </DocumentWorkspace>
  )
}
