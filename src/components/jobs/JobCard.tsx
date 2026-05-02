import {
  ExternalLink,
  Pencil,
  Trash2,
  DollarSign,
  Calendar,
  MoreVertical,
  MapPin,
  Wifi,
  Clock,
  User,
  GripVertical,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Job, JobStatus, STATUS_CONFIG } from '@/types'

interface JobCardProps {
  job: Job
  onEdit: (job: Job) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: JobStatus) => void
  compact?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}

export default function JobCard({
  job,
  onEdit,
  onDelete,
  onStatusChange,
  compact = false,
  dragHandleProps,
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

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statusConfig = STATUS_CONFIG[job.status]
  const salary = formatSalary(job.salary_min, job.salary_max)
  const appliedDate = formatDate(job.date_applied)
  const lastTouched = formatDateTime(job.updated_at)
  const tags = job.tags ?? []
  const techStack = job.tech_stack ?? []

  if (compact) {
    // Compact version for Kanban board
    return (
      <div className="card-hover p-3 space-y-2">
        <div className="flex items-start gap-2">
          {dragHandleProps ? (
            <button
              type="button"
              aria-label="Drag job"
              className="p-1 -ml-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-grab active:cursor-grabbing"
              {...dragHandleProps}
            >
              <GripVertical className="w-4 h-4" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm text-zinc-900 dark:text-white truncate">
              {job.role}
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {job.company}
            </p>
          </div>
          <div className="relative ml-auto" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="More actions"
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
                          ? 'text-primary-600 dark:text-primary-400 font-medium'
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
            {job.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.location}
              </div>
            )}
            {job.work_mode && (
              <div className="flex items-center gap-1">
                <Wifi className="w-4 h-4" />
                {job.work_mode === 'remote' ? 'Remote' : 'Hybrid'}
              </div>
            )}
            {job.source && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Source:</span>
                {job.source}
              </div>
            )}
            {job.is_referral && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                Referral
              </span>
            )}
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                View Posting
              </a>
            )}
          </div>

          {/* Tags / Tech */}
          {(tags.length > 0 || techStack.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1">
              {tags.slice(0, 8).map((tag) => (
                <span
                  key={`tag-${tag}`}
                  className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {tag}
                </span>
              ))}
              {techStack.slice(0, 8).map((tech) => (
                <span
                  key={`tech-${tech}`}
                  className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}

          {/* Contact */}
          {(job.contact_name || job.contact_email || job.contact_linkedin) && (
            <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {job.contact_name || 'Contact'}
              </span>
              {job.contact_email && (
                <a
                  href={`mailto:${job.contact_email}`}
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {job.contact_email}
                </a>
              )}
              {job.contact_linkedin && (
                <a
                  href={job.contact_linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  LinkedIn
                </a>
              )}
            </div>
          )}

          {/* Notes */}
          {job.notes && (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
              {job.notes}
            </p>
          )}

          {/* Last touched */}
          <div className="mt-3 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Clock className="w-3 h-3" />
            Last touched {lastTouched}
          </div>
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
