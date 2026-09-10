'use client'

import * as React from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CloseIcon, PlusIcon, UploadIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
import { ApplicationsToolbar } from './ApplicationsToolbar'
import { ApplicationsInsights } from './ApplicationsInsights'
import { ApplicationsTable } from './ApplicationsTable'
import { Card, CardContent } from '@/components/ui/card'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { StatusTabs, STATUS_TABS, type StatusTabValue } from './StatusTabs'
import { ApplicationRecordDialog } from './record/ApplicationRecordDialog'
import { AddApplicationDialog } from './record/AddApplicationDialog'
import type { ApplicationRecordData } from './record/recordData'
import type { PostingDigestResult } from './record/digest'
import { sortJobs, type JobSort } from '@/lib/jobSort'
import { buildJobDedupKey, buildJobsCsvText, parseJobsCsvText, type ParsedJobRow } from '@/lib/jobCsv'
import { resolveDefaultCurrency, type SupportedCurrency } from '@/services/userPreferences'
import type { Job, JobAutofillResult, JobFormData } from '@/types'

interface CsvImport {
  fileName: string
  rows: ParsedJobRow[]
  importable: ParsedJobRow[]
  duplicates: number
  invalid: number
}

/**
 * Which application the record dialog is showing.
 *
 * AN ID, NOT THE ROW. It used to hold the whole `Job`, which made the dialog a
 * SNAPSHOT taken when it opened: saving an edit invalidated the query, fresh
 * rows arrived through `jobs` a moment later, and the dialog carried on
 * showing the copy it had. Gabe saw it as "saved the application, new data is
 * not rendering immediately" (2026-09-06) -- the save had worked, the view had
 * not moved.
 *
 * Holding only the id means the row is derived on every render, so any change
 * to `jobs` -- a save here, a refetch, an edit in another tab -- reaches the
 * open dialog without anyone having to remember to push it there.
 *
 * NO `mode`. The record shows and edits the same surface now, so there is
 * nothing to switch between; and a NEW application never appears here at all
 * -- it goes through `AddApplicationDialog`, which is its own four-step flow.
 */
type RecordState = { id: string } | null

/**
 * M5 Task 4's removed pagination was 20 a page. Ten instead: at twenty, an
 * account with a dozen applications never sees pagination at all and cannot
 * tell whether it exists -- which is exactly how it read on review.
 */
const PAGE_SIZE = 10

function downloadCsv(fileName: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(href)
}

/**
 * The Applications screen's body, separated from `src/app/(app)/applications/page.tsx`
 * the same way `Dashboard` is, so it can be rendered with plain props instead
 * of through Next routing and react-query. Every mutation arrives as a
 * callback; the route owns the hooks.
 *
 * One list, narrowed by the status tabs. There is no board.
 *
 * The kanban was removed on Gabe's instruction (M5.5 Item 3, 2026-08-29).
 * His original complaint was that it "would not be able to display all
 * applications properly based on sorting", and after two narrower readings
 * from me he was explicit: *"I said remove the sorting itself, not redesign
 * it!"* The board's grouping into five status columns IS that sorting, so
 * the whole board goes rather than its styling. The tabs are its
 * replacement, not an addition beside it.
 *
 * - `all` -> every application, ungrouped.
 * - any single status -> the same list, filtered to that status.
 *
 * No columns at any width, which retires the old "no kanban below 768px"
 * constraint as moot: desktop and mobile are now the same surface, and the
 * only thing that changes with width is how much of a row fits. Search
 * narrows the list at every width, same as before.
 *
 * The status tabs themselves are also a deliberate departure from the design
 * rather than a restoration of it -- desktop Figma frame `31:174` has no
 * tabs at all. Gabe asked for them explicitly.
 *
 * WHAT THIS COST, recorded rather than discovered later: dragging a card
 * between columns was the only way to change a status without opening the
 * edit dialog, and it died with the board. Status is still fully editable
 * through the dialog, so this is a lost convenience, not a lost capability
 * -- but if a per-row status control is wanted back, that is a new task with
 * a frame behind it, not something to reintroduce as a side effect.
 */
