import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Job, JobFormData, JobStatus, STATUS_CONFIG } from '@/types'

interface JobFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: JobFormData) => Promise<void>
  job?: Job | null
  isLoading?: boolean
}

export default function JobForm({
  isOpen,
  onClose,
  onSubmit,
  job,
  isLoading = false,
}: JobFormProps) {
  const [formData, setFormData] = useState<JobFormData>({
    company: '',
    role: '',
    salary_min: undefined,
    salary_max: undefined,
    url: '',
    status: 'wishlist',
    date_applied: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof JobFormData, string>>>({})

  // Populate form when editing
  useEffect(() => {
    if (job) {
      setFormData({
        company: job.company,
        role: job.role,
        salary_min: job.salary_min ?? undefined,
        salary_max: job.salary_max ?? undefined,
        url: job.url ?? '',
        status: job.status,
        date_applied: job.date_applied ?? '',
        notes: job.notes ?? '',
      })
    } else {
      setFormData({
        company: '',
        role: '',
        salary_min: undefined,
        salary_max: undefined,
        url: '',
        status: 'wishlist',
        date_applied: '',
        notes: '',
      })
    }
    setErrors({})
  }, [job, isOpen])

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof JobFormData, string>> = {}

    if (!formData.company.trim()) {
      newErrors.company = 'Company is required'
    }
    if (!formData.role.trim()) {
      newErrors.role = 'Role is required'
    }
    if (formData.salary_min && formData.salary_max && formData.salary_min > formData.salary_max) {
      newErrors.salary_max = 'Max salary must be greater than min'
    }
    if (formData.url && !/^https?:\/\/.+/.test(formData.url)) {
      newErrors.url = 'Please enter a valid URL'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    await onSubmit({
      ...formData,
      salary_min: formData.salary_min || undefined,
      salary_max: formData.salary_max || undefined,
      url: formData.url || undefined,
      date_applied: formData.date_applied || undefined,
      notes: formData.notes || undefined,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            {job ? 'Edit Job' : 'Add New Job'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Company */}
          <div>
            <label htmlFor="company" className="label">
              Company <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="company"
              value={formData.company}
              onChange={(e) =>
                setFormData({ ...formData, company: e.target.value })
              }
              className={`input ${errors.company ? 'border-red-500' : ''}`}
              placeholder="Google, Meta, etc."
            />
            {errors.company && (
              <p className="mt-1 text-xs text-red-500">{errors.company}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="label">
              Role <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="role"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className={`input ${errors.role ? 'border-red-500' : ''}`}
              placeholder="Software Engineer, Product Manager, etc."
            />
            {errors.role && (
              <p className="mt-1 text-xs text-red-500">{errors.role}</p>
            )}
          </div>

          {/* Salary Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="salary_min" className="label">
                Min Salary
              </label>
              <input
                type="number"
                id="salary_min"
                value={formData.salary_min ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salary_min: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="input"
                placeholder="100000"
              />
            </div>
            <div>
              <label htmlFor="salary_max" className="label">
                Max Salary
              </label>
              <input
                type="number"
                id="salary_max"
                value={formData.salary_max ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salary_max: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className={`input ${errors.salary_max ? 'border-red-500' : ''}`}
                placeholder="150000"
              />
              {errors.salary_max && (
                <p className="mt-1 text-xs text-red-500">{errors.salary_max}</p>
              )}
            </div>
          </div>

          {/* URL */}
          <div>
            <label htmlFor="url" className="label">
              Job URL
            </label>
            <input
              type="text"
              id="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className={`input ${errors.url ? 'border-red-500' : ''}`}
              placeholder="https://careers.company.com/job/123"
            />
            {errors.url && (
              <p className="mt-1 text-xs text-red-500">{errors.url}</p>
            )}
          </div>

          {/* Status & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className="label">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as JobStatus })
                }
                className="input"
              >
                {(Object.keys(STATUS_CONFIG) as JobStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_CONFIG[status].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="date_applied" className="label">
                Date Applied
              </label>
              <input
                type="date"
                id="date_applied"
                value={formData.date_applied}
                onChange={(e) =>
                  setFormData({ ...formData, date_applied: e.target.value })
                }
                className="input"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="label">
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="input min-h-[100px] resize-y"
              placeholder="Add any notes about this job..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : job ? (
                'Update Job'
              ) : (
                'Add Job'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
