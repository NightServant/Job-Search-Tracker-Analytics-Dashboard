'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { WORD_EDITOR_EXTENSIONS } from './editorExtensions'
import type { JSONContent } from '@tiptap/core'
import { Button } from '@/components/ui/button'
import { CheckIcon, DownloadIcon, RotateCcwIcon, TrashIcon } from '@/components/icons'
import { CssSpinner } from '@/components/ui/css-spinner'
import { iconMotion } from '@/components/icons/motion'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import { authedFetch } from '@/lib/authedFetch'
import type { Job } from '@/types'
import { DocumentWorkspace } from './DocumentWorkspace'
import { useCvTailoring } from './CvTailoring'
import { DocumentRailTabs } from './DocumentRail'
import { DocumentNavigator } from './DocumentNavigator'
import { DocumentToolbar } from './DocumentToolbar'
import { DocumentRailPane } from './DocumentRailPane'
import { asDocumentTab, DEFAULT_DOCUMENT_TAB, type DocumentTabId } from './documentTabs'
import { useProofread } from './useProofread'
import { useThesaurus } from './useThesaurus'
import { useFitToWidth } from './useFitToWidth'
import { normalizeGeometry, normalizeTypography } from '@/lib/pageGeometry'
import { Pagination } from './pagination'
import { useResumeExport } from './useResumeExport'
import { useBelowDesktop } from '@/hooks/useBelowDesktop'
import { ResumeVersionHistory } from './ResumeVersionHistory'
import { DEFAULT_WORD_CONTENT, formatSaveTime, normalizeWordContent } from './content'
import { maybeCreateSnapshot } from '@/services/resumeSnapshotService'
import type { ResumeContent, ResumeDraft, ResumeMode } from '@/services/resumeService'

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
  /**
   * The user's applications, for the tailoring rail's picker.
   *
   * A PROP, NOT A `useJobs()` CALL IN HERE. The route owns every read in this
   * app -- it is what lets the screens be rendered in a test with plain props
   * and no QueryClient -- and reaching for the hook here broke exactly that,
   * in eight tests, the moment it was added. Defaulted so a caller that has
   * no jobs list still renders.
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

/**
 * The gap Word leaves between two pages in Print Layout.
 *
 * A quarter inch reads as a seam between sheets without spending a visible
 * fraction of the scroll on nothing, which a full inch does on a three-page CV.
 */
const PAGE_GAP_IN = 0.25