export interface ApplicationsPageProps {
  jobs: Job[]
  defaultCurrency?: SupportedCurrency
  /**
   * `resumeId` is the CV recorded as submitted: an id to pin, `null` to unpin,
   * `undefined` to leave whatever link exists alone.
   *
   * It rides alongside `JobFormData` rather than inside it because the link
   * lives in `application_documents`, keyed on a job id that does not exist
   * yet when creating -- so only the caller, which has the insert's result,
   * can sequence the write.
   *
   * `interviewAt` rides along for exactly the same reason and with the same
   * three states: an interview is a row in `events`, keyed on a job id, and
   * `undefined` means the field was never touched. See
   * `ApplicationRecordView`'s `onSubmit` for why untouched must not mean
   * "clear it".
   */
  onCreate?: (
    data: JobFormData,
    resumeId?: string | null,
    interviewAt?: string | null
  ) => Promise<boolean>
  onUpdate?: (
    id: string,
    data: JobFormData,
    resumeId?: string | null,
    interviewAt?: string | null
  ) => Promise<boolean>
  /**
   * Tidies and summarises a fetched posting, inside the add wizard.
   *
   * NOT ON THE RECORD any more: the `tidy and summarise` button is gone (Gabe,
   * 2026-09-10, "the model auto-summarizes the job description"), so the only
   * caller is `AddApplicationDialog`'s read step -- which is what does the
   * auto-summarising that sentence refers to.
   */
  onDigest?: (text: string) => Promise<PostingDigestResult>
  /** The CVs available to the "CV submitted" field. */
  resumes?: { id: string; title: string }[]
  /** The CV already linked to whichever row is open, if any. */
  linkedResumeId?: string | null
  onDelete?: (job: Job) => void
  onImport?: (rows: JobFormData[]) => Promise<boolean>
  onAutofill?: (url: string) => Promise<JobAutofillResult>
  onCsvError?: (message: string) => void
  saving?: boolean
  importing?: boolean
  autofilling?: boolean
  /**
   * The four secondary reads for whichever row is currently open.
   *
   * This screen does not fetch them. It reports which row opened through
   * `onOpenJobChange`, the route runs `useApplicationRecord` against that id,
   * and the result comes back down here -- which keeps this component a pure
   * function of its props, renderable in a test with no QueryClient, the same
   * split the file has always had.
   */
  record?: ApplicationRecordData
  onOpenJobChange?: (job: Job | null) => void
  /**
   * Opens this application on mount. Set from `?application=<id>` when a
   * desktop visitor lands on a `/applications/<id>` link -- that route is the
   * mobile surface now, so on a wide screen it redirects here and this is how
   * the intent survives the redirect.
   */
  initialOpenId?: string | null
}

