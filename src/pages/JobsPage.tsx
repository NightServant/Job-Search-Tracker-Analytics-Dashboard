import { useState, useMemo } from 'react'
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Loader2,
  Briefcase,
} from 'lucide-react'
import { useJobs, useCreateJob, useUpdateJob, useDeleteJob, useUpdateJobStatus } from '@/hooks/useJobs'
import { Job, JobStatus, JobFormData, STATUS_CONFIG, ViewMode, WorkMode } from '@/types'
import JobCard from '@/components/jobs/JobCard'
import JobForm from '@/components/jobs/JobForm'
import KanbanBoard from '@/components/jobs/KanbanBoard'

export default function JobsPage() {
  const { data: jobs = [], isLoading } = useJobs()
  const createJob = useCreateJob()
  const updateJob = useUpdateJob()
  const deleteJob = useDeleteJob()
  const updateStatus = useUpdateJobStatus()

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

  const availableSources = useMemo(() => {
    const sources = new Set<string>()
    jobs.forEach((job) => {
      const source = (job.source || '').trim()
      if (source) sources.add(source)
    })
    return Array.from(sources).sort((a, b) => a.localeCompare(b))
  }, [jobs])

  // Filter jobs
  const filteredJobs = useMemo(() => {
    const search = searchQuery.trim().toLowerCase()
    const location = locationFilter.trim().toLowerCase()
    const tag = tagFilter.trim().toLowerCase()
    const tech = techStackFilter.trim().toLowerCase()

    return jobs.filter((job) => {
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
  ])

  const hasActiveFilters =
    !!searchQuery.trim() ||
    statusFilter !== 'all' ||
    !!locationFilter.trim() ||
    workModeFilter !== 'all' ||
    sourceFilter !== 'all' ||
    referralOnly ||
    !!tagFilter.trim() ||
    !!techStackFilter.trim()

  // Handlers
  const handleCreateJob = async (data: JobFormData) => {
    await createJob.mutateAsync(data)
    setIsFormOpen(false)
  }

  const handleUpdateJob = async (data: JobFormData) => {
    if (!editingJob) return
    await updateJob.mutateAsync({ id: editingJob.id, data })
    setEditingJob(null)
  }

  const handleDeleteJob = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      await deleteJob.mutateAsync(id)
    }
  }

  const handleStatusChange = async (id: string, status: JobStatus) => {
    await updateStatus.mutateAsync({ id, status })
  }

  const handleEdit = (job: Job) => {
    setEditingJob(job)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
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
        <button onClick={() => setIsFormOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Job
        </button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Search */}
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

        {/* Status Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
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
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              {STATUS_CONFIG[status].label}
            </button>
          ))}
        </div>

        {/* View Toggle */}
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

      {/* Advanced Filters */}
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
              : 'Start tracking your job applications by adding your first job.'}
          </p>
          {!hasActiveFilters && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="btn-primary mt-4"
            >
              <Plus className="w-4 h-4" />
              Add Your First Job
            </button>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onEdit={handleEdit}
              onDelete={handleDeleteJob}
              onStatusChange={handleStatusChange}
            />
          ))}
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
