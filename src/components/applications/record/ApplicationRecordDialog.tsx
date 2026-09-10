'use client'

import * as React from 'react'
import { AppDialog } from '@/components/ui/app-dialog'
import { ApplicationRecordView } from './ApplicationRecordView'
import { EMPTY_RECORD_DATA, type ApplicationRecordData } from './recordData'
import type { SupportedCurrency } from '@/services/userPreferences'
import type { Job, JobFormData } from '@/types'

/**
 * One application, in a dialog: the record and its editor, which are now the
 * same thing.
 *
 * WHAT CHANGED, and why the header is nearly empty (Worktrack Revisions items
 * 2 and 3):
 *
 * - NO `edit` BUTTON. There is no read-only mode left to leave -- every field
 *   in the first two columns is a control. A button that switched between two
 *   renderings of the same data was a mode that existed only because the form
 *   used to live somewhere else.
 * - NO `delete` BUTTON. Delete is a row-level action and it is on the row, in
 *   the table, beside the row it destroys. Having it here as well meant the
 *   confirm dialog sat on top of a record of something that no longer existed.
 * - SAVE MOVED INSIDE, to the foot of the record. It is the only thing this
 *   dialog commits, and it belongs at the end of what it commits.
 *
 * A BOTTOM SHEET BELOW 640, which is `AppDialog`'s own behaviour and is why
 * the mobile surface is this dialog rather than a route now: the phone gets
 * the same record, anchored to the edge a thumb can reach.
 *
 * A NEW APPLICATION DOES NOT COME HERE. It goes through `AddApplicationDialog`,
 * which is four steps and a model, so `job` is never null.
 */
export interface ApplicationRecordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: Job | null
  data?: ApplicationRecordData
  defaultCurrency: SupportedCurrency
  saving?: boolean
  /** Resolves `false` on a rejected save. See ApplicationRecordView. */
  onSubmit: (data: JobFormData) => void | boolean | Promise<void | boolean>
  onDirtyChange?: (dirty: boolean) => void
  /** For the record's "CV submitted" field. */
  resumes?: { id: string; title: string }[]
  linkedResumeId?: string | null
  onLinkedResumeChange?: (resumeId: string | null) => void
}

export function ApplicationRecordDialog({
  open,
  onOpenChange,
  job,
  data = EMPTY_RECORD_DATA,
  defaultCurrency,
  saving = false,
  onSubmit,
  onDirtyChange,
  resumes,
  linkedResumeId,
  onLinkedResumeChange,
}: ApplicationRecordDialogProps) {
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      // THE HEADING NAMES THE SCREEN, NOT THE ROW (Gabe, 2026-09-10). It was
      // the job title, and above it an eyebrow repeating the company and the
      // status -- all three of which the first column carries as editable
      // fields a few lines below. So the widest type on the dialog was a
      // duplicate of a field, the eyebrow was a duplicate of two more, and
      // nothing on it said what the dialog actually was.
      //
      // Gabe removed the eyebrow on sight ("remove this header, its
      // unnecessary"), which is the right call for the same reason: a record
      // whose first column opens with COMPANY and POSITION does not need them
      // printed twice, and the status marker is a read-only copy of a dropdown
      // sitting under it.
      // The record keeps its own chrome still and scrolls only its columns.
      bodyScroll={false}
      title="application overview"
      icon="Briefcase"
      description="Everything Worktrack knows about this application, in one place. The bar below tracks how far it has got; the three columns hold what the job is, the posting itself, and how your CV reads against it. Anything in the first two columns can be changed here — edit what you need and press Save application."
    >
      {job && (
        <ApplicationRecordView
          // Keyed so switching rows without closing the dialog rebuilds the
          // draft against the new job rather than keeping the previous row's
          // typed values in the same mounted component.
          key={job.id}
          job={job}
          data={data}
          defaultCurrency={defaultCurrency}
          saving={saving}
          onSubmit={onSubmit}
          onDirtyChange={onDirtyChange}
          resumes={resumes}
          linkedResumeId={linkedResumeId}
          onLinkedResumeChange={onLinkedResumeChange}
        />
      )}
    </AppDialog>
  )
}
