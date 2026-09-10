'use client'

import * as React from 'react'
import { AppDialog } from '@/components/ui/app-dialog'
import { Button } from '@/components/ui/button'
import { CssSpinner } from '@/components/ui/css-spinner'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowRightIcon, ChevronLeftIcon, icons, type IconName } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
import { cn } from '@/lib/utils'
import { isSupportedCurrency } from '@/services/userPreferences'
import { ApplicationRecordView } from './ApplicationRecordView'
import { normalizePostingUrl, useRecordDraft, type RecordDraft } from './useRecordDraft'
import type { PostingDigestResult } from './digest'
import type { SupportedCurrency } from '@/services/userPreferences'
import type { JobAutofillResult, JobFormData, WorkMode } from '@/types'

/**
 * Adding an application, as four steps instead of a nineteen-field form.
 *
 * THE REVISION'S FLOW, in its order (item 5):
 *
 *   1. LINK      paste the posting's URL, with instructions that say why.
 *   2. STATUS    wishlist or applied; `applied` also asks WHEN and WHICH CV.
 *   3. FILL      the model reads the posting and fills the whole application.
 *   4. REVIEW    the two-column preview -- correct anything, then save.
 *
 * WHY A URL AND NOT A FORM. Everything after step 1 is derived from the
 * posting, so the only thing a person has to type is the thing only they know.
 * The old dialog opened on nineteen empty inputs and an Auto-fill button
 * halfway down that most people never reached.
 *
 * WHAT HAPPENS WHEN THE FETCH FAILS, which it will: several boards are
 * JavaScript-rendered or refuse datacenter traffic, and no amount of retrying
 * changes that. Step 3 does not become a dead end -- it says so and carries on
 * to the review step with whatever it got, where the description box takes a
 * paste and `tidy and summarise` does the rest of the work locally. Blocking
 * the whole flow on a fetch nobody controls would make the unreliable half the
 * required half.
 */
type StepId = 'link' | 'status' | 'fill' | 'review'

interface StepDef {
  id: StepId
  label: string
  description: string
  icon: IconName
}

const STEPS: StepDef[] = [
  { id: 'link', label: 'link', description: 'where the posting lives', icon: 'Link' },
  { id: 'status', label: 'status', description: 'saved or already sent', icon: 'Flag' },
  { id: 'fill', label: 'read', description: 'the model fills it in', icon: 'Documents' },
  { id: 'review', label: 'review', description: 'check it, then save', icon: 'Check' },
]

/**
 * The progress bar the revision asked for: a rule per step, in the accent once
 * the step is behind you, with its own icon and its own sentence.
 *
 * The accent is used here and NOT the status palette, which is the opposite of
 * `ApplicationPipeline` one screen over -- and deliberately. That bar tracks an
 * application through five named statuses, which have colours. This one tracks
 * a person through a form, which does not; the accent is what this system uses
 * for "you are here".
 */
function WizardProgress({ current }: { current: number }) {
  return (
    <ol
      className="grid gap-x-4 gap-y-4 sm:grid-flow-col sm:auto-cols-fr"
      data-add-progress={STEPS[current]?.id}
    >
      {STEPS.map((step, index) => {
        const Icon = icons[step.icon]
        const done = index <= current
        return (
          <li key={step.id} className="flex flex-col gap-2">
            <span
              aria-hidden
              className={cn('h-[2px] w-full', done ? 'bg-accent-default' : 'bg-border-subtle')}
            />
            <span className="flex items-center gap-2">
              <Icon
                size={16}
                aria-hidden
                className={cn('shrink-0', done ? 'text-text-primary' : 'text-text-muted')}
              />
              <span
                className={cn(
                  'text-label-caps uppercase',
                  index === current
                    ? 'text-text-primary'
                    : done
                      ? 'text-text-secondary'
                      : 'text-text-muted'
                )}
              >
                {step.label}
              </span>
              {index === current && <span className="sr-only">(current step)</span>}
            </span>
            <span className="text-body-s text-text-muted">{step.description}</span>
          </li>
        )
      })}
    </ol>
  )
}

