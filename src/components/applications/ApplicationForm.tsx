'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PanelSection } from '@/components/ui/panel-section'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CssSpinner } from '@/components/ui/css-spinner'
import { STATUSES } from '@/components/ui/status-marker'
import { cn } from '@/lib/utils'
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
  /**
   * Reports whether the typed payload has diverged from what the form
   * mounted with, so the dialog around it (Task 4, M5.5) can gate the
   * dismiss paths a modal adds -- Escape, an overlay click, the header close
   * button -- that the old inline section never had. Compared against a
   * snapshot taken once on mount, not against `touched`, so reverting a
   * field back to its original value clears the flag again.
   */
  onDirtyChange?: (dirty: boolean) => void
  /**
   * Which surface is rendering it. `dialog` pairs the short fields into two
   * columns; `page` keeps one column at every width and grows the controls to
   * a 44px touch target, because the mobile record page is reached with a
   * thumb and 40px is the height a pointer needs, not a finger.
   */
  layout?: 'dialog' | 'page'
}

export function ApplicationForm({
  defaultCurrency,
  job = null,
  saving = false,
  onSubmit,
  onCancel,
  onAutofill,
  autofilling = false,
  onDirtyChange,
  layout = 'dialog',
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

  const initialPayloadRef = React.useRef<JobFormData | null>(null)
  if (initialPayloadRef.current === null) initialPayloadRef.current = payload
  const isDirty = JSON.stringify(payload) !== JSON.stringify(initialPayloadRef.current)

  React.useEffect(() => {
    onDirtyChange?.(isDirty)
    // Only isDirty needs to re-fire this -- onDirtyChange is a fresh closure
    // on every parent render and including it would report on every keystroke
    // regardless of whether dirtiness actually changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty])

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

  // Two columns on the dialog, one on the page. `cols` is applied per group
  // rather than to one grid wrapping everything, which is what lets a group
  // like tags-and-tech-stack pair its two fields while the group above it
  // runs eight.
  const cols = layout === 'dialog' ? 'sm:grid-cols-2' : undefined

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex flex-col gap-8',
        // A 44px touch target on the page surface, applied at the wrapper
        // rather than threaded through nineteen className props. The same
        // arbitrary-variant technique `ApplicationsTable` uses on its header
        // cells; the alternative is a `size` prop on Input, Select and
        // Textarea for the sake of one caller.
        layout === 'page' && '[&_input:not([type=checkbox])]:h-11 [&_select]:h-11'
      )}
    >
      {/*
        Section 2. Company and role lead it because they are the only two
        required fields on the record, and a form whose required fields are
        buried is a form people fail at the last step.

        The group headings are `PanelSection`, the same component the
        read-only record uses for its panels -- so switching a record from
        viewing to editing changes the controls and not the typography. Two
        different heading treatments for the same eleven sections is how the
        two modes start to look like two screens.
      */}
      <PanelSection title="job information" icon="Briefcase" className="border-t-0 pt-0">
        <div className={cn('grid gap-5', cols)}>
          <Field id="company" label="company" required>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onBlur={blur('company')}
              error={errorFor('company')}
              autoComplete="organization"
              placeholder="acme"
            />
          </Field>

          <Field id="role" label="role" required>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onBlur={blur('role')}
              error={errorFor('role')}
              autoComplete="organization-title"
              placeholder="frontend engineer"
            />
          </Field>

          <Field id="salary_min" label="min salary">
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

          <Field id="salary_max" label="max salary">
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
            label="currency"
            hint="figures are stored in this currency and never converted."
          >
            <Select
              id="salary_currency"
              value={currency}
              onValueChange={(next) => setCurrency(next as SupportedCurrency)}
              error={errorFor('salary_currency')}
              items={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }))}
            />
          </Field>

          <Field id="status" label="status">
            <Select
              id="status"
              value={status}
              onValueChange={(next) => setStatus(next as JobStatus)}
              items={STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
            />
          </Field>

          <Field id="location" label="location">
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onBlur={blur('location')}
              error={errorFor('location')}
              autoComplete="address-level2"
              placeholder="manila / remote"
            />
          </Field>

          <Field id="work_mode" label="work mode">
            <Select
              id="work_mode"
              value={workMode}
              onValueChange={(next) => setWorkMode(next as WorkMode | '')}
              items={[
                { value: '', label: 'not set' },
                ...WORK_MODES.map((mode) => ({ value: mode.value, label: mode.label })),
              ]}
            />
          </Field>

          <Field id="source" label="source">
            <Input
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              onBlur={blur('source')}
              error={errorFor('source')}
              placeholder="LinkedIn"
            />
          </Field>
        </div>
      </PanelSection>

      {/* Section 3. Its own group because Auto-fill acts on this one field. */}
      <PanelSection title="posting url" icon="External">
        <Field id="url" label="posting URL">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={blur('url')}
              error={errorFor('url')}
              autoComplete="url"
              placeholder="careers.acme.com/123"
            />
            {onAutofill && (
              <Button
                variant="secondary"
                onClick={handleAutofill}
                disabled={autofilling}
                className="shrink-0"
              >
                {autofilling && <CssSpinner size={14} />}
                {autofilling ? 'Reading' : 'Auto-fill'}
              </Button>
            )}
          </div>
          {autofillNote && <p className="text-body-s text-text-muted">{autofillNote}</p>}
        </Field>
      </PanelSection>

      {/* Section 4. One comma-separated input each, never a chip editor: the
          value is a list the user types in one go, and splitting it into an
          add-a-tag control would be three interactions for what is one. */}
      <PanelSection title="tags and tech stack" icon="Applications">
        <div className={cn('grid gap-5', cols)}>
          <Field id="tags" label="tags" hint="separated by commas.">
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onBlur={blur('tags')}
              error={errorFor('tags')}
              placeholder="new-grad, fintech"
            />
          </Field>

          <Field id="tech_stack" label="tech stack" hint="separated by commas.">
            <Input
              id="tech_stack"
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onBlur={blur('tech_stack')}
              error={errorFor('tech_stack')}
              placeholder="react, postgres"
            />
          </Field>
        </div>
      </PanelSection>

      {/* Section 5. shadcn's Checkbox rather than the bare `<input>` this
          used to be -- it inherits the accent through `--color-primary` and
          the system border through `--color-input`, and it carries the focus
          ring the raw input never had. */}
      <PanelSection title="referral" icon="UserRound">
        <div className="flex items-center gap-3">
          <Checkbox
            id="is_referral"
            checked={isReferral}
            onCheckedChange={(checked) => setIsReferral(checked === true)}
          />
          <Label htmlFor="is_referral" className="text-body-m font-normal text-text-primary">
            came through a referral
          </Label>
        </div>
      </PanelSection>

      {/* Section 6. */}
      <PanelSection title="date applied" icon="Calendar">
        <div className={cn('grid gap-5', cols)}>
          <Field id="date_applied" label="date applied">
            <Input
              id="date_applied"
              type="date"
              value={dateApplied}
              onChange={(e) => setDateApplied(e.target.value)}
              onBlur={blur('date_applied')}
              error={errorFor('date_applied')}
            />
          </Field>
        </div>
      </PanelSection>

      {/* Sections 7 and 11. Both are long text, and both got taller: a
          pasted job description is hundreds of words and editing it through a
          six-line window means scrolling a box inside a scrolling dialog.
          Both keep `resize-y` from Textarea, so the height here is a floor
          and not a cap. */}
      <PanelSection title="job description" icon="Documents">
        <Field
          id="description"
          label="job description"
          hint="pasted in full, this is what the ATS keyword match reads."
        >
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={blur('description')}
            error={errorFor('description')}
            className="min-h-48"
          />
        </Field>
      </PanelSection>

      <PanelSection title="notes" icon="Info">
        <Field id="notes" label="notes">
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={blur('notes')}
            error={errorFor('notes')}
            className="min-h-32"
          />
        </Field>
      </PanelSection>

      <PanelSection title="contact" icon="Mail">
        <div className={cn('grid gap-5', cols)}>
          <Field id="contact_name" label="name">
            <Input
              id="contact_name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              onBlur={blur('contact_name')}
              error={errorFor('contact_name')}
              autoComplete="name"
              placeholder="recruiter or hiring manager"
            />
          </Field>

          <Field id="contact_email" label="email">
            <Input
              id="contact_email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              onBlur={blur('contact_email')}
              error={errorFor('contact_email')}
              autoComplete="email"
              placeholder="name@acme.com"
            />
          </Field>

          <Field id="contact_linkedin" label="LinkedIn" span={layout === 'dialog'}>
            <Input
              id="contact_linkedin"
              value={contactLinkedin}
              onChange={(e) => setContactLinkedin(e.target.value)}
              onBlur={blur('contact_linkedin')}
              error={errorFor('contact_linkedin')}
              placeholder="https://www.LinkedIn.com/in/..."
            />
          </Field>

          <Field id="contact_notes" label="contact notes" span={layout === 'dialog'}>
            <Textarea
              id="contact_notes"
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              onBlur={blur('contact_notes')}
              error={errorFor('contact_notes')}
            />
          </Field>
        </div>
      </PanelSection>

      {formError && (
        <p role="alert" className="text-body-s text-status-rejected-mark">
          {formError}
        </p>
      )}

      {/*
        The actions stay at the foot of the form on both surfaces. On the
        page they are sticky to the bottom of the viewport instead, so a
        nineteen-field form on a phone does not require scrolling to the end
        to find Save -- the one place the two layouts differ in more than
        column count.
      */}
      <div
        className={cn(
          'flex items-center gap-3 border-t border-border-subtle pt-6',
          layout === 'page' &&
            'sticky bottom-0 -mx-5 bg-bg-canvas px-5 pb-5 [&_button]:h-11 [&_button]:flex-1'
        )}
      >
        <Button type="submit" disabled={saving}>
          {saving && <CssSpinner size={14} />}
          {saving ? 'Saving' : submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            cancel
          </Button>
        )}
      </div>
    </form>
  )
}
