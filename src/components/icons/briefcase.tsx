// The one glyph AnimateIcons has no equivalent for (searched briefcase, bag,
// case, folder -- nothing). It had ONE call site, src/screens/LoginPage.tsx,
// which M6 Task 4 deleted, so nothing renders it today; it stays in the
// barrel because `icons` is a complete record keyed by IconName and removing
// one entry narrows a type the app's nav is written against.
// a legacy v3 screen M6 Task 4 deletes outright, decorating a wordmark that
// reads "Job Search Tracker" -- not the product's current name. Gabe's ruling
// on 2026-08-29: leave LoginPage.tsx untouched rather than substitute a
// near-match glyph or hand-draw a new one; the real brand mark Task 3 pulls
// from Figma is what eventually belongs there. So this geometry -- exactly as
// drawn for the custom set in M5 Task 1, Figma node 103:2066 -- survives in
// its own file, isolated from the barrel's AnimateIcons re-exports, purely to
// keep LoginPage.tsx compiling until it is deleted.
import type { SVGProps } from 'react'

export interface BriefcaseIconProps extends Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> {
  /** Rendered size in px. Defaults to 20, the size the old set was drawn at. */
  size?: number
}

export function BriefcaseIcon({ size = 20, ...props }: BriefcaseIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path
        d="M 4.5 1.5 L 4.5 0 L 9.5 0 L 9.5 1.5 M 1 1.5 L 13 1.5 C 13.5523 1.5 14 1.9477 14 2.5 L 14 10.5 C 14 11.0523 13.5523 11.5 13 11.5 L 1 11.5 C 0.4477 11.5 0 11.0523 0 10.5 L 0 2.5 C 0 1.9477 0.4477 1.5 1 1.5 Z"
        transform="translate(3 5)"
      />
    </svg>
  )
}