export interface AddApplicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultCurrency: SupportedCurrency
  resumes?: { id: string; title: string }[]
  saving?: boolean
  /** Resolves `false` on a rejected save. See ApplicationRecordView. */
  onSubmit: (data: JobFormData) => void | boolean | Promise<void | boolean>
  onLinkedResumeChange?: (resumeId: string | null) => void
  onAutofill?: (url: string) => Promise<JobAutofillResult>
  autofilling?: boolean
  /**
   * Tidies and summarises the fetched posting.
   *
   * THE ONLY PLACE THE DIGEST RUNS NOW. The record's `tidy and summarise`
   * button is gone (Gabe, 2026-09-10: "the model auto-summarizes the job
   * description"), so this step is what that sentence refers to.
   */
  onDigest?: (text: string) => Promise<PostingDigestResult>
  onDirtyChange?: (dirty: boolean) => void
}

export function AddApplicationDialog({
  open,
  onOpenChange,
  defaultCurrency,
  resumes = [],
  saving = false,
  onSubmit,
  onLinkedResumeChange,
  onAutofill,
  autofilling = false,
  onDigest,
  onDirtyChange,
}: AddApplicationDialogProps) {
  const form = useRecordDraft(null, defaultCurrency, onDirtyChange)
  const { draft, set, replace, fillEmpty } = form

  const [step, setStep] = React.useState<StepId>('link')
  const [linkError, setLinkError] = React.useState('')
  const [readNote, setReadNote] = React.useState('')
  const [summary, setSummary] = React.useState('')
  const [resumeId, setResumeId] = React.useState('')

  const index = STEPS.findIndex((s) => s.id === step)

  // A fresh dialog every time it opens. Without this, cancelling halfway
  // through and pressing Add again resumes somebody else's half-filled draft.
  React.useEffect(() => {
    if (open) return
    setStep('link')
    setLinkError('')
    setReadNote('')
    setSummary('')
    setResumeId('')
    replace({ ...emptyDraft(defaultCurrency) })
    // `replace` is stable and `defaultCurrency` never changes mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const goRead = async () => {
    setStep('fill')
    setReadNote('')

    const url = normalizePostingUrl(draft.url)
    if (!onAutofill || !url) {
      setReadNote(
        onAutofill
          ? 'No link to read. Paste the posting into the description column and press “tidy and summarise”.'
          : 'Reading a posting is not available here. Fill the application in below.'
      )
      setStep('review')
      return
    }

    let description = ''
    try {
      const result = await onAutofill(url)
      const values = result.values
      const next: Partial<RecordDraft> = {}
      if (values.company) next.company = values.company
      if (values.role) next.role = values.role
      if (values.location) next.location = values.location
      if (values.source) next.source = values.source
      // Guarded against the union: this arrives from a remote page, and an
      // unrecognised string would put the select into a state no option
      // matches.
      if (values.work_mode && ['remote', 'hybrid', 'onsite'].includes(values.work_mode)) {
        next.workMode = values.work_mode as WorkMode
      }
      if (values.salary_min != null) next.salaryMin = String(values.salary_min)
      if (values.salary_max != null) next.salaryMax = String(values.salary_max)
      // THE CURRENCY TRAVELS WITH THE FIGURES. A peso range stored under the
      // account's default relabels a number without converting it.
      if (values.salary_currency && isSupportedCurrency(values.salary_currency)) {
        next.currency = values.salary_currency
      }
      if (values.description) {
        description = values.description
        next.description = values.description
      }
      if (values.tech_stack?.length) next.techStack = values.tech_stack.join(', ')
      if (values.tags?.length) next.tags = values.tags.join(', ')
      replace(next)
      setReadNote(
        result.warnings?.length
          ? `${result.warnings.join(' ')} Check every field before saving.`
          : 'Filled from the posting. Check every field before saving.'
      )
    } catch (err) {
      // "The next step" was wrong: this IS the next step. The description
      // column is to the right of the fields on a wide screen and under them
      // on a narrow one, which is what the copy has to say instead.
      setReadNote(
        `${err instanceof Error ? err.message : 'Could not read that posting.'} ` +
          'Paste the description into the column beside these fields and press “tidy and summarise”.'
      )
    }

    // TIDIED AND SUMMARISED IN THE SAME PASS, so the review step shows a
    // paragraph rather than eight hundred words. This is the auto-summarise
    // that replaced the `tidy and summarise` button (Gabe, 2026-09-10) -- it
    // is the only place the digest runs now, so it also has to apply the
    // fields the digest mines out of the posting.
    //
    // Its own try/catch: a failed summary must not throw away a description
    // the fetch did recover.
    if (onDigest && description.trim()) {
      try {
        const digest = await onDigest(description)
        replace({ description: digest.formatted })
        setSummary(digest.summary)
        // EMPTY FIELDS ONLY, and through `fillEmpty` rather than a comparison
        // against `draft`: the auto-fill above has not landed in the closure
        // this is reading, so anything checked here would look empty and the
        // digest would overwrite what the extractor just found.
        const mined = digest.fields
        fillEmpty({
          company: mined.company ?? undefined,
          role: mined.role ?? undefined,
          location: mined.location ?? undefined,
          salaryMin: mined.salary_min == null ? undefined : String(mined.salary_min),
          salaryMax: mined.salary_max == null ? undefined : String(mined.salary_max),
          techStack: mined.tech_stack?.length ? mined.tech_stack.join(', ') : undefined,
          // Guarded against the union and the supported set: both arrive from
          // a remote page, and an unrecognised value would put a select into a
          // state no option matches, or fail a CHECK at the insert.
          workMode:
            mined.work_mode && ['remote', 'hybrid', 'onsite'].includes(mined.work_mode)
              ? (mined.work_mode as WorkMode)
              : undefined,
          currency:
            mined.salary_currency && isSupportedCurrency(mined.salary_currency)
              ? mined.salary_currency
              : undefined,
        })
      } catch {
        // The untidied description is still the right thing to keep.
      }
    }

    setStep('review')
  }

  const stepBody = () => {
    switch (step) {
      case 'link':
        return (
          <div className="flex max-w-xl flex-col gap-5">
            <p className="text-body-m text-text-secondary">
              Paste the address of the job posting. Worktrack reads the page and fills the
              application in for you — company, role, salary, location and the description
              itself. You check it before anything is saved.
            </p>
            <Field
              id="posting-url"
              label="job posting URL"
              hint="the page you would send someone if they asked what you applied for."
            >
              <Input
                id="posting-url"
                type="url"
                icon="Link"
                autoFocus
                value={draft.url}
                onChange={(e) => {
                  set('url', e.target.value)
                  setLinkError('')
                }}
                error={linkError || undefined}
                placeholder="https://careers.acme.com/123"
              />
            </Field>
            <p className="text-body-s text-text-muted">
              No link? Continue anyway — the next steps still work, and you can paste the
              description in on the review step.
            </p>
          </div>
        )

      case 'status':
        return (
          <div className="flex max-w-xl flex-col gap-5">
            <p className="text-body-m text-text-secondary">
              Have you sent this one yet, or are you keeping it on the list for now?
            </p>
            <Field id="add-status" label="status">
              <Select
                id="add-status"
                icon="Flag"
                value={draft.status}
                onValueChange={(next) => {
                  set('status', next as RecordDraft['status'])
                  // Choosing `wishlist` clears a date that would otherwise
                  // save an application date onto something never applied to.
                  if (next === 'wishlist') set('dateApplied', '')
                }}
                items={[
                  { value: 'wishlist', label: 'Wishlist — saved, not sent' },
                  { value: 'applied', label: 'Applied — already sent' },
                ]}
              />
            </Field>

            {/* ONLY WHEN IT IS APPLIED. A date picker and a CV chooser above a
                wishlist row are two questions with no answer. */}
            {draft.status === 'applied' && (
              <div className="flex flex-col gap-5 border-t border-border-subtle pt-5">
                <Field id="add-date" label="date applied">
                  <Input
                    id="add-date"
                    type="date"
                    value={draft.dateApplied}
                    onChange={(e) => set('dateApplied', e.target.value)}
                  />
                </Field>
                <Field
                  id="add-resume"
                  label="cv sent"
                  hint={
                    resumes.length
                      ? 'which CV went with this application.'
                      : 'no CVs yet — write one in Documents and it will appear here.'
                  }
                >
                  <Select
                    id="add-resume"
                    icon="Documents"
                    disabled={resumes.length === 0}
                    value={resumeId}
                    onValueChange={(next) => {
                      setResumeId(next)
                      onLinkedResumeChange?.(next || null)
                    }}
                    items={[
                      { value: '', label: resumes.length ? 'none' : 'no CVs yet' },
                      ...resumes.map((resume) => ({ value: resume.id, label: resume.title })),
                    ]}
                  />
                </Field>
              </div>
            )}
          </div>
        )

      case 'fill':
        return (
          <div
            className="flex min-h-48 flex-col items-start justify-center gap-3"
            data-add-loading
            role="status"
          >
            <CssSpinner size={20} />
            <p className="text-body-m text-text-primary">reading the posting</p>
            <p className="max-w-prose text-body-s text-text-muted">
              Fetching the page, pulling out the company, role, salary and location, then
              tidying the description into something worth reading. This takes a few seconds.
            </p>
          </div>
        )

      case 'review':
      default:
        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <p className="text-body-m text-text-primary">
                Does this look right? Correct anything that does not, then save.
              </p>
              {readNote && (
                <p className="text-body-s text-text-muted" data-add-note>
                  {readNote}
                </p>
              )}
            </div>
            <ApplicationRecordView
              job={null}
              layout="review"
              form={form}
              defaultCurrency={defaultCurrency}
              saving={saving}
              onSubmit={onSubmit}
              resumes={resumes}
              linkedResumeId={resumeId || null}
              onLinkedResumeChange={(next) => {
                setResumeId(next ?? '')
                onLinkedResumeChange?.(next)
              }}
              summary={summary}
              submitLabel="Save application"
              footer={
                <Button type="button" variant="ghost" onClick={() => setStep('status')}>
                  <ChevronLeftIcon size={16} aria-hidden className={iconMotion('back')} />
                  back
                </Button>
              }
            />
          </div>
        )
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size={step === 'review' ? 'xl' : 'l'}
      title="new application"
      icon="Briefcase"
      description="four steps, and the model does three of them."
    >
      <div className="flex flex-col gap-6">
        <WizardProgress current={index} />
        <Separator />
        {stepBody()}

        {/* The review step carries its own save-and-back row inside the record
            view, so this bar belongs to the first two steps only. */}
        {(step === 'link' || step === 'status') && (
          <div className="flex items-center gap-3 border-t border-border-subtle pt-5 max-sm:[&_button]:h-11 max-sm:[&_button]:flex-1">
            {step === 'link' ? (
              <Button
                onClick={() => {
                  const url = normalizePostingUrl(draft.url)
                  if (url && !/^https?:\/\/.+/i.test(url)) {
                    setLinkError('That does not look like a web address.')
                    return
                  }
                  set('url', url)
                  setStep('status')
                }}
              >
                continue
                <ArrowRightIcon size={16} aria-hidden className={iconMotion('forward')} />
              </Button>
            ) : (
              <>
                <Button onClick={() => void goRead()} disabled={autofilling}>
                  {autofilling ? <CssSpinner size={14} /> : null}
                  fill it in
                  <ArrowRightIcon size={16} aria-hidden className={iconMotion('forward')} />
                </Button>
                <Button variant="ghost" onClick={() => setStep('link')}>
                  <ChevronLeftIcon size={16} aria-hidden className={iconMotion('back')} />
                  back
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </AppDialog>
  )
}

/** A blank draft, for resetting between openings. Mirrors `draftFromJob(null)`. */
function emptyDraft(currency: SupportedCurrency): RecordDraft {
  return {
    company: '',
    role: '',
    status: 'wishlist',
    salaryMin: '',
    salaryMax: '',
    currency,
    location: '',
    workMode: '',
    source: '',
    dateApplied: '',
    url: '',
    tags: '',
    techStack: '',
    isReferral: false,
    description: '',
  }
}
