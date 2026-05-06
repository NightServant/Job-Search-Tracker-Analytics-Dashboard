import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Loader2,
  Briefcase,
  Upload,
  AlertCircle,
} from 'lucide-react'
import {
  useJobs,
  useCreateJob,
  useCreateJobsBulk,
  useUpdateJob,
  useDeleteJob,
  useUpdateJobStatus,
} from '@/hooks/useJobs'
import { useToast } from '@/contexts/ToastContext'
import { Job, JobStatus, JobFormData, STATUS_CONFIG, ViewMode, WorkMode } from '@/types'
import JobCard from '@/components/jobs/JobCard'
import JobForm from '@/components/jobs/JobForm'
import KanbanBoard from '@/components/jobs/KanbanBoard'
import { buildJobDedupKey, parseJobsCsvText, ParsedJobRow } from '@/lib/jobCsv'

type DuplicateReason = 'existing' | 'file'

type DuplicateRow = ParsedJobRow & { reason: DuplicateReason }

interface CsvImportState {
  fileName: string
  rows: ParsedJobRow[]
  issuesCount: number
  duplicates: DuplicateRow[]
  importable: ParsedJobRow[]
}

export default function JobsPage() {
  const { data: jobs = [], isLoading, error: jobsError } = useJobs()
  const createJob = useCreateJob()
  const createJobsBulk = useCreateJobsBulk()
  const updateJob = useUpdateJob()
  const deleteJob = useDeleteJob()
  const updateStatus = useUpdateJobStatus()

  const { success, error: showError, info } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [csvImport, setCsvImport] = useState<CsvImportState | null>(null)
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [isParsingCsv, setIsParsingCsv] = useState(false)

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [locationFilter, setLocationFilter] = useState('')
  const [workModeFilter, setWorkModeFilter] = useState<'all' | WorkMode>('all')
  const [sourceFilter, setSourceFilter] = useState<'all' | string>('all')
  const [referralOnly, setReferralOnly] = useState(false)
  const [tagFilter, setTagFilter] = useState('')
  const [techStackFilter, setTechStackFilter] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest')
  const [page, setPage] = useState(1)
  const itemsPerPage = 20

  const existingDedupKeys = useMemo(() => {
    return new Set(
      jobs.map((job) =>
        buildJobDedupKey({
          company: job.company,
          role: job.role,
          date_applied: job.date_applied ?? null,
          url: job.url ?? null,
        })
      )
    )
  }, [jobs])

  const availableSources = useMemo(() => {
    const sources = new Set<string>()
    jobs.forEach((job) => {
      const source = (job.source || '').trim()
      if (source) sources.add(source)
    })
    return Array.from(sources).sort((a, b) => a.localeCompare(b))
  }, [jobs])

  // Filter jobs and apply date sorting
  const filteredJobs = useMemo(() => {
    const search = searchQuery.trim().toLowerCase()
    const location = locationFilter.trim().toLowerCase()
    const tag = tagFilter.trim().toLowerCase()
    const tech = techStackFilter.trim().toLowerCase()

    const matched = jobs.filter((job) => {
      const matchesSearch =
        !search ||
        job.company.toLowerCase().includes(search) ||
        job.role.toLowerCase().includes(search)
      const matchesStatus =
        statusFilter === 'all' || job.status === statusFilter
      const matchesLocation =
        !location || (job.location || '').toLowerCase().includes(location)
      const matchesWorkMode =
        workModeFilter === 'all' || job.work_mode === workModeFilter
      const matchesSource =
        sourceFilter === 'all' || (job.source || '').trim() === sourceFilter
      const matchesReferral = !referralOnly || !!job.is_referral
      const matchesTag =
        !tag || (job.tags || []).some((t) => t.toLowerCase().includes(tag))
      const matchesTech =
        !tech ||
        (job.tech_stack || []).some((t) => t.toLowerCase().includes(tech))

      return (
        matchesSearch &&
        matchesStatus &&
        matchesLocation &&
        matchesWorkMode &&
        matchesSource &&
        matchesReferral &&
        matchesTag &&
        matchesTech
      )
    })

    // Sort by creation date
    const sorted = matched.slice().sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateSort === 'newest' ? tb - ta : ta - tb
    })

    return sorted
  }, [
    jobs,
    searchQuery,
    statusFilter,
    locationFilter,
    workModeFilter,
    sourceFilter,
    referralOnly,
    tagFilter,
    techStackFilter,
    dateSort,
  ])

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / itemsPerPage))
  const displayedJobs = useMemo(() => {
    const start = (page - 1) * itemsPerPage
    return filteredJobs.slice(start, start + itemsPerPage)
  }, [filteredJobs, page])

  const hasActiveFilters =
    !!searchQuery.trim() ||
    statusFilter !== 'all' ||
    !!locationFilter.trim() ||
    workModeFilter !== 'all' ||
    sourceFilter !== 'all' ||
    referralOnly ||
    !!tagFilter.trim() ||
    !!techStackFilter.trim()

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setLocationFilter('')
    setWorkModeFilter('all')
    setSourceFilter('all')
    setReferralOnly(false)
    setTagFilter('')
    setTechStackFilter('')
  }

  // reset to first page when filters or results change
  useEffect(() => {
    setPage(1)
  }, [filteredJobs])

  // Handlers
  const handleCreateJob = async (data: JobFormData) => {
    try {
      await createJob.mutateAsync(data)
      success('Job added')
      setIsFormOpen(false)
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      const friendly = raw.toLowerCase().includes('permission denied')
        ? 'Permission denied when saving the job. Check your database permissions or RLS policies.'
        : raw
      showError('Could not add job', friendly)
    }
  }

  const handleUpdateJob = async (data: JobFormData) => {
    if (!editingJob) return
    try {
      await updateJob.mutateAsync({ id: editingJob.id, data })
      success('Job updated')
      setEditingJob(null)
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      const friendly = raw.toLowerCase().includes('permission denied')
        ? 'Permission denied when updating the job. Check your database permissions or RLS policies.'
        : raw
      showError('Could not update job', friendly)
    }
  }

  const handleDeleteJob = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await deleteJob.mutateAsync(id)
        success('Job deleted')
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err)
        const friendly = raw.toLowerCase().includes('permission denied')
          ? 'Permission denied when deleting the job. Check your database permissions or RLS policies.'
          : raw
        showError('Could not delete job', friendly)
      }
    }
  }

  const handleStatusChange = async (id: string, status: JobStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status })
      success('Status updated')
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      const friendly = raw.toLowerCase().includes('permission denied')
        ? 'Permission denied when updating status. Check your database permissions or RLS policies.'
        : raw
      showError('Could not update status', friendly)
    }
  }

  const handleEdit = (job: Job) => {
    setEditingJob(job)
  }

  const openCsvPicker = () => {
    fileInputRef.current?.click()
  }

  const handleCsvSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // allow selecting the same file twice
    e.target.value = ''
    if (!file) return

    setIsParsingCsv(true)
    try {
      const text = await file.text()
      const result = parseJobsCsvText(text)

      if (result.fatalError) {
        showError('CSV import failed', result.fatalError)
        setCsvImport(null)
        return
      }

      const seenInFile = new Set<string>()
      const duplicates: DuplicateRow[] = []
      const importable: ParsedJobRow[] = []

      for (const row of result.rows) {
        if (existingDedupKeys.has(row.dedupKey)) {
          duplicates.push({ ...row, reason: 'existing' })
          continue
        }
        if (seenInFile.has(row.dedupKey)) {
          duplicates.push({ ...row, reason: 'file' })
          continue
        }
        seenInFile.add(row.dedupKey)
        importable.push(row)
      }

      setCsvImport({
        fileName: file.name,
        rows: result.rows,
        issuesCount: result.issues.length,
        duplicates,
        importable,
      })
      setSkipDuplicates(true)

      if (result.issues.length > 0) {
        info('Some rows were skipped', `${result.issues.length} invalid row(s)`)
      }
    } catch (err) {
      showError('CSV import failed', err instanceof Error ? err.message : 'Unknown error')
      setCsvImport(null)
    } finally {
      setIsParsingCsv(false)
    }
  }

  const handleImportCsv = async () => {
    if (!csvImport) return

    const rowsToImport = skipDuplicates ? csvImport.importable : csvImport.rows
    const payload = rowsToImport.map((row) => row.data)

    if (payload.length === 0) {
      info('Nothing to import', 'No new rows to import')
      return
    }

    try {
      await createJobsBulk.mutateAsync(payload)
      const skipped = skipDuplicates ? csvImport.duplicates.length : 0
      const message = skipped > 0 ? `${payload.length} imported, ${skipped} duplicate(s) skipped` : `${payload.length} imported`
      success('CSV imported', message)
      setCsvImport(null)
    } catch (err) {
      showError('Import failed', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (jobsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="card p-6 max-w-md text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
            Could not load jobs
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">
            {jobsError instanceof Error ? jobsError.message : 'An error occurred while loading your jobs'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary w-full"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Jobs
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            {jobs.length} jobs tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCsvSelected}
          />
          <button
            onClick={openCsvPicker}
            className="btn-secondary"
            disabled={isParsingCsv || createJobsBulk.isPending}
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button onClick={() => setIsFormOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add New Job
          </button>
        </div>
      </div>

      {/* CSV Import Summary */}
      {csvImport ? (
        <div className="card p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                CSV ready to import
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                File: <span className="font-medium text-zinc-700 dark:text-zinc-200">{csvImport.fileName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCsvImport(null)}
                className="btn-ghost"
                disabled={createJobsBulk.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleImportCsv}
                className="btn-primary"
                disabled={createJobsBulk.isPending}
              >
                {createJobsBulk.isPending ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Parsed rows</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{csvImport.rows.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Importable</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                {skipDuplicates ? csvImport.importable.length : csvImport.rows.length}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Duplicates</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{csvImport.duplicates.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Invalid</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{csvImport.issuesCount}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              id="skip-duplicates"
              type="checkbox"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            <label htmlFor="skip-duplicates" className="text-sm text-zinc-700 dark:text-zinc-300">
              Skip duplicates (recommended)
            </label>
          </div>

          {csvImport.importable.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <th className="text-left py-2 pr-4">Company</th>
                    <th className="text-left py-2 pr-4">Role</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-left py-2 pr-4">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {csvImport.importable.slice(0, 8).map((row) => (
                    <tr key={row.rowNumber} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="py-2 pr-4 font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                        {row.data.company}
                      </td>
                      <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        {row.data.role}
                      </td>
                      <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        {STATUS_CONFIG[row.data.status].label}
                      </td>
                      <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        {row.data.is_referral ? 'Referral' : row.data.source || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvImport.importable.length > 8 ? (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Showing first 8 rows.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              No importable rows found.
            </p>
          )}
        </div>
      ) : null}

      {/* Filters & View Toggle */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Filters
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Narrow by search, status, source, or tags.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              {filteredJobs.length} of {jobs.length} shown
            </div>
            <div className="flex items-center">
              <label className="text-sm text-zinc-500 dark:text-zinc-400 mr-2">Sort</label>
              <select
                value={dateSort}
                onChange={(e) => setDateSort(e.target.value as 'newest' | 'oldest')}
                className="input px-2 py-1 text-sm"
                aria-label="Sort by date"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
            {hasActiveFilters ? (
              <button onClick={clearFilters} className="btn-ghost px-3 py-2">
                Clear filters
              </button>
            ) : null}
            <button
              onClick={() => setFiltersCollapsed((s) => !s)}
              className="btn-ghost px-3 py-2"
              aria-expanded={!filtersCollapsed}
            >
              {filtersCollapsed ? 'Show filters' : 'Hide filters'}
            </button>
            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-700 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-zinc-700 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
                title="Kanban view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search + quick status filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search companies or roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              All
            </button>
            {(Object.keys(STATUS_CONFIG) as JobStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                {STATUS_CONFIG[status].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Filters (collapsable) */}
      <div className={`transition-[max-height] duration-300 overflow-hidden ${filtersCollapsed ? 'max-h-0' : 'max-h-[600px]'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <input
          type="text"
          placeholder="Location"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="input"
        />

        <select
          value={workModeFilter}
          onChange={(e) =>
            setWorkModeFilter(
              e.target.value === 'all'
                ? 'all'
                : (e.target.value as WorkMode)
            )
          }
          className="input"
        >
          <option value="all">All work modes</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="input"
        >
          <option value="all">All sources</option>
          {availableSources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>

        <label className="input flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={referralOnly}
            onChange={(e) => setReferralOnly(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
          />
          <span className="text-sm">Referral only</span>
        </label>

        <input
          type="text"
          placeholder="Tag"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="input"
        />

        <input
          type="text"
          placeholder="Tech stack"
          value={techStackFilter}
          onChange={(e) => setTechStackFilter(e.target.value)}
          className="input"
        />
        </div>
      </div>

      {/* Content */}
      {filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {hasActiveFilters
              ? 'No jobs match your filters'
              : 'No jobs yet'}
          </h3>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400 max-w-sm">
            {hasActiveFilters
              ? 'Try adjusting your search or filters'
              : 'Start tracking your job applications by adding your first job or importing a CSV from a spreadsheet.'}
          </p>
          {!hasActiveFilters && (
            <div className="mt-4 flex flex-col sm:flex-row items-stretch gap-2">
              <button
                onClick={() => setIsFormOpen(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4" />
                Add Your First Job
              </button>
              <button
                onClick={openCsvPicker}
                className="btn-secondary"
                disabled={isParsingCsv || createJobsBulk.isPending}
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </button>
            </div>
          )}

          {!hasActiveFilters ? (
            <div className="mt-6 max-w-lg text-left w-full">
              <div className="card p-4">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Quick onboarding
                </h4>
                <ol className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-300 list-decimal list-inside">
                  <li>Add or import jobs</li>
                  <li>Update statuses as you progress</li>
                  <li>Fill in Source + Salary for better analytics</li>
                  <li>Check the Dashboard for trends</li>
                </ol>
              </div>
            </div>
          ) : null}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {displayedJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onEdit={handleEdit}
              onDelete={handleDeleteJob}
              onStatusChange={handleStatusChange}
            />
          ))}

          {filteredJobs.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                Showing {(page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, filteredJobs.length)} of {filteredJobs.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost px-3 py-1"
                >
                  Previous
                </button>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">Page {page} / {totalPages}</div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-ghost px-3 py-1"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <KanbanBoard
          jobs={filteredJobs}
          onEdit={handleEdit}
          onDelete={handleDeleteJob}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Job Form Modal */}
      <JobForm
        isOpen={isFormOpen || !!editingJob}
        onClose={() => {
          setIsFormOpen(false)
          setEditingJob(null)
        }}
        onSubmit={editingJob ? handleUpdateJob : handleCreateJob}
        job={editingJob}
        isLoading={createJob.isPending || updateJob.isPending}
      />
    </div>
  )
}
