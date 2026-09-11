import type { IconName } from '@/components/icons'

/**
 * The wizard's four steps, as data.
 *
 * ITS OWN MODULE, NOT BESIDE `WizardProgress`, for the reason
 * `button-variants.ts` and `progress-tones.ts` are in theirs:
 * `react-refresh/only-export-components` warns when a file exports both
 * components and constants. The list is also read by things that render no
 * progress bar at all -- the step cursor, the continue button and the body
 * switch -- so a module neither of them owns is where it belongs.
 */

export type StepId = 'link' | 'status' | 'fill' | 'review'

export interface StepDef {
  id: StepId
  label: string
  description: string
  icon: IconName
}

export const STEPS: StepDef[] = [
  { id: 'link', label: 'link', description: 'where the posting lives', icon: 'Link' },
  { id: 'status', label: 'status', description: 'saved or already sent', icon: 'Flag' },
  { id: 'fill', label: 'read', description: 'the model fills it in', icon: 'Documents' },
  { id: 'review', label: 'review', description: 'check it, then save', icon: 'Check' },
]
