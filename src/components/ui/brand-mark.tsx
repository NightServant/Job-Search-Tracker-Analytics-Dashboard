import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The 2x2 brand mark.
 *
 * Extracted from Figma node 19:5 (`Mark`, inside `Logo` at 19:4) via
 * `download_assets` and committed at `src/components/brand/mark.svg` --
 * geometry copied from that export, not redrawn: four 10x10 cells, 1px
 * corner radius, 3px gaps, at (0,0) (13,0) (0,13) (13,13). The bottom-left
 * cell is `Cell / Active` in Figma -- "a literal reference to the status
 * pipeline" per the component description -- and is the only one that
 * carries the accent colour.
 *
 * Renders correctly in both themes without a dark variant: the three static
 * cells use `currentColor` (the caller's text colour, normally text/primary),
 * and the active cell binds to `var(--color-accent-default)`, which the
 * stylesheet already flips between #c2410c (light) and #fb923c (dark).
 *
 * The favicon/apple-icon/opengraph-image rasters generated from this same
 * geometry are fixed-colour (light-theme values baked in) -- browsers do not
 * theme favicons, so that divergence is unavoidable and documented at the
 * top of src/app/opengraph-image.png's generation, not repeated here.
 */
export interface BrandMarkProps extends Omit<React.SVGAttributes<SVGSVGElement>, 'width' | 'height'> {
  size?: number
  /**
   * True when the mark sits beside the "worktrack" wordmark (BrandLockup) --
   * the text already carries the accessible name, so the mark is hidden from
   * the accessibility tree rather than announcing the brand twice.
   */
  decorative?: boolean
}

const CELLS: ReadonlyArray<{ x: number; y: number; active?: boolean }> = [
  { x: 0, y: 0 },
  { x: 13, y: 0 },
  { x: 0, y: 13, active: true },
  { x: 13, y: 13 },
]

export function BrandMark({ size = 23, decorative = false, className, ...props }: BrandMarkProps) {
  return (
    <svg
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'Worktrack' })}
      width={size}
      height={size}
      viewBox="0 0 23 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0 text-text-primary', className)}
      {...props}
    >
      {CELLS.map((cell) => (
        <rect
          key={`${cell.x}-${cell.y}`}
          data-cell={cell.active ? 'active' : 'static'}
          x={cell.x}
          y={cell.y}
          width={10}
          height={10}
          rx={1}
          fill={cell.active ? 'var(--color-accent-default)' : 'currentColor'}
        />
      ))}
    </svg>
  )
}

export interface BrandLockupProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
}

/**
 * Mark plus the lowercase "worktrack" wordmark, 10px gap -- node 19:4.
 * 18px/700/-0.03em on the word is a one-off (not on the type scale), copied
 * from the Figma text node (19:10, 18px, tracking -0.54px = -0.03em * 18px).
 */
export function BrandLockup({ size = 23, className, ...props }: BrandLockupProps) {
  return (
    <div className={cn('flex items-center gap-[10px] text-text-primary', className)} {...props}>
      <BrandMark size={size} decorative />
      <span className="text-[18px] font-bold tracking-[-0.03em]">worktrack</span>
    </div>
  )
}
