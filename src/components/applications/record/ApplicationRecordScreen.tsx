'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StatusMarker, type Status } from '@/components/ui/status-marker'
import { buttonVariants } from '@/components/ui/button-variants'
import { ChevronLeftIcon, TrashIcon } from '@/components/icons'
import { ApplicationForm } from '../ApplicationForm'
import { ApplicationRecord } from './ApplicationRecord'
import { EMPTY_RECORD_DATA, type ApplicationRecordData } from './recordData'
import type { SupportedCurrency } from '@/services/userPreferences'
import type { Job, JobAutofillResult, JobFormData } from '@/types'

/**
 * The mobile surface for one application: a full-screen page, not the desktop
 * dialog made narrow.
 *
 * WHAT IS ACTUALLY DIFFERENT, rather than just smaller:
 *
 * - There is no modal. A dialog at 375px is a page with an overlay behind it
 *   and a close button where the back button should be, and it takes the
 *   hardware back gesture away from the one interaction a phone user reaches
 *   for first. This is a route, so back is back.
 * - The header is a stacked block with its own back control at a 44px target,
 *   in place of the dialog's title bar and its 24px close affordance.
 * - The actions are a full-width row under the header rather than a cluster
 *   opposite the title. Two thumb-width buttons, not two pointer-width ones.
 * - The record below runs in `page` layout: one column, in the section list's
 *   own order, with each field on a line of its own. The dialog's rail has
 *   nowhere to go at this width, so its panels rejoin the flow rather than
 *   being squeezed into a second column.
 * - Editing runs the same `ApplicationForm` in `page` layout, which drops to
 *   one column, grows every control to 44px, and sticks Save to the bottom of
 *   the viewport so a nineteen-field form does not hide its own submit.
 *
 * The information architecture, the fields, the validation and the actions
 * are the dialog's, unchanged -- one `ApplicationRecord` and one
 * `ApplicationForm` serve both, so there is no second edition of either to
 * drift.
 */
export interface ApplicationRecordScreenProps {
  job: Job
  data?: ApplicationRecordData
  mode: 'view' | 'edit'
  onModeChange: (mode: 'view' | 'edit') => void
  backHref: string
  defaultCurrency: SupportedCurrency
  saving?: boolean
  onSubmit: (data: JobFormData) => void | Promise<void>
  onDelete?: (job: Job) => void
  onAutofill?: (url: string) => Promise<JobAutofillResult>
  autofilling?: boolean
}

export function ApplicationRecordScreen({
  job,
  data = EMPTY_RECORD_DATA,
  mode,
  onModeChange,
  backHref,
  defaultCurrency,
  saving = false,
  onSubmit,
  onDelete,
  onAutofill,
  autofilling = false,
}: ApplicationRecordScreenProps) {
  const editing = mode === 'edit'

  return (
    <div className="flex flex-col gap-6" data-application-screen={mode}>
      <Link
        href={backHref}
        className={cnBack}
        aria-label="Back to applications"
      >
        <ChevronLeftIcon size={18} aria-hidden />
        applications
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-body-m text-text-secondary">{job.company}</span>
          <StatusMarker status={job.status as Status} className="w-24" />
        </div>
        <h1 className="text-heading-l text-text-primary">{job.role}</h1>
      </header>

      <Separator />

      {editing ? (
        <ApplicationForm
          key={job.id}
          layout="page"
          defaultCurrency={defaultCurrency}
          job={job}
          saving={saving}
          onSubmit={onSubmit}
          onCancel={() => onModeChange('view')}
          onAutofill={onAutofill}
          autofilling={autofilling}
        />
      ) : (
        <>
          {/*
            Full-width and 44px tall. The dialog's equivalent is a pair of
            small buttons beside the title; at this width the two primary
            things you can do to a record deserve the row, and a thumb
            deserves the target.
          */}
          <div className="flex items-center gap-3">
            <Button className="h-11 flex-1" onClick={() => onModeChange('edit')}>
              edit
            </Button>
            {onDelete && (
              <Button
                variant="secondary"
                className="h-11 flex-1"
                onClick={() => onDelete(job)}
                aria-label={`Delete ${job.role} at ${job.company}`}
              >
                <TrashIcon size={16} aria-hidden />
                delete
              </Button>
            )}
          </div>

          <ApplicationRecord job={job} data={data} layout="page" />
        </>
      )}
    </div>
  )
}

/**
 * A 44px target rather than a bare text link. `buttonVariants` is called once
 * at module scope because it is a pure function over strings and the classes
 * never change with props.
 */
const cnBack = `${buttonVariants({ variant: 'ghost', size: 's' })} h-11 w-fit -ml-3 gap-2`
