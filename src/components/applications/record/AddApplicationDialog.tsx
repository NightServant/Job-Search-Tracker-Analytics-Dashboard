'use client'

import * as React from 'react'
import { AppDialog } from '@/components/ui/app-dialog'
import { Button } from '@/components/ui/button'
import { CssSpinner } from '@/components/ui/css-spinner'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowRightIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
import { ApplicationRecordView } from './ApplicationRecordView'
import { WizardProgress } from './wizardSteps'
import { STEPS, type StepId } from './wizardStepModel'
import { autofillPosting } from './autofillPosting'
import { draftFromJob, normalizePostingUrl, useRecordDraft, type RecordDraft } from './useRecordDraft'
import type { PostingDigestResult } from './digest'
import type { SupportedCurrency } from '@/services/userPreferences'
import type { JobAutofillResult, JobFormData } from '@/types'

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

export interface AddApplicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultCurrency: SupportedCurrency
  resumes?: { id: string; title: string }[]
  saving?: boolean
  /** Resolves `false` on a rejected save. See ApplicationRecordView. */
  /** `interviewAt` rides alongside, as in the record. See ApplicationRecordView. */
  onSubmit: (
    data: JobFormData,
    interviewAt?: string | null
  ) => void | boolean | Promise<void | boolean>
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
  /**
   * A posting address to open on, filled into the first step.
   *
   * IT SEEDS, IT DOES NOT SKIP. The calendar's job feed hands a URL over with
   * `track it`, and the temptation is to run the read immediately and drop the
   * reader on the review step. That would spend a scrape and a model call on a
   * link somebody may have clicked to look at rather than to track -- and it
   * would hide the one screen where a wrong link can still be corrected.
   */
  initialUrl?: string | null
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
  initialUrl = null,
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

  // A link handed in from elsewhere fills the first step. Only when the field
  // is still empty: a URL already typed is the one the person meant.
  React.useEffect(() => {
    if (!open || !initialUrl) return
    set('url', initialUrl)
    // Keyed on the incoming URL rather than on the draft, so re-rendering the
    // parent never overwrites what has since been typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialUrl])


  // The read step, as an explicit parameter object rather than a closure over
  // nine values. See autofillPosting for why the width is the honest shape.
  const goRead = () =>
    autofillPosting({
      draft,
      fillEmpty,
      replace,
      setStep,
      setReadNote,
      setSummary,
      onAutofill,
      onDigest,
    })

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
            {/* THE LINK IS REQUIRED NOW (Gabe, 2026-09-11). It used to be
                optional, with this paragraph inviting people past it -- and
                that invitation led straight to the one path this flow handles
                worst: three steps of a four-step wizard whose whole promise is
                "the model does three of them", with nothing for the model to
                read. Better to stop at the first step, where the fix is
                obvious, than at the third, where it is not. */}
            <p className="text-body-s text-text-muted">
              Everything after this step is built from the page at that address.
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
      headerSeparator={false}
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
              // DISABLED UNTIL THERE IS SOMETHING TO READ. `normalizePostingUrl`
              // completes a bare domain, so "acme.com/jobs/1" counts; only an
              // empty field is nothing. The shape is still checked on click,
              // because "looks like a URL" and "is non-empty" are different
              // questions and only the second one should gate a button --
              // disabling on the first would leave somebody mid-type staring
              // at a dead control.
              <Button
                disabled={!normalizePostingUrl(draft.url)}
                onClick={() => {
                  const url = normalizePostingUrl(draft.url)
                  if (!/^https?:\/\/.+/i.test(url)) {
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
              // NO `back` (Gabe, 2026-09-11: "it destroys the whole process of
              // creation"). Nothing is stranded by its removal: the review step
              // renders every field open, the posting URL among them, so a
              // mistyped link is still fixable -- one step further on rather
              // than one step back.
              <Button onClick={() => void goRead()} disabled={autofilling}>
                {autofilling ? <CssSpinner size={14} /> : null}
                fill it in
                <ArrowRightIcon size={16} aria-hidden className={iconMotion('forward')} />
              </Button>
            )}
          </div>
        )}
      </div>
    </AppDialog>
  )
}

/**
 * A blank draft, for resetting between openings.
 *
 * IT DELEGATES rather than restating the eighteen fields. This was a hand-kept
 * copy of `draftFromJob(null, currency)` and it had already drifted once --
 * `interviewAt` landed on `RecordDraft` and this literal did not know, which
 * the compiler caught only because the type is exhaustive. One definition of
 * "empty" is the point of `draftFromJob` taking a nullable job at all.
 */
function emptyDraft(currency: SupportedCurrency): RecordDraft {
  return draftFromJob(null, currency)
}
