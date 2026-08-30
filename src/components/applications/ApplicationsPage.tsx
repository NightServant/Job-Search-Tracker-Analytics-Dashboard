'use client'

import * as React from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { AppDialog } from '@/components/ui/app-dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PlusIcon } from '@/components/icons'
import { ApplicationsToolbar } from './ApplicationsToolbar'
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
import { ApplicationForm } from './ApplicationForm'
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

type FormState = { job: Job | null } | null

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
  onCreate?: (data: JobFormData) => Promise<boolean>
  onUpdate?: (id: string, data: JobFormData) => Promise<boolean>
  onDelete?: (job: Job) => void
  onImport?: (rows: JobFormData[]) => Promise<boolean>
  onAutofill?: (url: string) => Promise<JobAutofillResult>
  onCsvError?: (message: string) => void
  saving?: boolean
  importing?: boolean
  autofilling?: boolean
}

export function ApplicationsPage({
  jobs,
  defaultCurrency = resolveDefaultCurrency(null),
  onCreate,
  onUpdate,
  onDelete,
  onImport,
  onAutofill,
  onCsvError,
  saving = false,
  importing = false,
  autofilling = false,
}: ApplicationsPageProps) {
  const [search, setSearch] = React.useState('')
  const [tab, setTab] = React.useState<StatusTabValue>('all')
  const [page, setPage] = React.useState(1)
  const [form, setForm] = React.useState<FormState>(null)
  const [formDirty, setFormDirty] = React.useState(false)
  const [discardOpen, setDiscardOpen] = React.useState(false)
  const [csv, setCsv] = React.useState<CsvImport | null>(null)
  const [skipDuplicates, setSkipDuplicates] = React.useState(true)
  const [parsingCsv, setParsingCsv] = React.useState(false)

  // A dialog adds three ways to dismiss the old inline section never had --
  // Escape, an overlay click, the header's own close button -- and all three
  // report through this one handler (Base UI routes every one of them
  // through onOpenChange). A clean form closes immediately; a dirty one asks
  // first, so none of the three can silently drop nineteen typed fields the
  // way an unconditional setForm(null) after a rejected save used to.
  //
  // The form's own Cancel button is deliberately NOT routed through this --
  // it is an explicit "abandon this" action that predates the dialog and
  // behaved the same way (immediate, no confirmation) in the inline section.
  const closeForm = () => {
    if (formDirty) {
      setDiscardOpen(true)
      return
    }
    setForm(null)
  }

  // Sorted most-recently-created first. This predates Task 5 and Task 5 does
  // not change it, but it is worth naming now that a single status renders as
  // a flat list where order is the only structure left: `created_at` is when
  // the row was added to Worktrack, which is not the same field as
  // `date_applied` (when the application itself went out) -- "most recently
  // applied first" is what a user reading this list would expect, and this
  // is "most recently added" instead. A date-sort toggle was dropped in M5
  // and Gabe still wants it back; that is its own task, not folded in here.
  const searched = React.useMemo(() => {
    const needle = search.trim().toLowerCase()
    const matched = needle
      ? jobs.filter(
          (job) =>
            job.company.toLowerCase().includes(needle) ||
            job.role.toLowerCase().includes(needle)
        )
      : jobs
    return matched
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [jobs, search])

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
  }, [search, tab])

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

  const submit = async (data: JobFormData) => {
    // onCreate/onUpdate resolve to false on a caught failure rather than
    // throwing, so a rejected save leaves the panel open with every typed
    // field intact instead of discarding them behind a toast.
    const ok = form?.job ? await onUpdate?.(form.job.id, data) : await onCreate?.(data)
    if (ok !== false) setForm(null)
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="applications"
        action={
          <Button size="s" onClick={() => setForm({ job: null })}>
            <PlusIcon size={16} aria-hidden />
            add
          </Button>
        }
      />

      <AppDialog
        open={form !== null}
        onOpenChange={(open) => {
          if (!open) closeForm()
        }}
        size="l"
        title={
          form?.job ? `Edit ${form.job.role} at ${form.job.company}` : 'New application'
        }
      >
        <div data-application-form>
          {form && (
            <ApplicationForm
              key={form.job?.id ?? 'new'}
              defaultCurrency={defaultCurrency}
              job={form.job}
              saving={saving}
              onSubmit={submit}
              onCancel={() => setForm(null)}
              onAutofill={onAutofill}
              autofilling={autofilling}
              onDirtyChange={setFormDirty}
            />
          )}
        </div>
      </AppDialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="discard unsaved changes?"
        body="This application has edits that have not been saved. Closing now discards them."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setDiscardOpen(false)
          setFormDirty(false)
          setForm(null)
        }}
      />

      <ApplicationsToolbar
        search={search}
        onSearchChange={setSearch}
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
              Import {skipDuplicates ? csv.importable.length : csv.rows.length}
            </Button>
            <Button variant="ghost" size="s" onClick={() => setCsv(null)} disabled={importing}>
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
          <Button onClick={() => setForm({ job: null })}>
            <PlusIcon size={16} aria-hidden />
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
          <Card>
            <CardContent>
              <ApplicationsTable
                id="applications-list"
                role="tabpanel"
                aria-labelledby={`status-tab-${tab}`}
                jobs={paged}
                emptyMessage={emptyListMessage}
                onEdit={(job) => setForm({ job })}
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
              {pageCount > 1 && (
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
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
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
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