export function ApplicationsPage({
  jobs,
  defaultCurrency = resolveDefaultCurrency(null),
  onCreate,
  onUpdate,
  onDigest,
  resumes = [],
  linkedResumeId = null,
  onDelete,
  onImport,
  onAutofill,
  onCsvError,
  saving = false,
  importing = false,
  autofilling = false,
  record,
  onOpenJobChange,
  initialOpenId = null,
}: ApplicationsPageProps) {
  // THE FIXED FRAME IS GONE, and it went because of what now sits above the
  // toolbar (Gabe, 2026-09-10: a chart and four statistics cards).
  //
  // `useViewportFit` locked the shell to the viewport so the title, tabs,
  // toolbar and pagination held their place and only the table moved. Its own
  // docblock states the premise: "/applications is a fixed frame around one
  // scrolling list". The insights band is 280px of content that is not frame
  // and not list, and inside the lock it came straight out of the table --
  // measured on the demo at 1440x820, the table was left 156px, about three
  // rows of a ten-row page.
  //
  // Unlocked, `ui/table`'s own 55svh fallback cap takes over (see its
  // docblock: it exists for exactly the viewports the shell will not lock), so
  // the table still scrolls inside itself, its header still stays clear of the
  // top bar, and the page scrolls once for the band above it. 451px of table
  // at that same 1440x820 rather than 156.

  const [search, setSearch] = React.useState('')
  // DEFAULT `applied`, which is the revision's whole point: both tables
  // ordered by the date the application actually went out, newest first, not
  // by when the row happened to be typed into Worktrack.
  const [sort, setSort] = React.useState<JobSort>('applied')
  const [tab, setTab] = React.useState<StatusTabValue>('all')
  const [page, setPage] = React.useState(1)
  const [open, setOpen] = React.useState<RecordState>(null)
  const [addOpen, setAddOpen] = React.useState(false)
  const [formDirty, setFormDirty] = React.useState(false)
  // `undefined` means the field was never touched, which is different from
  // `null` (explicitly "no CV"). Only the second should unpin an existing link.
  const [resumeChoice, setResumeChoice] = React.useState<string | null | undefined>(undefined)
  const [discardOpen, setDiscardOpen] = React.useState(false)
  const [csv, setCsv] = React.useState<CsvImport | null>(null)
  const [skipDuplicates, setSkipDuplicates] = React.useState(true)
  const [parsingCsv, setParsingCsv] = React.useState(false)

  // DERIVED, never stored. See RecordState for what storing it cost.
  const openJob = open?.id ? (jobs.find((candidate) => candidate.id === open.id) ?? null) : null

  const openRecord = (job: Job) => {
    setOpen({ id: job.id })
    // Told, not derived. The route runs the record's reads against this id,
    // and it can only do that if it is informed the moment the selection
    // changes rather than by watching a prop it does not own.
    onOpenJobChange?.(job)
  }

  const dismiss = () => {
    setOpen(null)
    setFormDirty(false)
    // Abandoned along with the rest of the form. A choice made and then
    // dismissed must not be applied to the next record opened.
    setResumeChoice(undefined)
    onOpenJobChange?.(null)
  }

  // A dialog adds three ways to dismiss that the old inline section never had
  // -- Escape, an overlay click, the header's own close button -- and all
  // three report through this one handler (Base UI routes every one of them
  // through onOpenChange). A clean dialog closes immediately; one with unsaved
  // edits asks first, so none of the three can silently drop nineteen typed
  // fields the way an unconditional close after a rejected save used to.
  //
  // VIEWING IS NEVER DIRTY, so a record opened for reading always closes on
  // the first Escape. `formDirty` is only ever raised by the form, and the
  // form is only mounted in edit mode -- but it is also cleared on every
  // dismiss, because a stale true from a previous edit would otherwise make a
  // read-only record refuse to close.
  const closeRecord = () => {
    if (formDirty) {
      setDiscardOpen(true)
      return
    }
    dismiss()
  }

  // THE OPEN RECORD STOPPED EXISTING. Delete is reachable from inside the
  // dialog now, and the confirm sits on top of it -- so once the row is gone
  // from `jobs`, what is underneath is a record of something that no longer
  // exists, with an edit button that would save it back.
  //
  // Keyed on the LIST rather than wired into the delete callback, so it also
  // covers a row deleted in another tab and arriving through a refetch. When
  // it fires, `dismiss` sets `open` to null and the next run returns at the
  // first line, so there is no loop.
  React.useEffect(() => {
    const openId = open?.id
    if (!openId) return
    if (!jobs.some((candidate) => candidate.id === openId)) dismiss()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, open?.id])

  // `?application=<id>` from the desktop redirect off `/applications/<id>`.
  // Runs once per id: re-running it on every render of `jobs` would reopen
  // the dialog every time the list refetched, including right after the user
  // closed it.
  const openedInitial = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!initialOpenId || openedInitial.current === initialOpenId) return
    const job = jobs.find((candidate) => candidate.id === initialOpenId)
    if (!job) return
    openedInitial.current = initialOpenId
    setOpen({ id: job.id })
    onOpenJobChange?.(job)
    // `jobs` is the only other value read, and it is here so a deep link that
    // arrives before the list has loaded still opens once it has.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpenId, jobs])

  // ORDERED BY `date_applied`, NEWEST FIRST, by default -- and by company or
  // position when the toolbar asks. This used to sort on `created_at`, which
  // is when the ROW was added to Worktrack rather than when the application
  // went out; the column the table prints is `applied on`, so the two
  // disagreed on screen. See lib/jobSort for how a wishlist row with no
  // applied date is placed.
  const searched = React.useMemo(() => {
    const needle = search.trim().toLowerCase()
    const matched = needle
      ? jobs.filter(
          (job) =>
            job.company.toLowerCase().includes(needle) ||
            job.role.toLowerCase().includes(needle)
        )
      : jobs
    return sortJobs(matched, sort)
  }, [jobs, search, sort])

  const counts = React.useMemo(() => {
    const result = Object.fromEntries(
      STATUS_TABS.map((value) => [value, 0])
    ) as Record<StatusTabValue, number>
    result.all = searched.length
    for (const job of searched) result[job.status] += 1
    return result
  }, [searched])

  const listed = tab === 'all' ? searched : searched.filter((job) => job.status === tab)

  // Pagination. M5 Task 4 removed the original 20-per-page pagination along
  // with the advanced filters; Gabe asked for it back.
  const pageCount = Math.max(1, Math.ceil(listed.length / PAGE_SIZE))
  // Clamp rather than store a page that no longer exists: deleting the last
  // row of page 3, or narrowing the search, would otherwise leave the user on
  // an empty page with no way back except paging.
  const current = Math.min(page, pageCount)
  const paged = listed.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  // Search and tab both change the result set, so the page index they were
  // valid for is meaningless afterwards.
  React.useEffect(() => {
    setPage(1)
  }, [search, tab, sort])

  // A status tab at zero is a real, expected state (nobody has an offer on
  // day one), not a search yielding nothing -- so it gets its own sentence
  // rather than the generic "nothing matches these filters" the search box
  // produces, which would misname the cause.
  const emptyListMessage =
    tab === 'all' ? undefined : `no ${tab} applications${search.trim() ? ' match this search' : ' yet'}.`

  const handleCsvFile = async (file: File) => {
    setParsingCsv(true)
    try {
      const result = parseJobsCsvText(await file.text())
      if (result.fatalError) {
        onCsvError?.(result.fatalError)
        setCsv(null)
        return
      }

      const existing = new Set(
        jobs.map((job) =>
          buildJobDedupKey({
            company: job.company,
            role: job.role,
            date_applied: job.date_applied,
            url: job.url,
          })
        )
      )
      const seen = new Set<string>()
      const importable: ParsedJobRow[] = []
      let duplicates = 0

      for (const row of result.rows) {
        if (existing.has(row.dedupKey) || seen.has(row.dedupKey)) {
          duplicates += 1
          continue
        }
        seen.add(row.dedupKey)
        importable.push(row)
      }

      setSkipDuplicates(true)
      setCsv({
        fileName: file.name,
        rows: result.rows,
        importable,
        duplicates,
        invalid: result.issues.length,
      })
    } catch (err) {
      onCsvError?.(err instanceof Error ? err.message : 'Could not read that file.')
      setCsv(null)
    } finally {
      setParsingCsv(false)
    }
  }

  const runImport = async () => {
    if (!csv) return
    const rows = skipDuplicates ? csv.importable : csv.rows
    if (rows.length === 0) {
      setCsv(null)
      return
    }
    // onImport resolves to false on a caught failure rather than throwing, so
    // the parsed and deduped CSV state stays around for a retry instead of
    // being thrown away behind a toast.
    const ok = await onImport?.(rows.map((row) => row.data))
    if (ok !== false) setCsv(null)
  }

  /**
   * Saving an edit made in the record dialog.
   *
   * IT STAYS OPEN. The dialog is the whole record and its own editor, so
   * closing after a save would throw away the context the edit was made in --
   * and the row is derived from `jobs`, so the saved values appear as soon as
   * the refetch lands without anything here pushing them.
   */
  const submit = async (data: JobFormData, interviewAt?: string | null) => {
    const editingJob = openJob
    if (!editingJob) return
    // onUpdate resolves to false on a caught failure rather than throwing, so
    // a rejected save leaves the record open with every typed field intact
    // instead of discarding them behind a toast.
    const ok = await onUpdate?.(editingJob.id, data, resumeChoice, interviewAt)
    // Returned, not swallowed: the record moves its own baseline on a save
    // that landed, and must not on one that did not.
    if (ok === false) return false
    // Consumed. Leaving it set would re-apply the same link to the NEXT row
    // opened in this session, which is a link the person never asked for.
    setResumeChoice(undefined)
    setFormDirty(false)
    return true
  }

  /** Saving the wizard's new application. It closes; there is nothing behind it. */
  const submitNew = async (data: JobFormData, interviewAt?: string | null) => {
    const ok = await onCreate?.(data, resumeChoice, interviewAt)
    if (ok === false) return false
    setResumeChoice(undefined)
    setFormDirty(false)
    setAddOpen(false)
    return true
  }

  return (
    // An ordinary document column now. `sm:min-h-0 sm:flex-1` stay: they are
    // inert outside a bounded parent (see ui/table's docblock) and are what
    // the table's scrollport needs the moment anything above it bounds this
    // column again.
    <div className="flex flex-col gap-8 sm:min-h-0 sm:flex-1">
      <PageHeader
        title="applications"
        description="every role you are tracking, from wishlist through to an offer."
        action={
          <Button size="s" className="max-sm:w-full" onClick={() => setAddOpen(true)}>
            <PlusIcon size={16} aria-hidden className={iconMotion('open')} />
            add
          </Button>
        }
        rule
      />

      <ApplicationRecordDialog
        open={open !== null}
        onOpenChange={(next) => {
          if (!next) closeRecord()
        }}
        job={openJob}
        data={record}
        defaultCurrency={defaultCurrency}
        saving={saving}
        resumes={resumes}
        linkedResumeId={linkedResumeId}
        onLinkedResumeChange={setResumeChoice}
        onSubmit={submit}
        onDirtyChange={setFormDirty}
      />

      <AddApplicationDialog
        open={addOpen}
        onOpenChange={(next) => {
          if (next) {
            setAddOpen(true)
            return
          }
          // The same discard guard the record gets: a wizard three steps in
          // holds a model-filled application nobody wants to lose to a stray
          // Escape.
          if (formDirty) {
            setDiscardOpen(true)
            return
          }
          setAddOpen(false)
          setResumeChoice(undefined)
        }}
        defaultCurrency={defaultCurrency}
        resumes={resumes}
        saving={saving}
        onSubmit={submitNew}
        onLinkedResumeChange={setResumeChoice}
        onAutofill={onAutofill}
        autofilling={autofilling}
        onDigest={onDigest}
        onDirtyChange={setFormDirty}
      />

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="discard unsaved changes?"
        body="This application has edits that have not been saved. Closing now discards them."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setDiscardOpen(false)
          setAddOpen(false)
          dismiss()
        }}
      />

      {/* THE BAND ABOVE THE TOOLBAR (Gabe, 2026-09-10): a chart on the left
          third, four numbers on the right two thirds.

          ONLY ONCE THERE IS SOMETHING TO COUNT. On an empty account it would
          be a chart of nothing over four zeros, sitting between the page title
          and the "add your first application" call to action -- which is the
          one screen where every pixel should be pointing at that button. */}
      {jobs.length > 0 && <ApplicationsInsights jobs={jobs} />}

      <ApplicationsToolbar
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        onCsvFile={handleCsvFile}
        onExport={() => downloadCsv('worktrack-applications.csv', buildJobsCsvText(jobs))}
        importBusy={importing || parsingCsv}
        exportDisabled={jobs.length === 0}
      />

      {csv && (
        <section
          aria-label="CSV import"
          className="flex flex-col gap-3 border-y border-border-subtle py-4"
        >
          <p className="text-body-m text-text-primary">
            <span className="text-text-secondary">{csv.fileName}</span> —{' '}
            <span className="tabular">{csv.rows.length}</span> parsed,{' '}
            <span className="tabular">{csv.duplicates}</span> duplicate,{' '}
            <span className="tabular">{csv.invalid}</span> unreadable.
          </p>
          <label className="flex items-center gap-2 text-body-s text-text-secondary">
            <input
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="h-4 w-4 rounded-none border-border-default accent-accent-default"
            />
            skip rows already tracked
          </label>
          <div className="flex items-center gap-2">
            <Button size="s" onClick={runImport} disabled={importing}>
              <UploadIcon size={16} aria-hidden className={iconMotion('raise')} />
              Import {skipDuplicates ? csv.importable.length : csv.rows.length}
            </Button>
            <Button variant="ghost" size="s" onClick={() => setCsv(null)} disabled={importing}>
              <CloseIcon size={16} aria-hidden className={iconMotion('none')} />
              cancel
            </Button>
          </div>
        </section>
      )}

      {jobs.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-t border-border-subtle py-12">
          <h2 className="text-heading-m text-text-primary">no applications yet</h2>
          <p className="max-w-prose text-body-m text-text-muted">
            Add the first one by hand, or import the spreadsheet you have been keeping
            instead. Company and role are the only columns an import needs.
          </p>
          <Button onClick={() => setAddOpen(true)}>
            <PlusIcon size={16} aria-hidden className={iconMotion('open')} />
            add your first application
          </Button>
        </div>
      ) : (
        <>
          <StatusTabs
            value={tab}
            onChange={setTab}
            counts={counts}
            panelId="applications-list"
            className="border-b border-border-subtle"
          />
          {/* `min-h-0` only, on both, for the reason spelled out in
              ApplicationsTable: it permits the shrink that makes the table
              scrollable, while the default `flex: 0 1 auto` keeps the card at
              the height its rows actually need. */}
          <Card className="sm:min-h-0">
            <CardContent className="sm:flex sm:min-h-0 sm:flex-col">
              <ApplicationsTable
                id="applications-list"
                role="tabpanel"
                aria-labelledby={`status-tab-${tab}`}
                jobs={paged}
                emptyMessage={emptyListMessage}
                onOpen={openRecord}
                onDelete={onDelete}
              />
            </CardContent>
          </Card>

          {listed.length > 0 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-body-s text-text-muted">
                {(current - 1) * PAGE_SIZE + 1}&ndash;
                {Math.min(current * PAGE_SIZE, listed.length)} of {listed.length}
              </p>
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      aria-disabled={current === 1}
                      className={current === 1 ? 'pointer-events-none opacity-50' : undefined}
                      onClick={(e) => {
                        e.preventDefault()
                        setPage((p) => Math.max(1, p - 1))
                      }}
                    />
                  </PaginationItem>
                  {pageCount > 1 &&
                    Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                      <PaginationItem key={n}>
                        <PaginationLink
                        href="#"
                        isActive={n === current}
                        onClick={(e) => {
                          e.preventDefault()
                          setPage(n)
                        }}
                      >
                        {n}
                      </PaginationLink>
                      </PaginationItem>
                    ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      aria-disabled={current === pageCount}
                      className={
                        current === pageCount ? 'pointer-events-none opacity-50' : undefined
                      }
                      onClick={(e) => {
                        e.preventDefault()
                        setPage((p) => Math.min(pageCount, p + 1))
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  )
}
