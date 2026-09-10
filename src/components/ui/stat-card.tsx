import * as React from 'react'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { icons, type IconName } from '@/components/icons'

/**
 * One number, in a card, with the number as the hero (Gabe, 2026-09-10).
 *
 * WHAT IT REPLACES AND WHY. The Overview opened with `KpiStrip`: five figures
 * in a divided row at `text-data-l`, which tops out at 24px. Beside a 668px
 * chart card the row read as a caption to the page rather than as the page's
 * headline facts, and on a phone the two-column collapse put "success rate"
 * under "rejected" with no boundary between them at all.
 *
 * THE NUMBER IS THE HERO, which is the whole instruction: `text-data-xl`,
 * clamping 28px to 40px, is the largest type this system has and it is bigger
 * than the page title. That is deliberate. A dashboard is read number-first
 * and label-second -- somebody glances at it to learn "eleven", then reads the
 * word to find out eleven of what.
 *
 * `tabular` on the value is not cosmetic: proportional figures set a 1
 * narrower than an 8, so a card ticking from 118 to 88 visibly reflows. Same
 * reasoning as `KpiStat`, which this does not replace -- that one is still the
 * right shape inside the analytics screen's own dense strip.
 *
 * `detail` is what stops each card being a number with no scale. "3" means
 * nothing; "3" over "of 52 sent" is a fact. It is optional because two of the
 * six have genuinely nothing to compare against.
 */
export interface StatCardProps extends React.ComponentProps<typeof Card> {
  label: string
  value: string | number
  /** One line under the number: what it is measured against. */
  detail?: React.ReactNode
  /** A muted glyph beside the label. Decorative, per `CardTitle`'s rule. */
  icon?: IconName
}

export function StatCard({ label, value, detail, icon, className, ...props }: StatCardProps) {
  const Icon = icon ? icons[icon] : null
  return (
    <Card data-stat-card className={cn('justify-between', className)} {...props}>
      <CardContent className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-label-caps uppercase text-text-muted">
          {Icon && <Icon size={14} aria-hidden className="shrink-0" />}
          {label}
        </span>
        <span data-kpi-value className="tabular text-data-xl text-text-primary">
          {value}
        </span>
        {detail && <span className="text-body-s text-text-muted">{detail}</span>}
      </CardContent>
    </Card>
  )
}
