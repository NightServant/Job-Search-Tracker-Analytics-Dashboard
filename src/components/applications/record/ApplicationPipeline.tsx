import * as React from 'react'
import { icons, type IconName } from '@/components/icons'
import { STATUS_MARK_CLASSES, type Status } from '@/components/ui/status-marker'
import { cn } from '@/lib/utils'
import type { JobStatusHistoryEntry } from '@/types'

/**
 * Where this application has got to, along the top of its record.
 *
 * THE DEFAULT RUN IS wishlist -> applied -> interviewing -> offer, and a
 * REJECTION REPLACES THE TAIL rather than becoming a fifth rung:
 *
 *   wishlist -> applied -> rejected
 *   wishlist -> applied -> interviewing -> rejected
 *
 * Which of those two a rejected application gets is a FACT, not a guess.
 * `job_status_history` records every transition, so an application that
 * actually sat at `interviewing` before the rejection shows that stage and one
 * that never did does not. With no history rows at all -- a row imported from
 * CSV, or one that predates history capture -- the shorter run is used, which
 * is the reading that claims less.
 *
 * Each step carries an icon and a sentence, because "interviewing" as a bare
 * word is a status and this bar is meant to explain a process. The sentence is
 * about the STAGE, not about this row's dates; the dates live in the record
 * below and repeating them here would be two sources for one fact.
 *
 * The vocabulary is the system's: a 2px rule in the status colour under a
 * label, the same shape `StatusMarker` uses. Nothing here is a pill, nothing
 * is filled, and the accent is never used to mean status.
 */
interface Step {
  status: Status
  label: string
  description: string
  icon: IconName
}

const STEPS: Record<Status, Step> = {
  wishlist: {
    status: 'wishlist',
    label: 'wishlist',
    description: 'saved, not sent yet',
    icon: 'Tag',
  },
  applied: {
    status: 'applied',
    label: 'applied',
    description: 'application is in',
    icon: 'Upload',
  },
  interviewing: {
    status: 'interviewing',
    label: 'interviewing',
    description: 'talking to the team',
    icon: 'UserRound',
  },
  offer: {
    status: 'offer',
    label: 'offer',
    description: 'they made an offer',
    icon: 'CircleCheck',
  },
  rejected: {
    status: 'rejected',
    label: 'rejected',
    description: 'this one ended here',
    icon: 'Close',
  },
}

const RUN: Status[] = ['wishlist', 'applied', 'interviewing', 'offer']

/** True when the history proves this application ever sat at `interviewing`. */
function everInterviewed(history: JobStatusHistoryEntry[]): boolean {
  return history.some((entry) => entry.to_status === 'interviewing')
}

export function pipelineFor(status: Status, history: JobStatusHistoryEntry[]): Status[] {
  if (status !== 'rejected') return RUN
  return everInterviewed(history)
    ? ['wishlist', 'applied', 'interviewing', 'rejected']
    : ['wishlist', 'applied', 'rejected']
}

export interface ApplicationPipelineProps {
  status: Status
  history?: JobStatusHistoryEntry[]
  className?: string
}

export function ApplicationPipeline({
  status,
  history = [],
  className,
}: ApplicationPipelineProps) {
  const run = pipelineFor(status, history)
  const current = run.indexOf(status)

  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      data-application-pipeline={status}
      aria-label="Application progress"
    >
      {/* MORE ROOM, so the step you are AT is findable at a glance (Gabe,
          2026-09-10). Four evenly-weighted blocks 16px apart read as a legend;
          32px apart, with the current one carrying the only 3px rule, they
          read as a progress bar with a position on it. */}
      <ol className="grid gap-x-8 gap-y-6 sm:grid-flow-col sm:auto-cols-fr">
        {run.map((step, index) => {
          const { label, description, icon } = STEPS[step]
          const Icon = icons[icon]
          // REACHED, not "is". A record at `offer` has been through applied and
          // interviewing, and a bar that showed only the current stage would
          // be a label with extra steps drawn round it.
          const reached = index <= current
          const isCurrent = index === current
          return (
            <li
              key={step}
              className="flex flex-col gap-2.5"
              data-step={step}
              data-reached={reached}
              data-current={isCurrent || undefined}
            >
              {/*
                THREE WEIGHTS, ONE VOCABULARY. The rule is the only thing this
                system uses to carry a status, so the hierarchy is built out of
                the rule rather than out of a fill or a pill:

                  3px, in the status colour  -- you are here
                  2px, in the status colour  -- been through it
                  1px, border-subtle         -- not yet

                Before this every reached step drew the same 2px, so "where is
                this application up to" was answerable only by reading the type
                weights, which is not what a progress bar is for.
              */}
              <span
                aria-hidden
                className={cn(
                  'w-full',
                  isCurrent ? 'h-[3px]' : reached ? 'h-[2px]' : 'h-px',
                  reached ? STATUS_MARK_CLASSES[step] : 'bg-border-subtle'
                )}
              />
              <span className="flex items-center gap-2">
                <Icon
                  size={16}
                  aria-hidden
                  className={cn('shrink-0', reached ? 'text-text-primary' : 'text-text-muted')}
                />
                <span
                  className={cn(
                    'text-label-caps uppercase',
                    // The stage you are AT is the one the eye should land on;
                    // the ones behind it are context and the ones ahead have
                    // not happened. Three weights, one line of type.
                    isCurrent
                      ? 'text-text-primary'
                      : reached
                        ? 'text-text-secondary'
                        : 'text-text-muted'
                  )}
                >
                  {label}
                </span>
                {isCurrent && <span className="sr-only">(current stage)</span>}
              </span>
              <span className="text-body-s text-text-muted">{description}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