export function WordResumeEditor({
  draft,
  backHref,
  onDelete,
  onPersistDraft,
  jobs = [],
}: WordResumeEditorProps) {
  const { user } = useAuth()
  // Which applications this CV was submitted to. Read here rather than passed
  // down because the editor already owns every other read keyed on draft.id.
  const { success, error: showError, info } = useToast()
  const [title, setTitle] = useState(draft.title)
  const [isSaving, setIsSaving] = useState(false)
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

  const docAttrs = (
    normalizeWordContent(draft.content) as {
      attrs?: { pageGeometry?: unknown; documentTypography?: unknown }
    }
  ).attrs
  const geometry = normalizeGeometry(docAttrs?.pageGeometry)
  // The face, size and spacing the document was set in. Null members mean
  // "the editor's own styles", which is what a CV typed here gets.
  const type = normalizeTypography(docAttrs?.documentTypography)

  /**
   * The extension list lives in `editorExtensions` so the ribbon's tests build
   * the same editor this does -- see that file for why.
   *
   * THE DOCBLOCK SITS OUT HERE, NOT INSIDE THE OPTIONS, because
   * `tiptapSsr.test.ts` scans a fixed window after `useEditor(` for
   * `immediatelyRender: false` -- and it caught this exact mistake when the
   * comment was inline and pushed the flag out of range. Keep the options
   * compact.
   */
  const editor = useEditor({
    extensions: [
      ...WORD_EDITOR_EXTENSIONS,
      // PAGE HEIGHT IN CSS PIXELS: the page less both margins, at 96dpi,
      // which is what `1in` resolves to in CSS.
      Pagination.configure({
        pageHeight:
          (geometry.height - geometry.margin.top - geometry.margin.bottom) * 96,
        gap: PAGE_GAP_IN * 96,
      }),
    ],
    content: normalizeWordContent(draft.content),
    editorProps: {
      // No `text-[15px] leading-7` here any more: an imported document sets
      // its own size and leading on the wrapper, and a class on the editable
      // element would win over it.
      attributes: { class: 'focus:outline-none min-h-[10in] text-zinc-900' },
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

  // THE TAILORING RAILS' STATE (Gabe, 2026-09-04). The CV goes to them as
  // plain text: the scorer counts words and the model rewrites sentences, and
  // neither has any use for TipTap's node tree. `editor?.getText()` is read on
  // every render rather than memoised, because it has to follow the document
  // as it is typed -- a score computed against a stale copy is worse than no
  // score, since it looks current.
  // PDF and .docx. `saveDraft` is passed in rather than reached for: see
  // useResumeExport on why that dependency belongs in the signature.
  const exportState = useResumeExport({ editor, title, saveDraft, authedFetch })

  const tailoring = useCvTailoring({ cvText: editor?.getText() ?? '', jobs })
  const proofread = useProofread(editor)
  // Follows the caret; see useThesaurus for why it is not behind a button.
  const thesaurus = useThesaurus(editor)
  // Word's zoom-to-fit: the page scales to the well instead of scrolling
  // sideways. See useFitToWidth for why this replaced nudging breakpoints.
  // THE PAGE THIS DOCUMENT WAS WRITTEN FOR. Imported .docx files carry their
  // own size and margins on the doc node; anything else gets Word's default.
  // Hard-coding 0.8in here is what made an imported ATS CV reflow -- see
  // lib/pageGeometry.
  const fit = useFitToWidth(geometry.width * 96)

  /**
   * WHICH RAIL TAB IS OPEN, remembered per browser.
   *
   * Somebody proofreading a CV does it over several sittings, and reopening on
   * Grammar every time would make the tab they actually use a click they pay
   * for repeatedly. `asDocumentTab` coerces anything stored, so a renamed or
   * removed tab cannot leave the rail permanently blank.
   */
  const [tab, setTab] = useState<DocumentTabId>(DEFAULT_DOCUMENT_TAB)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('worktrack:document-tab')
      if (stored) setTab(asDocumentTab(stored))
    } catch {
      // Private windows and blocked site data throw on access. The default
      // tab is a fine answer; losing the preference is not worth an error.
    }
  }, [])

  const selectTab = useCallback((next: DocumentTabId) => {
    setTab(next)
    try {
      window.localStorage.setItem('worktrack:document-tab', next)
    } catch {
      // As above: a remembered tab is a convenience, never a requirement.
    }
  }, [])
  const compact = useBelowDesktop()

  const restoreSnapshot = async (content: unknown) => {
    if (content && typeof content === 'object' && (content as { type?: string }).type === 'doc') {
      editor?.commands.setContent(content as JSONContent)
      markDirty()
      await saveDraft(false)
    }
  }

  return (
    <DocumentWorkspace
      kindLabel="word"
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
          {/* VERSION HISTORY IS DESKTOP-ONLY (Gabe, 2026-09-06). It is the one
              control here that is not a button but a dropdown of snapshots,
              and in the compact action sheet it read as a form field dropped
              into a menu -- and it opens a list of dated entries that wants
              more room than a sheet over a document has. Removed rather than
              hidden: a `display:none` dropdown still mounts, still fetches its
              snapshots, and is still in the tab order. The list remains
              reachable from the documents screen, which is where a phone user
              looks for it. */}
          {user && !compact && (
            <ResumeVersionHistory resumeId={draft.id} userId={user.id} onRestore={restoreSnapshot} />
          )}
          {/* THE "sent to N applications" DROPDOWN WAS HERE, and it is gone
              (Gabe, Worktrack Revisions item 6). It listed every application
              this CV had been pinned to, which on an account that pins one CV
              to everything is a dropdown of every job in the tracker sitting
              in the editor's toolbar -- "it displays all the job positions".
              The same relationship is still readable from the other end, on
              the application record's `cv submitted` field, which is where a
              person asks the question that way round.

              Removed rather than hidden: a `display:none` dropdown still
              mounts, still fetches, and is still in the tab order. */}
          <Button variant="ghost" size="s" onClick={resetTemplate} disabled={!editor}>
            <RotateCcwIcon size={14} aria-hidden className={iconMotion('back')} />
            reset
          </Button>
          <Button variant="ghost" size="s" onClick={exportState.exportDocx} disabled={!editor || exportState.isExportingDocx}>
            <DownloadIcon size={14} aria-hidden className={iconMotion('drop')} />
            {exportState.isExportingDocx ? 'exporting' : 'export .docx'}
          </Button>
          <Button variant="secondary" size="s" onClick={exportState.exportPdf} disabled={!editor || exportState.isExportingPdf}>
            <DownloadIcon size={14} aria-hidden className={iconMotion('drop')} />
            {exportState.isExportingPdf ? 'exporting' : 'export PDF'}
          </Button>
          {/*
            SAVE IS PRIMARY, and Export is not. Before this, Export PDF was the
            only filled control on the screen while Save was plain text --
            which told the eye that leaving with a file mattered more than
            keeping the work. In an editor the verb is Save.
          */}
          <Button size="s" onClick={() => void handleSave()} disabled={!editor || isSaving}>
            {isSaving ? <CssSpinner size={14} /> : <CheckIcon size={14} aria-hidden />}
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
      tools={<DocumentToolbar editor={editor} />}
      leftRail={
        <div className="flex flex-col gap-6">
        <DocumentRailTabs
          active={tab}
          onSelect={selectTab}
          applicationSelected={!!tailoring.jobId}
          badges={{
            // Grammar and style together: the tab covers both, so a count
            // that only named half of it would understate the work left.
            grammar: proofread.ran
              ? proofread.grammar.length + proofread.style.length
              : null,
          }}
        />
        {/* WORD'S NAVIGATION PANE AND WORD COUNT, under the tabs. The rail
            was two buttons and a column of nothing; these are the two things
            Word puts there, and both read straight off the editor. */}
        <DocumentNavigator editor={editor} />
        </div>
      }
      rightRail={
        <DocumentRailPane
          active={tab}
          jobs={jobs}
          proofread={proofread}
          thesaurus={thesaurus}
          tailoring={tailoring}
        />
      }
      footnote="letter-style layout preview with 0.8in margins for a print-ready CV."
    >
      <div ref={fit.ref} className="w-full">
      {/*
        `zoom`, NOT `transform: scale()`, and the difference is layout.
        A transform is painted only: a page drawn at 0.7 still occupies its
        full 11in in the flow, so the well ends in a third of a page of nothing
        and the scrollbar promises more document than exists. Correcting that
        by hand means measuring the sheet and multiplying its height, which is
        a second source of truth for a number the browser already knows.

        `zoom` participates in layout -- measured here: a 1000px child at 0.7
        gives a 700px wrapper, where the transform leaves it at 1000 -- so the
        flow, the scroll height and the caret all agree with what is drawn,
        with no correction and no wrapper. Supported in every current browser
        (`CSS.supports('zoom', '0.7')` verified true in the app).
      */}
      <div
        className="mx-auto bg-white"
        style={{
          zoom: fit.scale,
          width: `${geometry.width}in`,
          minHeight: `${geometry.height}in`,
          // NO PAINTED PAGE EDGE HERE ANY MORE. Two versions of it were
          // drawn as a background -- a hairline, then a band of the well's
          // colour -- and both sat BEHIND the text, so a break falling
          // mid-paragraph struck a stripe through a line of it. Nothing about
          // a background can avoid that; the content flows over it regardless.
          // `Pagination` pushes the content past the edge instead, which is
          // what Word does. See components/cv/pagination.
        }}
      >
        <EditorContent
          editor={editor}
          style={{
            padding: `${geometry.margin.top}in ${geometry.margin.right}in ${geometry.margin.bottom}in ${geometry.margin.left}in`,
            // THE TYPING AREA DERIVES FROM THE PAGE, rather than the 9.4in
            // that was hard-coded for Letter at 0.8in margins. On A4 that
            // number is wrong by a third of an inch and on Legal by three,
            // so the editable region either fell short of the page or ran
            // past it -- both of which look like the sheet is the wrong size.
            '--page-margin-left': `${geometry.margin.left}in`,
            '--page-margin-right': `${geometry.margin.right}in`,
            '--page-body-height': `${Math.max(
              1,
              geometry.height - geometry.margin.top - geometry.margin.bottom
            )}in`,
            // THE DOCUMENT'S OWN TYPE, where it had any. mammoth converts a
            // .docx to semantic HTML and drops every run property, so without
            // this an imported CV renders in the editor's stylesheet rather
            // than the face its author chose -- Garamond 11pt arriving as
            // sans-serif 15px on the file that reported this.
            ...(type.fontFamily ? { fontFamily: type.fontFamily } : {}),
            ...(type.fontSize ? { fontSize: `${type.fontSize}pt` } : {}),
            ...(type.lineHeight ? { lineHeight: type.lineHeight } : {}),
            ...(type.paragraphSpacing !== null
              ? { '--doc-para-space': `${type.paragraphSpacing}pt` }
              : {}),
          } as React.CSSProperties}
          className=" [&_.ProseMirror]:min-h-[var(--page-body-height)] [&_.ProseMirror]:outline-none [&_.ProseMirror]:ring-0 [&_.ProseMirror]:shadow-none [&_.ProseMirror]:border-0 [&_.ProseMirror:focus]:outline-none [&_.ProseMirror:focus-visible]:outline-none [&_.ProseMirror:focus]:ring-0 [&_.ProseMirror:focus-visible]:ring-0 [&_.ProseMirror_*:focus]:outline-none [&_.ProseMirror_*:focus-visible]:outline-none [&_.ProseMirror_a]:outline-none [&_.ProseMirror_a:focus]:outline-none [&_.ProseMirror_h1]:mt-0 [&_.ProseMirror_h1]:mb-3 [&_.ProseMirror_h1]:text-[2rem] [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:text-[1.15rem] [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_p]:[margin-block:0_var(--doc-para-space,0.5rem)] [&_.ProseMirror_ul]:my-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_li]:my-1"
        />
      </div>
      </div>
    </DocumentWorkspace>
  )
}
