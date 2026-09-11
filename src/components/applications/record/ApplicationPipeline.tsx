import * as React from 'react'
import { type IconName } from '@/components/icons'
import { type Status } from '@/components/ui/status-marker'
import { ProgressTrack, type ProgressTone } from '@/components/ui/progress-track'
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
 * THE SHAPE IS NOW `ui/progress-track`, shared with the add wizard and the
 * registration stepper (Gabe, 2026-09-11). Three screens drew three different
 * progress bars before that; this file is down to what is actually specific to
 * an application -- which stages exist, which colour each one wears, and the
 * rejection rule above.
 *
 * The vocabulary is still the system's: the solid status colour lives in the
 * connector, which is a rule, and no node is a filled pill. See the tracker's
 * own docblock for why that is the honest reading of the rule rather than a
 * way around it.
 */

/**
 * A tone per status, so the run is coloured by what each stage MEANS.
 *
 * Written out rather than built from a token name: Tailwind reads class names
 * as literal strings out of the source, so `bg-status-${s}-mark` would be
 * purged and every connector would render colourless.
 */
const STATUS_TONES: Record<Status, ProgressTone> = {
  wishlist: {
    line: 'bg-status-wishlist-mark',
    edge: 'border-status-wishlist-mark',
    ink: 'text-status-wishlist-mark',
    tint: 'bg-status-wishlist-mark/10',
  },
  applied: {
    line: 'bg-status-applied-mark',
    edge: 'border-status-applied-mark',
    ink: 'text-status-applied-mark',
    tint: 'bg-status-applied-mark/10',
  },
  interviewing: {
    line: 'bg-status-interviewing-mark',
    edge: 'border-status-interviewing-mark',
    ink: 'text-status-interviewing-mark',
    tint: 'bg-status-interviewing-mark/10',
  },
  offer: {
    line: 'bg-status-offer-mark',
    edge: 'border-status-offer-mark',
    ink: 'text-status-offer-mark',
    tint: 'bg-status-offer-mark/10',
  },
  rejected: {
    line: 'bg-status-rejected-mark',
    edge: 'border-status-rejected-mark',
    ink: 'text-status-rejected-mark',
    tint: 'bg-status-rejected-mark/10',
  },
}

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
    <div className={cn(className)} data-application-pipeline={status}>
      <ProgressTrack
        label="Application progress"
        current={current}
        steps={run.map((step) => ({
          id: step,
          label: STEPS[step].label,
          description: STEPS[step].description,
          icon: STEPS[step].icon,
          // EACH STEP WEARS ITS OWN STATUS COLOUR, not one tone for the whole
          // run: the five hues mean specific things everywhere else in this
          // app, and a rejected tail rendered in the offer green would be the
          // one place they stopped meaning them.
          tone: STATUS_TONES[step],
        }))}
      />
    </div>
  )
}
