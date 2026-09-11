'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { CssSpinner } from '@/components/ui/css-spinner'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { BriefcaseIcon, CheckIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
import { assertJobFormDataValid } from '@/services/jobValidation'
import { fromLocalDateTimeInput, toLocalDateTimeInput } from '@/services/date'
import { cn } from '@/lib/utils'
import { ApplicationPipeline } from './ApplicationPipeline'
import { RecordAts } from './RecordAts'
import { RecordBasics } from './RecordBasics'
import { RecordDescription } from './RecordDescription'
import { useRecordDraft, type UseRecordDraftResult } from './useRecordDraft'
import { EMPTY_RECORD_DATA, type ApplicationRecordData } from './recordData'
import type { SupportedCurrency } from '@/services/userPreferences'
import type { Job, JobFormData } from '@/types'

/**
 * ONE APPLICATION, ONE SURFACE. It shows the record and it edits the record;
 * there is no view mode and no edit mode, and the separate edit dialog that
 * used to hold the other half is gone (Gabe, Worktrack Revisions items 2-4).
 *
 * THE THREE COLUMNS ARE THE REVISION'S, in its order:
 *
 *   1. what the application IS -- editable in place, dropdowns included,
 *      and empty fields kept off the screen. See RecordBasics.
 *   2. the posting -- summarised by the model, editable by hand, because a
 *      scraped description runs to eight hundred words.
 *   3. the ATS match -- read-only, and the fullest version of it in the app.
 *
 * THE COLUMNS ARE A CONTAINER QUERY, NOT A VIEWPORT ONE, and that distinction
 * is load-bearing: this record renders inside a dialog capped at 1040px on a
 * 1920px screen, and inside a bottom sheet on a phone. A viewport `xl:` would
 * have split a 976px dialog into three columns on the same screens where it
 * looks roomiest and left them at 280px each -- one of them a textarea holding
 * a job posting. The same mechanism `ui/ats-donut` and `ui/card` already use.
 *
 * THE PIPELINE BAR IS ON TOP because the first question anyone opens a record
 * to answer is "where is this one up to", and it is the only thing here that
 * cannot be read off a single field.
 *
 * SAVE LIVES AT THE FOOT OF THIS DIALOG (revision item 2). The header's edit
 * and delete buttons are gone with it -- editing is what this surface does,
 * and delete is on the row in the table where the rest of the row-level
 * actions are.
 */
export interface ApplicationRecordViewProps {
  job: Job | null
  data?: ApplicationRecordData
  defaultCurrency: SupportedCurrency
  saving?: boolean
  /**
   * Resolves `false` when the save was rejected, anything else when it landed.
   *
   * The view needs the ANSWER, not just the call: a save that worked has to
   * move the draft's baseline, or the record stays permanently dirty against
   * the values it opened with and every Escape from then on asks whether to
   * discard changes that are already stored.
   */
  onSubmit: (
    data: JobFormData,
    /**
     * The interview, as an instant to store — `undefined` when the field was
     * not touched, `null` when it was cleared.
     *
     * THREE STATES, NOT TWO, and the distinction is what stops this being
     * destructive. It rides beside the payload rather than inside it because
     * an interview is a row in `events`, not a column on `jobs` — the same
     * seam `resumeId` already runs through. `undefined` is the common case:
     * somebody fixing a salary must not have their calendar rewritten as a
     * side effect, and moving an application on to `offer` must not delete
     * the interview that got them there.
     */
    interviewAt?: string | null
  ) => void | boolean | Promise<void | boolean>
  onDirtyChange?: (dirty: boolean) => void
  /** The CVs available to the "CV submitted" field. */
  resumes?: { id: string; title: string }[]
  linkedResumeId?: string | null
  onLinkedResumeChange?: (resumeId: string | null) => void
  /** Set by the add wizard: every field open, and no pipeline bar to read yet. */
  layout?: 'record' | 'review'
  /**
   * The summary the add flow's digest produced.
   *
   * It arrives from upstream because that is the only place it is made: there
   * is no `tidy and summarise` button any more (Gabe, 2026-09-10) and `jobs`
   * has no column to store one in, so a record opened later shows the posting
   * without it.
   */
  summary?: string
  /** Overrides the footer's label. The wizard saves a NEW application. */
  submitLabel?: string
  /** Lets the wizard drive the same draft it filled in. */
  form?: UseRecordDraftResult
  footer?: React.ReactNode
}

