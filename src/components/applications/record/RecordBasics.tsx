'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { PlusIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
import { STATUSES } from '@/components/ui/status-marker'
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/services/userPreferences'
import type { JobStatus, WorkMode } from '@/types'
import type { DraftField, UseRecordDraftResult } from './useRecordDraft'

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

/**
 * The first column of the record: what this application IS.
 *
 * TWO RULES FROM THE REVISION, and they pull against each other:
 *
 *   "Do not display placeholder with NULL value (no input)."
 *   "Allow dropdowns to be accessible in the first column of the dialog."
 *
 * Read together they mean: show me what is filled in, let me change it here,
 * and stop printing twelve rows of `not set` / `none` / `no` at me. The old
 * read-only summary printed every field whether or not it held anything, and
 * a record with a salary and a location still rendered nine empty labels.
 *
 * So a field appears when it HAS a value, and every field that appears is its
 * own control -- typed in place, no edit mode, no second dialog. Company,
 * role and status are unconditional: the first two are the only required
 * columns on `jobs`, and status always has a value.
 *
 * THE EMPTY ONES ARE ONE CLICK AWAY, not gone. Hiding a field you have never
 * filled in is tidy; making it unreachable would mean an application saved
 * without a salary could never be given one. `add more details` reveals the
 * rest, and stays open for the life of the dialog.
 */
export interface RecordBasicsProps {
  form: UseRecordDraftResult
  /** Forces every field open. The add wizard's review step wants them all. */
  showAll?: boolean
}

export function RecordBasics({ form, showAll = false }: RecordBasicsProps) {
  const { draft, set, errorFor, blur } = form
  const [expanded, setExpanded] = React.useState(false)
  const open = expanded || showAll

  /** Which optional fields hold something. Drives what is on screen. */
  const filled: Record<string, boolean> = {
    salary: draft.salaryMin.trim() !== '' || draft.salaryMax.trim() !== '',
    location: draft.location.trim() !== '',
    workMode: draft.workMode !== '',
    source: draft.source.trim() !== '',
    dateApplied: draft.dateApplied.trim() !== '',
    url: draft.url.trim() !== '',
    tags: draft.tags.trim() !== '',
    techStack: draft.techStack.trim() !== '',
    isReferral: draft.isReferral,
  }

  const shows = (key: string) => open || filled[key]
  const hiddenCount = Object.keys(filled).filter((key) => !filled[key]).length

  const text = (
    field: Extract<DraftField, 'company' | 'role' | 'location' | 'source' | 'url' | 'tags' | 'techStack' | 'salaryMin' | 'salaryMax' | 'dateApplied' | 'interviewAt'>,
    props: {
      label: string
      id: string
      icon?: React.ComponentProps<typeof Input>['icon']
      type?: string
      placeholder?: string
      hint?: string
      required?: boolean
      inputMode?: React.ComponentProps<typeof Input>['inputMode']
    }
  ) => (
    <Field id={props.id} label={props.label} required={props.required} hint={props.hint}>
      <Input
        id={props.id}
        icon={props.icon}
        type={props.type}
        inputMode={props.inputMode}
        value={draft[field]}
        onChange={(e) => set(field, e.target.value)}
        onBlur={blur(props.id)}
        error={errorFor(props.id)}
        placeholder={props.placeholder}
      />
    </Field>
  )

  return (
    <div className="flex flex-col gap-5" data-record-basics>
      {text('company', { id: 'company', label: 'company', icon: 'Building', required: true, placeholder: 'acme' })}
      {text('role', { id: 'role', label: 'position', icon: 'UserRound', required: true, placeholder: 'frontend engineer' })}

      <Field id="status" label="status">
        <Select
          id="status"
          icon="Flag"
          value={draft.status}
          onValueChange={(next) => set('status', next as JobStatus)}
          items={STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))}
        />
      </Field>

      {/* THE INTERVIEW DATE APPEARS WITH THE STATUS THAT NEEDS IT (Gabe,
          2026-09-10). It is the one field here whose relevance is conditional
          on another field rather than on whether it is filled in: a wishlist
          entry has no interview to book, and an offer's interview has already
          happened.

          `datetime-local`, not `date`. An interview is a time on a day -- "the
          14th" is not something anyone can turn up to -- and this is what
          `events.starts_at` stores. The native control is used rather than a
          picker component for the reason the rest of this form uses native
          date inputs: it is the one the phone's own wheel opens.

          IT WRITES TO `events`, NOT TO `jobs` (see useRecordDraft's
          `interviewAt`), and only when it CHANGES -- so moving an application
          on to `offer` afterwards leaves the interview that happened sitting
          on the calendar rather than quietly deleting it. */}
      {draft.status === 'interviewing' &&
        text('interviewAt', {
          id: 'interview_at',
          label: 'interview',
          icon: 'Calendar',
          type: 'datetime-local',
          hint: 'goes on your calendar when you save.',
        })}

      {shows('salary') && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {text('salaryMin', { id: 'salary_min', label: 'min salary', icon: 'BankNote', type: 'number', inputMode: 'numeric', placeholder: '60000' })}
            {text('salaryMax', { id: 'salary_max', label: 'max salary', icon: 'BankNote', type: 'number', inputMode: 'numeric', placeholder: '90000' })}
          </div>
          <Field
            id="salary_currency"
            label="currency"
            hint="figures are stored in this currency and never converted."
          >
            <Select
              id="salary_currency"
              icon="Coins"
              value={draft.currency}
              onValueChange={(next) => set('currency', next as SupportedCurrency)}
              items={SUPPORTED_CURRENCIES.map((code) => ({ value: code, label: code }))}
            />
          </Field>
        </>
      )}

      {shows('location') &&
        text('location', { id: 'location', label: 'location', icon: 'MapPin', placeholder: 'manila / remote' })}

      {shows('workMode') && (
        <Field id="work_mode" label="work mode">
          <Select
            id="work_mode"
            icon="Monitor"
            value={draft.workMode}
            onValueChange={(next) => set('workMode', next as WorkMode | '')}
            items={[
              { value: '', label: 'not set' },
              ...WORK_MODES.map((mode) => ({ value: mode.value, label: mode.label })),
            ]}
          />
        </Field>
      )}

      {shows('dateApplied') &&
        text('dateApplied', { id: 'date_applied', label: 'date applied', type: 'date' })}

      {shows('source') && text('source', { id: 'source', label: 'source', icon: 'Globe', placeholder: 'LinkedIn' })}

      {shows('url') &&
        text('url', { id: 'url', label: 'posting url', icon: 'Link', type: 'url', placeholder: 'careers.acme.com/123' })}

      {shows('tags') &&
        text('tags', { id: 'tags', label: 'tags', icon: 'Tag', hint: 'separated by commas.', placeholder: 'new-grad, fintech' })}

      {shows('techStack') &&
        text('techStack', { id: 'tech_stack', label: 'tech stack', icon: 'Code', hint: 'separated by commas.', placeholder: 'react, postgres' })}

      {shows('isReferral') && (
        <div className="flex items-center gap-3">
          <Checkbox
            id="is_referral"
            checked={draft.isReferral}
            onCheckedChange={(checked) => set('isReferral', checked === true)}
          />
          <Label htmlFor="is_referral" className="text-body-m font-normal text-text-primary">
            came through a referral
          </Label>
        </div>
      )}

      {!open && hiddenCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="s"
          className="self-start px-0"
          onClick={() => setExpanded(true)}
        >
          <PlusIcon size={16} aria-hidden className={iconMotion('open')} />
          add more details
        </Button>
      )}
    </div>
  )
}
