'use client'

import * as React from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@/components/icons'
import { ApplicationsToolbar } from './ApplicationsToolbar'
import { ApplicationsList } from './ApplicationsList'
import { KanbanView } from './KanbanView'
import { StatusTabs, STATUS_TABS, type StatusTabValue } from './StatusTabs'
import { ApplicationForm } from './ApplicationForm'
import { buildJobDedupKey, buildJobsCsvText, parseJobsCsvText, type ParsedJobRow } from '@/lib/jobCsv'
import { resolveDefaultCurrency, type SupportedCurrency } from '@/services/userPreferences'
import type { Job, JobAutofillResult, JobFormData, JobStatus } from '@/types'

interface CsvImport {
  fileName: string
  rows: ParsedJobRow[]
  importable: ParsedJobRow[]
  duplicates: number
  invalid: number
}

type FormState = { job: Job | null } | null

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
 * Two views over one list, chosen by width rather than by a toggle. The old
 * screen had a list/kanban switch, and keeping it would have meant a control
 * that does nothing on mobile (where kanban is forbidden) and duplicates the
 * board on desktop. 5.4 states the rule directly: kanban desktop, list plus
 * status tabs on mobile.
 *
 * Search narrows both views; the status tabs narrow only the list, because the
 * board already separates by status and a tab that hides four of five columns
 * is a filter arguing with a layout.
 */
export interface ApplicationsPageProps {
  jobs: Job[]
  defaultCurrency?: SupportedCurrency
  onCreate?: (data: JobFormData) => Promise<boolean>
  onUpdate?: (id: string, data: JobFormData) => Promise<boolean>
  onDelete?: (job: Job) => void
  onStatusChange?: (job: Job, status: JobStatus) => void
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
  onStatusChange,
  onImport,
  onAutofill,
  onCsvError,
  saving = false,
  importing = false,
  autofilling = false,
}: ApplicationsPageProps) {
  const [search, setSearch] = React.useState('')
  const [tab, setTab] = React.useState<StatusTabValue>('all')
  const [form, setForm] = React.useState<FormState>(null)
  const [csv, setCsv] = React.useState<CsvImport | null>(null)
  const [skipDuplicates, setSkipDuplicates] = React.useState(true)
  const [parsingCsv, setParsingCsv] = React.useState(false)
  const formSectionRef = React.useRef<HTMLElement | null>(null)

  // A card low on a five-column board is off-screen from the header the form
  // opens under, and nothing else moves the viewport or focus there. Without
  // this, pressing Edit on such a card looks like it did nothing.
  React.useEffect(() => {
    if (!form) return
    const node = formSectionRef.current
    if (!node) return
    node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    node.querySelector<HTMLElement>('input, select, textarea')?.focus()
  }, [form])

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
        title="Applications"
        action={
          <Button size="s" onClick={() => setForm({ job: null })}>
            <PlusIcon size={16} aria-hidden />
            Add
          </Button>
        }
      />

      {form && (
        <section
          ref={formSectionRef}
          data-application-form
          aria-label={form.job ? 'Edit application' : 'New application'}
          className="border-y border-border-subtle py-6"
        >
          <ApplicationForm
            key={form.job?.id ?? 'new'}
            defaultCurrency={defaultCurrency}
            job={form.job}
            saving={saving}
            onSubmit={submit}
            onCancel={() => setForm(null)}
            onAutofill={onAutofill}
            autofilling={autofilling}
          />
        </section>
      )}

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
            Skip rows already tracked
          </label>
          <div className="flex items-center gap-2">
            <Button size="s" onClick={runImport} disabled={importing}>
              Import {skipDuplicates ? csv.importable.length : csv.rows.length}
            </Button>
            <Button variant="ghost" size="s" onClick={() => setCsv(null)} disabled={importing}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      {jobs.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-t border-border-subtle py-12">
          <h2 className="text-heading-m text-text-primary">No applications yet</h2>
          <p className="max-w-prose text-body-m text-text-muted">
            Add the first one by hand, or import the spreadsheet you have been keeping
            instead. Company and role are the only columns an import needs.
          </p>
          <Button onClick={() => setForm({ job: null })}>
            <PlusIcon size={16} aria-hidden />
            Add your first application
          </Button>
        </div>
      ) : (
        <>
          <StatusTabs
            value={tab}
            onChange={setTab}
            counts={counts}
            panelId="applications-list"
            className="md:hidden border-b border-border-subtle"
          />
          <ApplicationsList
            id="applications-list"
            role="tabpanel"
            aria-labelledby={`status-tab-${tab}`}
            jobs={listed}
            onEdit={(job) => setForm({ job })}
            onDelete={onDelete}
          />
          <KanbanView
            jobs={searched}
            onStatusChange={onStatusChange}
            onEdit={(job) => setForm({ job })}
            onDelete={onDelete}
          />
        </>
      )}
    </div>
  )
}
