import { useMemo, useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useAutofillJobFromUrl, useJobStatusHistory } from '@/hooks/useJobs'
import {
  Job,
  JobAutofillResult,
  JobFormData,
  JobStatus,
  STATUS_CONFIG,
  WorkMode,
} from '@/types'

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
    contact_name: '',
    contact_email: '',
    contact_linkedin: '',
    contact_notes: '',
    location: '',
    work_mode: undefined,
    source: '',
    is_referral: false,
  })
  const [tagsInput, setTagsInput] = useState('')
  const [techStackInput, setTechStackInput] = useState('')
  const [touched, setTouched] = useState<Partial<Record<keyof JobFormData, boolean>>>({})
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  const [autofillSummary, setAutofillSummary] = useState<string>('')
  const [autofillWarnings, setAutofillWarnings] = useState<string[]>([])

  const autofillFromUrl = useAutofillJobFromUrl()

  const { data: statusHistory = [], isLoading: isHistoryLoading } =
    useJobStatusHistory(job?.id)

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
        contact_name: job.contact_name ?? '',
        contact_email: job.contact_email ?? '',
        contact_linkedin: job.contact_linkedin ?? '',
        contact_notes: job.contact_notes ?? '',
        location: job.location ?? '',
        work_mode: job.work_mode ?? undefined,
        source: job.source ?? '',
        is_referral: job.is_referral ?? false,
      })
      setTagsInput((job.tags ?? []).join(', '))
      setTechStackInput((job.tech_stack ?? []).join(', '))
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
        contact_name: '',
        contact_email: '',
        contact_linkedin: '',
        contact_notes: '',
        location: '',
        work_mode: undefined,
        source: '',
        is_referral: false,
      })
      setTagsInput('')
      setTechStackInput('')
    }
    setTouched({})
    setAttemptedSubmit(false)
    setAutofillSummary('')
    setAutofillWarnings([])
  }, [job, isOpen])

  const applyAutofillResult = (result: JobAutofillResult) => {
    const fieldLabels: Record<string, string> = {
      company: 'Company',
      role: 'Role',
      location: 'Location',
      source: 'Source',
      salary_min: 'Min Salary',
      salary_max: 'Max Salary',
      url: 'Job URL',
    }

    const incoming = result.values
    const changedLabels: string[] = []

    setFormData((prev) => {
      const next = { ...prev }
      const keys = Object.keys(fieldLabels) as Array<keyof typeof fieldLabels>

      for (const key of keys) {
        const incomingValue = incoming[key as keyof typeof incoming]
        if (incomingValue === undefined || incomingValue === null || incomingValue === '') {
          continue
        }

        const currentValue = prev[key as keyof JobFormData]
        const isCurrentEmpty =
          currentValue === undefined ||
          currentValue === null ||
          (typeof currentValue === 'string' && currentValue.trim() === '')

        if (isCurrentEmpty) {
          ;(next as Record<string, unknown>)[key] = incomingValue
          changedLabels.push(fieldLabels[key])
        }
      }

      return next
    })

    if (changedLabels.length > 0) {
      setAutofillSummary(
        `Auto-filled ${changedLabels.length} field(s): ${changedLabels.join(', ')}. Review everything before saving.`
      )
    } else {
      setAutofillSummary('No empty fields were updated. You can still edit values manually.')
    }

    setAutofillWarnings(result.warnings || [])
  }

  const handleAutofill = async () => {
    const url = (formData.url || '').trim()
    if (!url) {
      setAutofillSummary('Enter a job URL first, then click Auto-fill.')
      setAutofillWarnings([])
      return
    }

    if (!/^https?:\/\/.+/i.test(url)) {
      setAutofillSummary('Please enter a valid URL (must start with http:// or https://).')
      setAutofillWarnings([])
      return
    }

    try {
      const result = await autofillFromUrl.mutateAsync(url)
      applyAutofillResult(result)
    } catch (err) {
      setAutofillWarnings([])
      setAutofillSummary(
        err instanceof Error
          ? err.message
          : 'Could not auto-fill this URL. You can still complete the form manually.'
      )
    }
  }

  const toNullableString = (value: string | null | undefined): string | null => {
    const trimmed = (value ?? '').trim()
    return trimmed ? trimmed : null
  }

  const parseCommaList = (value: string): string[] => {
    const items = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    return Array.from(new Set(items))
  }

  const formatDateTime = (value?: string | null): string => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const computeErrors = useMemo(() => {
    const newErrors: Partial<Record<keyof JobFormData, string>> = {}

    if (!formData.company.trim()) {
      newErrors.company = 'Company is required'
    }
    if (!formData.role.trim()) {
      newErrors.role = 'Role is required'
    }

    const min = formData.salary_min
    const max = formData.salary_max
    const hasMin = typeof min === 'number' && Number.isFinite(min)
    const hasMax = typeof max === 'number' && Number.isFinite(max)

    if (hasMin && hasMax && min! > max!) {
      newErrors.salary_max = 'Max salary must be greater than min'
    }

    if (formData.url && !/^https?:\/\/.+/.test(formData.url)) {
      newErrors.url = 'Please enter a valid URL'
    }
    if (formData.contact_email && !/^\S+@\S+\.\S+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Please enter a valid email'
    }
    if (formData.contact_linkedin && !/^https?:\/\/.+/.test(formData.contact_linkedin)) {
      newErrors.contact_linkedin = 'Please enter a valid URL'
    }

    return newErrors
  }, [formData])

  const errors = useMemo(() => {
    if (attemptedSubmit) return computeErrors

    const filtered: Partial<Record<keyof JobFormData, string>> = {}
    ;(Object.keys(computeErrors) as Array<keyof JobFormData>).forEach((key) => {
      if (touched[key]) filtered[key] = computeErrors[key]
    })
    return filtered
  }, [attemptedSubmit, computeErrors, touched])

  const markTouched = (field: keyof JobFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAttemptedSubmit(true)
    if (Object.keys(computeErrors).length > 0) return

    await onSubmit({
      ...formData,
      salary_min: formData.salary_min ?? null,
      salary_max: formData.salary_max ?? null,
      url: toNullableString(formData.url),
      date_applied: toNullableString(formData.date_applied),
      notes: toNullableString(formData.notes),
      contact_name: toNullableString(formData.contact_name),
      contact_email: toNullableString(formData.contact_email),
      contact_linkedin: toNullableString(formData.contact_linkedin),
      contact_notes: toNullableString(formData.contact_notes),
      location: toNullableString(formData.location),
      work_mode: formData.work_mode ?? null,
      source: toNullableString(formData.source),
      is_referral: !!formData.is_referral,
      tags: parseCommaList(tagsInput),
      tech_stack: parseCommaList(techStackInput),
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
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
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
              onBlur={() => markTouched('company')}
              className={`input ${errors.company ? 'border-red-500' : ''}`}
              placeholder="Google, Meta, etc."
              aria-invalid={!!errors.company}
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
              onBlur={() => markTouched('role')}
              className={`input ${errors.role ? 'border-red-500' : ''}`}
              placeholder="Software Engineer, Product Manager, etc."
              aria-invalid={!!errors.role}
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
                onBlur={() => markTouched('salary_max')}
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
                onBlur={() => markTouched('salary_max')}
                className={`input ${errors.salary_max ? 'border-red-500' : ''}`}
                placeholder="150000"
                aria-invalid={!!errors.salary_max}
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
            <div className="flex items-center gap-2">
              <input
                type="text"
                id="url"
                value={formData.url ?? ''}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                onBlur={() => markTouched('url')}
                className={`input ${errors.url ? 'border-red-500' : ''}`}
                placeholder="https://careers.company.com/job/123"
                aria-invalid={!!errors.url}
              />
              <button
                type="button"
                onClick={handleAutofill}
                className="btn-secondary whitespace-nowrap"
                disabled={autofillFromUrl.isPending}
              >
                {autofillFromUrl.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Auto-filling...
                  </>
                ) : (
                  'Auto-fill from URL'
                )}
              </button>
            </div>
            {errors.url && (
              <p className="mt-1 text-xs text-red-500">{errors.url}</p>
            )}
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Auto-fill is best effort. Always review fields before saving.
            </p>
            {autofillSummary && (
              <p className="mt-1 text-xs text-primary-600 dark:text-primary-400">{autofillSummary}</p>
            )}
            {autofillWarnings.length > 0 && (
              <ul className="mt-1 space-y-1">
                {autofillWarnings.map((warning, idx) => (
                  <li key={`${warning}-${idx}`} className="text-xs text-amber-600 dark:text-amber-400">
                    {warning}
                  </li>
                ))}
              </ul>
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
                value={formData.date_applied ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, date_applied: e.target.value })
                }
                className="input"
              />
            </div>
          </div>

          {/* Location & Work Mode */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="location" className="label">
                Location
              </label>
              <input
                type="text"
                id="location"
                value={formData.location ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="input"
                placeholder="City, State / Remote"
              />
            </div>
            <div>
              <label htmlFor="work_mode" className="label">
                Work Mode
              </label>
              <select
                id="work_mode"
                value={formData.work_mode ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    work_mode: e.target.value
                      ? (e.target.value as WorkMode)
                      : undefined,
                  })
                }
                className="input"
              >
                <option value="">Not set</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          {/* Source & Referral */}
          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="source" className="label">
                Source
              </label>
              <input
                type="text"
                id="source"
                value={formData.source ?? ''}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="input"
                placeholder="LinkedIn, company site, etc."
              />
            </div>
            <div>
              <label className="label">Referral</label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 h-10">
                <input
                  type="checkbox"
                  checked={!!formData.is_referral}
                  onChange={(e) =>
                    setFormData({ ...formData, is_referral: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                />
                Referral
              </label>
            </div>
          </div>

          {/* Tags & Tech Stack */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tags" className="label">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="input"
                placeholder="comma-separated (e.g. new-grad, fintech)"
              />
            </div>
            <div>
              <label htmlFor="tech_stack" className="label">
                Tech Stack
              </label>
              <input
                type="text"
                id="tech_stack"
                value={techStackInput}
                onChange={(e) => setTechStackInput(e.target.value)}
                className="input"
                placeholder="comma-separated (e.g. react, node)"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              Contact
            </p>
            <div className="mt-3 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact_name" className="label">
                    Name
                  </label>
                  <input
                    type="text"
                    id="contact_name"
                    value={formData.contact_name ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_name: e.target.value })
                    }
                    className="input"
                    placeholder="Recruiter / Hiring manager"
                  />
                </div>
                <div>
                  <label htmlFor="contact_email" className="label">
                    Email
                  </label>
                  <input
                    type="email"
                    id="contact_email"
                    value={formData.contact_email ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_email: e.target.value })
                    }
                    onBlur={() => markTouched('contact_email')}
                    className={`input ${errors.contact_email ? 'border-red-500' : ''}`}
                    placeholder="name@company.com"
                    aria-invalid={!!errors.contact_email}
                  />
                  {errors.contact_email && (
                    <p className="mt-1 text-xs text-red-500">{errors.contact_email}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="contact_linkedin" className="label">
                  LinkedIn
                </label>
                <input
                  type="text"
                  id="contact_linkedin"
                  value={formData.contact_linkedin ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contact_linkedin: e.target.value,
                    })
                  }
                  onBlur={() => markTouched('contact_linkedin')}
                  className={`input ${errors.contact_linkedin ? 'border-red-500' : ''}`}
                  placeholder="https://www.linkedin.com/in/..."
                  aria-invalid={!!errors.contact_linkedin}
                />
                {errors.contact_linkedin && (
                  <p className="mt-1 text-xs text-red-500">{errors.contact_linkedin}</p>
                )}
              </div>

              <div>
                <label htmlFor="contact_notes" className="label">
                  Notes
                </label>
                <textarea
                  id="contact_notes"
                  value={formData.contact_notes ?? ''}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_notes: e.target.value })
                  }
                  className="input min-h-[80px] resize-y"
                  placeholder="Any context (e.g. reached out on LinkedIn, follow-up date, etc.)"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="label">
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes ?? ''}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="input min-h-[100px] resize-y"
              placeholder="Add any notes about this job..."
            />
          </div>

          {/* Status history */}
          {job && (
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  Status history
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Last touched {formatDateTime(job.updated_at)}
                </p>
              </div>

              <div className="mt-3">
                {isHistoryLoading ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
                ) : statusHistory.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No status changes yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {statusHistory.map((entry) => (
                      <li
                        key={entry.id}
                        className="text-sm text-zinc-700 dark:text-zinc-300 flex items-start justify-between gap-4"
                      >
                        <span>
                          {STATUS_CONFIG[entry.from_status].label} →{' '}
                          {STATUS_CONFIG[entry.to_status].label}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          {formatDateTime(entry.changed_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

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
