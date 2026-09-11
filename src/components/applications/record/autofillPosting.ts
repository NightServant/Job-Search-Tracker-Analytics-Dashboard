'use client'

import { normalizePostingUrl, type RecordDraft } from './useRecordDraft'
import type { PostingDigestResult } from './digest'
import { isSupportedCurrency } from '@/services/userPreferences'
import type { JobAutofillResult, WorkMode } from '@/types'
import type { StepId } from './wizardStepModel'

/**
 * The wizard's read step: fetch the posting, fill what it can, move on.
 *
 * SPLIT OUT OF `AddApplicationDialog` ON 2026-09-11 (505 lines). It was a
 * 103-line async flow closing over nine values in the middle of a dialog, and
 * the only way to exercise it was to mount the whole wizard and drive it with
 * clicks. The nine are now a parameter object -- a wide signature, and that is
 * the honest shape: this step really does touch the draft, the step cursor,
 * two notes and two callbacks, and hiding that in a closure did not make it
 * fewer.
 *
 * IT NEVER BLOCKS ON THE FETCH. Extraction depends on a page nobody here
 * controls, so every failure path still advances to review with whatever it
 * got; the description box takes a paste and `tidy and summarise` does the
 * rest locally. Making the unreliable half the required half is how a wizard
 * strands somebody on step three.
 */

export interface AutofillPostingOptions {
  draft: RecordDraft
  /** Fills only the fields the user has not already typed into. */
  fillEmpty: (patch: Partial<RecordDraft>) => void
  /** Merges a patch over the draft, for fields extraction is authoritative on. */
  replace: (next: Partial<RecordDraft>) => void
  setStep: (step: StepId) => void
  setReadNote: (note: string) => void
  setSummary: (summary: string) => void
  onAutofill?: (url: string) => Promise<JobAutofillResult>
  onDigest?: (url: string) => Promise<PostingDigestResult>
}

export async function autofillPosting({
  draft,
  fillEmpty,
  replace,
  setStep,
  setReadNote,
  setSummary,
  onAutofill,
  onDigest,
}: AutofillPostingOptions): Promise<void> {
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
