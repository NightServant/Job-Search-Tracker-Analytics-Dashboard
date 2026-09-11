'use client'

import { ProgressTrack } from '@/components/ui/progress-track'
import { STEPS } from './wizardStepModel'

/**
 * The wizard's four steps: what they are, and the bar that tracks them.
 *
 * SPLIT OUT OF `AddApplicationDialog` ON 2026-09-11 (505 lines). A small cut
 * but a clean one: the step list is the wizard's spine -- `index`, the
 * continue button, the progress bar and the body switch all read it -- and it
 * belongs somewhere they can all reach without also reaching the dialog's
 * form state.
 *
 * IT TAKES THE ACCENT AND NOT THE STATUS PALETTE, which is the opposite of
 * `ApplicationPipeline` one screen over -- and deliberately. That bar tracks
 * an application through five named statuses, which have colours. This one
 * tracks a person through a form, which does not; the accent is what this
 * system uses for "you are here", and it is the tracker's default tone.
 */


export function WizardProgress({ current }: { current: number }) {
  return (
    <div data-add-progress={STEPS[current]?.id}>
      <ProgressTrack
        label="New application progress"
        current={current}
        steps={STEPS.map((step) => ({
          id: step.id,
          label: step.label,
          description: step.description,
          icon: step.icon,
        }))}
      />
    </div>
  )
}
