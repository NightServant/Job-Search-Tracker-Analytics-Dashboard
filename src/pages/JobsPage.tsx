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
import { Job, JobStatus, JobFormData, STATUS_CONFIG, ViewMode } from '@/types'
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
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.role.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' || job.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [jobs, searchQuery, statusFilter])

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

      {/* Content */}
      {filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {searchQuery || statusFilter !== 'all'
              ? 'No jobs match your filters'
              : 'No jobs yet'}
          </h3>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400 max-w-sm">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Start tracking your job applications by adding your first job.'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
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
