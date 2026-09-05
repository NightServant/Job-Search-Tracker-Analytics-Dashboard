'use client'

import * as React from 'react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StatusMarker, type Status } from '@/components/ui/status-marker'
import { PencilIcon, TrashIcon } from '@/components/icons'
import { iconMotion } from '@/components/icons/motion'
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
 * - The header opens with a BREADCRUMB rather than a bare back arrow. It was
 *   a "< applications" link, which says where you would end up but not where
 *   you are; the trail says both, and it is the same component the document
 *   editor uses -- this route was the one nested screen in the app without
 *   one. `Breadcrumb` grows its ancestor crumbs to 44px on a coarse pointer,
 *   so the target the back arrow had is not lost with it.
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
      {/*
        The leaf repeats the <h1> below it, and that is what a breadcrumb leaf
        is: the trail is only readable as a path if it ends where you are.
      */}
      <Breadcrumb
        className="-ml-0.5"
        items={[{ label: 'applications', href: backHref }, { label: job.role }]}
      />

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
              <PencilIcon size={16} aria-hidden className={iconMotion('edit')} />
              edit
            </Button>
            {onDelete && (
              <Button
                variant="secondary"
                className="h-11 flex-1"
                onClick={() => onDelete(job)}
                aria-label={`Delete ${job.role} at ${job.company}`}
              >
                <TrashIcon size={16} aria-hidden className={iconMotion('lid')} />
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
