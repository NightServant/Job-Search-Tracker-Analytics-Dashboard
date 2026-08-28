'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { STATUSES } from '@/components/ui/status-marker'
import { assertJobFormDataValid, jobValidation } from '@/services/jobValidation'
import {
  SUPPORTED_CURRENCIES,
  isSupportedCurrency,
  type SupportedCurrency,
} from '@/services/userPreferences'
import type { Job, JobAutofillResult, JobFormData, JobStatus, WorkMode } from '@/types'

const STATUS_LABELS: Record<JobStatus, string> = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
}

const WORK_MODES: { value: WorkMode; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

function nullable(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed ? trimmed : null
}

function parseCommaList(value: string): string[] {
  return Array.from(new Set(value.split(',').map((item) => item.trim()).filter(Boolean)))
}

/**
 * A bare domain typed into the URL field is a URL the user meant, not one they
 * got wrong, so it is completed rather than rejected. `validateUrl` only
 * accepts `http(s)://` or `//`, and failing someone for omitting a scheme they
 * never type anywhere else is a validation message nobody learns from.
 */
function normalizePostingUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
  if (/^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}

/**
 * Replaces the 824-line `JobForm`. Same fields, same `JobFormData`, same
 * `jobValidation` -- a re-skin and a decomposition, not a behaviour change.
 *
 * Three things did change, each for a reason worth stating.
 *
 * It is a pure component over props with no hooks of its own beyond state.
 * The old form reached for `useAutofillJobFromUrl` and `useJobStatusHistory`
 * directly, which meant a test had to stand up react-query to render a text
 * field. Auto-fill arrives as `onAutofill` and the page owns the mutation.
 *
 * Validation is `jobValidation.validateJobFormData` rather than a second set
 * of regexes written inline. The old form had its own -- looser on dates and
 * LinkedIn URLs, stricter on nothing -- so a row the form accepted could still
 * be rejected by the service that saved it.
 *
 * Currency is a prop, not a lookup. There is no service that reads the stored
 * `user_preferences` row yet; the page passes `resolveDefaultCurrency(null)`
 * and this prop is the seam that reading gets plugged into. Editing an
 * existing job ignores the prop entirely and shows the currency the figures
 * were stored in -- re-defaulting a USD job to the account currency would
 * relabel a number without converting it.
 */
export interface ApplicationFormProps {
  defaultCurrency: SupportedCurrency
  job?: Job | null
  saving?: boolean
  onSubmit?: (data: JobFormData) => void | Promise<void>
  onCancel?: () => void
  onAutofill?: (url: string) => Promise<JobAutofillResult>
  autofilling?: boolean
}

export function ApplicationForm({
  defaultCurrency,
  job = null,
  saving = false,
  onSubmit,
  onCancel,
  onAutofill,
  autofilling = false,
}: ApplicationFormProps) {
  const [company, setCompany] = React.useState(job?.company ?? '')
  const [role, setRole] = React.useState(job?.role ?? '')
  const [salaryMin, setSalaryMin] = React.useState(job?.salary_min?.toString() ?? '')
  const [salaryMax, setSalaryMax] = React.useState(job?.salary_max?.toString() ?? '')
  const [currency, setCurrency] = React.useState<SupportedCurrency>(
    job && isSupportedCurrency(job.salary_currency)
      ? (job.salary_currency as SupportedCurrency)
      : defaultCurrency
  )
  const [url, setUrl] = React.useState(job?.url ?? '')
  const [status, setStatus] = React.useState<JobStatus>(job?.status ?? 'wishlist')
  const [dateApplied, setDateApplied] = React.useState(job?.date_applied ?? '')
  const [location, setLocation] = React.useState(job?.location ?? '')
  const [workMode, setWorkMode] = React.useState<WorkMode | ''>(job?.work_mode ?? '')
  const [source, setSource] = React.useState(job?.source ?? '')
  const [isReferral, setIsReferral] = React.useState(job?.is_referral ?? false)
  const [tagsInput, setTagsInput] = React.useState((job?.tags ?? []).join(', '))
  const [techInput, setTechInput] = React.useState((job?.tech_stack ?? []).join(', '))
  const [description, setDescription] = React.useState(job?.description ?? '')
  const [notes, setNotes] = React.useState(job?.notes ?? '')
  const [contactName, setContactName] = React.useState(job?.contact_name ?? '')
  const [contactEmail, setContactEmail] = React.useState(job?.contact_email ?? '')
  const [contactLinkedin, setContactLinkedin] = React.useState(job?.contact_linkedin ?? '')
  const [contactNotes, setContactNotes] = React.useState(job?.contact_notes ?? '')

  const [touched, setTouched] = React.useState<Record<string, boolean>>({})
  const [attempted, setAttempted] = React.useState(false)
  const [formError, setFormError] = React.useState('')
  const [autofillNote, setAutofillNote] = React.useState('')

  const toNumber = (value: string): number | null => {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  const payload: JobFormData = {
    company: company.trim(),
    role: role.trim(),
    salary_min: toNumber(salaryMin),
    salary_max: toNumber(salaryMax),
    salary_currency: currency,
    url: nullable(normalizePostingUrl(url)),
    description: nullable(description),
    status,
    date_applied: nullable(dateApplied),
    notes: nullable(notes),
    contact_name: nullable(contactName),
    contact_email: nullable(contactEmail),
    contact_linkedin: nullable(contactLinkedin),
    contact_notes: nullable(contactNotes),
    location: nullable(location),
    work_mode: workMode === '' ? null : workMode,
    source: nullable(source),
    is_referral: isReferral,
    tags: parseCommaList(tagsInput),
    tech_stack: parseCommaList(techInput),
  }

  const errors: Record<string, string> = {}
  for (const issue of jobValidation.validateJobFormData(payload)) {
    if (!errors[issue.field]) errors[issue.field] = issue.message
  }

  const errorFor = (field: string) =>
    attempted || touched[field] ? errors[field] : undefined

  const blur = (field: string) => () => setTouched((prev) => ({ ...prev, [field]: true }))

  const handleAutofill = async () => {
    if (!onAutofill) return
    const normalized = normalizePostingUrl(url)
    if (!/^https?:\/\/.+/i.test(normalized)) {
      setAutofillNote('Enter a job posting URL first.')
      return
    }
    try {
      const result = await onAutofill(normalized)
      const values = result.values
      // Only empty fields are filled. Silently overwriting something already
      // typed is how a scraped guess replaces a fact the user knew.
      if (!company.trim() && values.company) setCompany(values.company)
      if (!role.trim() && values.role) setRole(values.role)
      if (!location.trim() && values.location) setLocation(values.location)
      if (!source.trim() && values.source) setSource(values.source)
      if (!salaryMin.trim() && values.salary_min != null) setSalaryMin(String(values.salary_min))
      if (!salaryMax.trim() && values.salary_max != null) setSalaryMax(String(values.salary_max))
      setAutofillNote(
        result.warnings?.length
          ? `${result.warnings.join(' ')} Review every field before saving.`
          : 'Filled the empty fields only. Review every field before saving.'
      )
    } catch (err) {
      setAutofillNote(
        err instanceof Error ? err.message : 'Could not read that posting. Fill it in by hand.'
      )
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAttempted(true)
    setFormError('')
    if (Object.keys(errors).length > 0) return
    try {
      assertJobFormDataValid(payload)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'This application could not be saved.')
      return
    }
    void onSubmit?.(payload)
  }

  const submitLabel = job ? 'Save application' : 'Add application'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h2 className="text-heading-m text-text-primary">
        {job ? `Edit ${job.role} at ${job.company}` : 'New application'}
      </h2>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="company" label="Company" required>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onBlur={blur('company')}
            error={errorFor('company')}
            placeholder="Acme"
          />
        </Field>

        <Field id="role" label="Role" required>
          <Input
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onBlur={blur('role')}
            error={errorFor('role')}
            placeholder="Frontend Engineer"
          />
        </Field>

        <Field id="salary_min" label="Min salary">
          <Input
            id="salary_min"
            type="number"
            inputMode="numeric"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
            onBlur={blur('salary_min')}
            error={errorFor('salary_min')}
            placeholder="60000"
          />
        </Field>

        <Field id="salary_max" label="Max salary">
          <Input
            id="salary_max"
            type="number"
            inputMode="numeric"
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
            onBlur={blur('salary_max')}
            error={errorFor('salary_max')}
            placeholder="90000"
          />
        </Field>

        <Field
          id="salary_currency"
          label="Currency"
          hint="Figures are stored in this currency and never converted."
        >
          <Select
            id="salary_currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
            error={errorFor('salary_currency')}
          >
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="status" label="Status">
          <Select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as JobStatus)}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="date_applied" label="Date applied">
          <Input
            id="date_applied"
            type="date"
            value={dateApplied}
            onChange={(e) => setDateApplied(e.target.value)}
            onBlur={blur('date_applied')}
            error={errorFor('date_applied')}
          />
        </Field>

        <Field id="location" label="Location">
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onBlur={blur('location')}
            error={errorFor('location')}
            placeholder="Manila / Remote"
          />
        </Field>

        <Field id="work_mode" label="Work mode">
          <Select
            id="work_mode"
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value as WorkMode | '')}
          >
            <option value="">Not set</option>
            {WORK_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="source" label="Source">
          <Input
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onBlur={blur('source')}
            error={errorFor('source')}
            placeholder="LinkedIn"
          />
        </Field>

        <Field id="url" label="Posting URL" span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={blur('url')}
              error={errorFor('url')}
              placeholder="careers.acme.com/123"
            />
            {onAutofill && (
              <Button
                variant="secondary"
                onClick={handleAutofill}
                disabled={autofilling}
                className="shrink-0"
              >
                {autofilling && <Spinner size={14} />}
                {autofilling ? 'Reading' : 'Auto-fill'}
              </Button>
            )}
          </div>
          {autofillNote && <p className="text-body-s text-text-muted">{autofillNote}</p>}
        </Field>

        <Field id="tags" label="Tags">
          <Input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onBlur={blur('tags')}
            error={errorFor('tags')}
            placeholder="new-grad, fintech"
          />
        </Field>

        <Field id="tech_stack" label="Tech stack">
          <Input
            id="tech_stack"
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            onBlur={blur('tech_stack')}
            error={errorFor('tech_stack')}
            placeholder="react, postgres"
          />
        </Field>

        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            id="is_referral"
            type="checkbox"
            checked={isReferral}
            onChange={(e) => setIsReferral(e.target.checked)}
            className="h-4 w-4 rounded-none border-border-default accent-accent-default"
          />
          <label htmlFor="is_referral" className="text-body-m text-text-primary">
            Came through a referral
          </label>
        </div>

        <Field
          id="description"
          label="Job description"
          span
          hint="Pasted in full, this is what the ATS keyword match reads."
        >
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={blur('description')}
            error={errorFor('description')}
            className="min-h-32"
          />
        </Field>

        <Field id="notes" label="Notes" span>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={blur('notes')}
            error={errorFor('notes')}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-5 border-t border-border-subtle pt-6">
        <h3 className="text-label-caps uppercase text-text-secondary">Contact</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="contact_name" label="Name">
            <Input
              id="contact_name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              onBlur={blur('contact_name')}
              error={errorFor('contact_name')}
              placeholder="Recruiter or hiring manager"
            />
          </Field>

          <Field id="contact_email" label="Email">
            <Input
              id="contact_email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              onBlur={blur('contact_email')}
              error={errorFor('contact_email')}
              placeholder="name@acme.com"
            />
          </Field>

          <Field id="contact_linkedin" label="LinkedIn" span>
            <Input
              id="contact_linkedin"
              value={contactLinkedin}
              onChange={(e) => setContactLinkedin(e.target.value)}
              onBlur={blur('contact_linkedin')}
              error={errorFor('contact_linkedin')}
              placeholder="https://www.linkedin.com/in/..."
            />
          </Field>

          <Field id="contact_notes" label="Contact notes" span>
            <Textarea
              id="contact_notes"
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              onBlur={blur('contact_notes')}
              error={errorFor('contact_notes')}
            />
          </Field>
        </div>
      </div>

      {formError && (
        <p role="alert" className="text-body-s text-status-rejected-mark">
          {formError}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-border-subtle pt-6">
        <Button type="submit" disabled={saving}>
          {saving && <Spinner size={14} />}
          {saving ? 'Saving' : submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