export function ApplicationRecordView({
  job,
  data = EMPTY_RECORD_DATA,
  defaultCurrency,
  saving = false,
  onSubmit,
  onDirtyChange,
  resumes = [],
  linkedResumeId = null,
  onLinkedResumeChange,
  layout = 'record',
  summary,
  submitLabel,
  form: providedForm,
  footer,
}: ApplicationRecordViewProps) {
  // The wizard owns a draft across four steps and hands it in; the dialog has
  // no step before this one, so it makes its own. Hooks are unconditional
  // either way -- the provided one simply wins.
  // What is already on the calendar, in the shape the control wants. The
  // record seeds from it and compares against it; see `handleSubmit`.
  const interviewSeed = data.interview ? toLocalDateTimeInput(data.interview.starts_at) : ''
  const ownForm = useRecordDraft(job, defaultCurrency, onDirtyChange, interviewSeed)
  const form = providedForm ?? ownForm
  const { draft, set, payload, errors, attempt, commit, dirty } = form

  /**
   * NOTHING TO SAVE IS NOT A THING TO OFFER (Gabe, 2026-09-10).
   *
   * On the RECORD only. The wizard's review step reaches Save with a draft
   * that may be entirely model-filled and therefore "clean" against its own
   * empty baseline -- disabling it there would make a fetched application
   * unsavable, which is the one path the whole four-step flow exists for.
   *
   * `dirty` compares the payload against the values the record opened with, so
   * typing a character and deleting it again correctly leaves this disabled --
   * and a successful save re-baselines, which is what stops the button coming
   * back to life over values that are already stored.
   */
  const nothingToSave = layout === 'record' && !dirty

  const [resumeId, setResumeId] = React.useState(linkedResumeId ?? '')
  React.useEffect(() => setResumeId(linkedResumeId ?? ''), [linkedResumeId])

  const [formError, setFormError] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    attempt()
    setFormError('')
    if (Object.keys(errors).length > 0) return
    try {
      assertJobFormDataValid(payload)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'This application could not be saved.')
      return
    }
    // UNCHANGED MEANS UNTOUCHED. Only a real edit to the field reaches the
    // events table, so an ordinary save costs no event write at all.
    const interviewAt =
      draft.interviewAt === interviewSeed ? undefined : fromLocalDateTimeInput(draft.interviewAt)
    const ok = await onSubmit(payload, interviewAt)
    // A REJECTED SAVE STAYS DIRTY, which is the point: the values are still
    // only in this dialog, so closing it must still ask before dropping them.
    if (ok !== false) commit()
  }

  return (
    // The container the grid queries. Declared on the OUTER element: an
    // element cannot query its own container, so putting `@container/record`
    // and `@4xl/record:` on one div would resolve against some ancestor
    // instead -- silently, and looking right in whichever layout happened to
    // match.
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className={cn(
        '@container/record flex flex-col gap-3',
        // THE RECORD IS A FIXED FRAME, from `sm` up. The dialog hands
        // scrolling to this form (`bodyScroll={false}`), which passes it on to
        // the grid below -- so the pipeline and the Save row hold their place
        // and only the columns move. `min-h-0` is what lets a flex child
        // shrink below its content; without it the grid never becomes
        // scrollable and the whole dialog grows instead.
        //
        // Below 640 none of it applies: the sheet stacks, the pipeline is a
        // 299px column, and freezing that as chrome leaves a phone nothing to
        // read in. There the whole record flows and the body scrolls it.
        layout === 'record' && 'sm:min-h-0 sm:flex-1'
      )}
      data-application-record
    >
      {/* CHROME, not a passenger. It used to be `position: sticky` inside a
          scrolling record, which worked and brought two defects with it: at
          `z-10` it tied with `Input`'s absolutely-positioned leading glyphs
          (input.tsx) and the field icons painted straight through it, and
          below 640 the steps stack into a 299px column that pinning made
          taller than the record it headed.

          Making the grid the scrollport removes the whole class of problem
          rather than patching it -- there is nothing to pin, nothing to
          out-rank, and nothing passes underneath at any width. Gabe's call
          (2026-09-10): "the problem should start at the three column layout".

          `-mb-3` cancels the form's gap so the grid begins ON this block's
          bottom border, which is what the three column rules hang from.
          `py-5` is the padding he asked to keep here and only here, widened
          from 12 to 20 on 2026-09-10: the bar is a band of four labelled steps
          rather than a line of text, and it is the one thing on this dialog
          that has to be readable at a glance. */}
      {layout === 'record' && (
        <ApplicationPipeline
          status={draft.status}
          history={data.history}
          className="-mx-gutter -mb-3 shrink-0 border-b border-border-subtle px-gutter py-5"
        />
      )}

      {/* `gap-x-6` and a matching `pl-6` on the columns, down from 40 and 40
          (Gabe: "reduce the margin for both job description and ATS match. It
          is not centered properly"). Eighty pixels between one column's text
          and the next reads as three panels that happen to share a dialog; at
          24 either side of the rule they read as one record in columns, and
          the rule is genuinely centred in the space rather than merely near
          the middle of it.

          The rule above the columns is the sticky pipeline's own `border-b`,
          not a border here: it has to travel with the bar, or scrolling would
          leave the verticals hanging off nothing. */}
      <div
        className={cn(
          'grid gap-8 @4xl/record:gap-x-6 @4xl/record:gap-y-8',
          // THE ONLY THING THAT SCROLLS, from `sm` up. Bled to the dialog's
          // edges so its scrollbar sits where the body's used to, and
          // `min-h-0` for the same reason as on the form.
          layout === 'record' &&
            '-mx-gutter px-gutter sm:min-h-0 sm:flex-1 sm:overflow-y-auto',
          layout === 'review'
            ? '@2xl/record:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]'
            : '@4xl/record:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)_minmax(0,1fr)]'
        )}
      >
        {/* The top padding is on each COLUMN, never on the grid: on the grid
            it would push the columns clear of the pipeline's border and the
            vertical rules would stop short of it again. */}
        <div className={cn('flex flex-col gap-4', layout === 'record' && 'pt-6')}>
          {/* THE FIRST COLUMN HAD NO HEADING and the other two did, so the
              record read as a form with two panels bolted to it rather than as
              three columns of one thing. Same markup as `RecordDescription`
              and `RecordAts` down to the glyph size, because "looks like a
              heading" is not the same as "is the same heading".

              Only on the record: the wizard's review step is one form being
              checked before a save, not a record being read, and a column
              title there would be labelling a thing that has no siblings
              yet. */}
          {layout === 'record' && (
            <h3 className="flex items-center gap-2 text-heading-s text-text-primary">
              <BriefcaseIcon size={16} aria-hidden className="shrink-0 text-text-muted" />
              the application
            </h3>
          )}
          <RecordBasics form={form} showAll={layout === 'review'} />

          {/* WHICH CV WENT WITH IT sits with the basics because it is one of
              them, but it is not a column on `jobs` -- it lives in
              `application_documents`, keyed on a job id that does not exist
              yet when the wizard is creating one. So it leaves through its own
              callback rather than through `JobFormData`. */}
          <Field
            id="resume_id"
            label="cv submitted"
            hint={
              resumes.length
                ? 'which CV you sent for this application.'
                : 'no CVs yet — write one in Documents and it will appear here.'
            }
          >
            <Select
              id="resume_id"
              icon="Documents"
              disabled={resumes.length === 0}
              value={resumeId}
              onValueChange={(next) => {
                setResumeId(next)
                // '' is "none", and it has to reach the caller as null: that
                // is the difference between "no CV" and "leave the link
                // alone", and only the former unpins.
                onLinkedResumeChange?.(next || null)
              }}
              items={[
                { value: '', label: resumes.length ? 'none' : 'no CVs yet' },
                ...resumes.map((resume) => ({ value: resume.id, label: resume.title })),
              ]}
            />
          </Field>
        </div>

        {/* The hairline between columns, and only where there IS a column
            boundary -- below the breakpoint these are stacked and a left
            border would be a rule down the side of the page. */}
        <RecordDescription
          className={cn(
            layout === 'record' && 'pt-6',
            layout === 'review'
              ? '@2xl/record:border-l @2xl/record:border-border-subtle @2xl/record:pl-6'
              : '@4xl/record:border-l @4xl/record:border-border-subtle @4xl/record:pl-6'
          )}
          value={draft.description}
          onChange={(next) => set('description', next)}
          url={draft.url || null}
          summary={summary}
        />

        {layout === 'record' && (
          <RecordAts
            className="pt-6 @4xl/record:border-l @4xl/record:border-border-subtle @4xl/record:pl-6"
            match={data.match}
            links={data.links}
            error={data.atsError}
          />
        )}
      </div>

      {formError && (
        <p role="alert" className="text-body-s text-status-rejected-mark">
          {formError}
        </p>
      )}

      {/* THE FRAME'S LAST ROW, not a sticky overlay. It was
          `sticky bottom-[-gutter]` because the whole record scrolled under it;
          with the grid owning the scroll it simply sits below the scrollport
          and never moves, which is the same result with none of the inset
          arithmetic. `-mx-gutter ... px-gutter pb-gutter` still bleeds it to
          the dialog's edges, and `-mb-gutter` gives the height back so the
          body does not grow by a gutter. */}
      <div
        className={cn(
          // `-mt-3` cancels the form's gap so this bar's top border sits ON the
          // scrollport's bottom edge -- which is where the three column rules
          // end, so they meet it (Gabe, 2026-09-10: "bottom CTA bar separator
          // should also stick to the vertical separators"). At a 12px gap the
          // verticals stopped just short and the frame came apart at the foot
          // the same way it did at the head.
          //
          // `py-3`, down from 16 above and 33 below. The dialog body gives up
          // its bottom padding for this bar (see AppDialog's `bodyScroll`), so
          // what is left is the bar's own -- even on both sides, and on the
          // same 12px rhythm as every rule in this dialog.
          'z-20 -mx-gutter -mt-3 flex shrink-0 items-center gap-3 border-t border-border-subtle bg-bg-canvas px-gutter py-3',
          'max-sm:[&_button]:h-11 max-sm:[&_button]:flex-1'
        )}
      >
        {/* THE STATE, THEN THE ACTION. `Save application` used to sit alone on
            the leading edge and go grey with nothing to explain it -- a
            disabled primary with no adjacent reason reads as broken rather
            than as satisfied. Saying which of the two it is costs one line and
            turns the grey into an answer.

            `aria-live="polite"` because this is the only feedback a save
            gives: the dialog deliberately stays open (the row is derived from
            `jobs`, so the new values simply arrive), which means a screen
            reader would otherwise get silence where a sighted user gets a
            button greying out. */}
        {layout === 'record' && (
          <p
            aria-live="polite"
            data-record-save-state
            className="min-w-0 text-body-s text-text-muted max-sm:sr-only"
          >
            {saving ? 'saving…' : dirty ? 'unsaved changes' : 'everything is saved'}
          </p>
        )}

        {/* `ms-auto` on the record only. A dialog's primary action belongs on
            the trailing edge, where the eye finishes; the wizard's review step
            keeps its own arrangement, because there the save is the end of a
            four-step flow rather than one of the things this surface does. */}
        <Button
          type="submit"
          disabled={saving || nothingToSave}
          className={cn(layout === 'record' && 'ms-auto')}
        >
          {saving ? (
            <CssSpinner size={14} />
          ) : (
            <CheckIcon size={16} aria-hidden className={iconMotion('none')} />
          )}
          {saving ? 'Saving' : (submitLabel ?? 'Save application')}
        </Button>
        {footer}
      </div>
    </form>
  )
}
