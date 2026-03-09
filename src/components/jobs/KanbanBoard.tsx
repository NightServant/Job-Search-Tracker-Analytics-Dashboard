import { Job, JobStatus, STATUS_CONFIG } from '@/types'
import JobCard from './JobCard'

interface KanbanBoardProps {
  jobs: Job[]
  onEdit: (job: Job) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: JobStatus) => void
}

interface KanbanColumnProps {
  status: JobStatus
  jobs: Job[]
  onEdit: (job: Job) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: JobStatus) => void
}

function KanbanColumn({
  status,
  jobs,
  onEdit,
  onDelete,
  onStatusChange,
}: KanbanColumnProps) {
  const config = STATUS_CONFIG[status]
  const columnJobs = jobs.filter((job) => job.status === status)

  return (
    <div className="flex-shrink-0 w-72">
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: config.color }}
        />
        <h3 className="font-semibold text-zinc-900 dark:text-white">
          {config.label}
        </h3>
        <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full">
          {columnJobs.length}
        </span>
      </div>

      {/* Column Content */}
      <div className="space-y-2 min-h-[200px] p-2 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-xl">
        {columnJobs.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-zinc-400 dark:text-zinc-500">
            No jobs
          </div>
        ) : (
          columnJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              compact
            />
          ))
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard({
  jobs,
  onEdit,
  onDelete,
  onStatusChange,
}: KanbanBoardProps) {
  const statuses: JobStatus[] = [
    'wishlist',
    'applied',
    'interviewing',
    'offer',
    'rejected',
  ]

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
      {statuses.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          jobs={jobs}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  )
}
