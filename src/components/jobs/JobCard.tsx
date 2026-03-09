import {
  ExternalLink,
  Pencil,
  Trash2,
  DollarSign,
  Calendar,
  MoreVertical,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Job, JobStatus, STATUS_CONFIG } from '@/types'

interface JobCardProps {
  job: Job
  onEdit: (job: Job) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: JobStatus) => void
  compact?: boolean
}

export default function JobCard({
  job,
  onEdit,
  onDelete,
  onStatusChange,
  compact = false,
}: JobCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    })
    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`
    }
    return formatter.format(min || max || 0)
  }

  const formatDate = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const statusConfig = STATUS_CONFIG[job.status]
  const salary = formatSalary(job.salary_min, job.salary_max)
  const appliedDate = formatDate(job.date_applied)

  if (compact) {
    // Compact version for Kanban board
    return (
      <div className="card-hover p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm text-zinc-900 dark:text-white truncate">
              {job.role}
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {job.company}
            </p>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <MoreVertical className="w-4 h-4 text-zinc-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-10">
                <button
                  onClick={() => {
                    onEdit(job)
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete(job.id)
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        {salary && (
          <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <DollarSign className="w-3 h-3" />
            {salary}
          </div>
        )}
      </div>
    )
  }

  // Full version for list view
  return (
    <div className="card-hover p-4 md:p-5">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Company Logo Placeholder */}
        <div className="hidden md:flex w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-zinc-400 dark:text-zinc-500">
            {job.company.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-zinc-900 dark:text-white truncate">
                {job.role}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {job.company}
              </p>
            </div>

            {/* Status Badge */}
            <div className="relative" ref={statusRef}>
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusConfig.bgColor} text-white hover:opacity-90 transition-opacity`}
              >
                {statusConfig.label}
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-10">
                  {(Object.keys(STATUS_CONFIG) as JobStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        onStatusChange(job.id, status)
                        setShowStatusMenu(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
                        status === job.status
                          ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                          : 'text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: STATUS_CONFIG[status].color }}
                      />
                      {STATUS_CONFIG[status].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            {salary && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {salary}
              </div>
            )}
            {appliedDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {appliedDate}
              </div>
            )}
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                View Posting
              </a>
            )}
          </div>

          {/* Notes */}
          {job.notes && (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
              {job.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:flex-col md:gap-1">
          <button
            onClick={() => onEdit(job)}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(job.id)}
            className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
