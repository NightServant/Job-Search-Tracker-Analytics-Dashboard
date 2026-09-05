'use client'

import * as React from 'react'
import { AppDialog } from '@/components/ui/app-dialog'
import { Button } from '@/components/ui/button'
import { StatusMarker, type Status } from '@/components/ui/status-marker'
import { PencilIcon, TrashIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
import { ApplicationForm } from '../ApplicationForm'
import { ApplicationRecord } from './ApplicationRecord'
import { EMPTY_RECORD_DATA, type ApplicationRecordData } from './recordData'
import type { SupportedCurrency } from '@/services/userPreferences'
import type { Job, JobAutofillResult, JobFormData } from '@/types'

/**
 * The desktop surface for one application: the whole record in a single
 * dialog that both shows and edits it.
 *
 * IT REPLACES `/applications/[id]` ON DESKTOP. That route was a second full
 * screen whose only way to change anything was an `edit` button that sent you
 * back to the list to open a form -- three navigations to fix a typo, and two
 * screens to keep in step. Here the record and its form are the same surface
 * in two modes, so `edit` is a mode switch rather than a journey.
 *
 * MODE IS OWNED BY THE CALLER, not by this component. The list opens an
 * existing row in `view` and the Add button opens a new one in `edit`, and
 * both need to survive the dialog closing and reopening -- state kept in here
 * would reset on unmount and quietly send Add to a view of nothing.
 *
 * A NEW APPLICATION HAS NO RECORD TO VIEW, so `job === null` is edit-only: no
 * mode toggle, no delete, no status marker, and none of the four secondary
 * panels, which would all be reads against an id that does not exist yet.
 */
export interface ApplicationRecordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` opens the form for a new application. */
  job: Job | null
  mode: 'view' | 'edit'
  onModeChange: (mode: 'view' | 'edit') => void
  data?: ApplicationRecordData
  defaultCurrency: SupportedCurrency
  saving?: boolean
  onSubmit: (data: JobFormData) => void | Promise<void>
  onCancelEdit: () => void
  onDelete?: (job: Job) => void
  onAutofill?: (url: string) => Promise<JobAutofillResult>
  autofilling?: boolean
  onDirtyChange?: (dirty: boolean) => void
}

export function ApplicationRecordDialog({
  open,
  onOpenChange,
  job,
  mode,
  onModeChange,
  data = EMPTY_RECORD_DATA,
  defaultCurrency,
  saving = false,
  onSubmit,
  onCancelEdit,
  onDelete,
  onAutofill,
  autofilling = false,
  onDirtyChange,
}: ApplicationRecordDialogProps) {
  const editing = job === null || mode === 'edit'

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      size={job ? 'xl' : 'l'}
      title={job ? job.role : 'New application'}
      icon="Briefcase"
      eyebrow={
        job ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-body-m text-text-secondary">{job.company}</span>
            <StatusMarker status={job.status as Status} className="w-24" />
          </div>
        ) : undefined
      }
      actions={
        job && !editing ? (
          <div className="flex items-center gap-2">
            <Button size="s" onClick={() => onModeChange('edit')}>
              <PencilIcon size={16} aria-hidden className={iconMotion('edit')} />
              edit
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="s"
                onClick={() => onDelete(job)}
                aria-label={`Delete ${job.role} at ${job.company}`}
              >
                <TrashIcon size={16} aria-hidden className={iconMotion('lid')} />
                delete
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div data-application-record={job ? 'view' : undefined} data-application-form>
        {editing ? (
          <ApplicationForm
            // Keyed so switching rows without closing the dialog rebuilds the
            // form against the new job rather than keeping the previous
            // row's typed values in the same mounted component.
            key={job?.id ?? 'new'}
            layout="dialog"
            defaultCurrency={defaultCurrency}
            job={job}
            saving={saving}
            onSubmit={onSubmit}
            onCancel={onCancelEdit}
            onAutofill={onAutofill}
            autofilling={autofilling}
            onDirtyChange={onDirtyChange}
          />
        ) : (
          job && <ApplicationRecord job={job} data={data} layout="dialog" />
        )}
      </div>
    </AppDialog>
  )
}
