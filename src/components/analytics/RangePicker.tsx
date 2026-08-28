'use client'

import * as React from 'react'
import { Select } from '@/components/ui/select'
import { RANGE_OPTIONS, type RangeOption } from '@/lib/analyticsRange'

/**
 * The content control the roadmap moved into the body header, beside the
 * page title -- not the Top Bar, which is identical chrome shared by five of
 * the seven app screens.
 *
 * It governs less than the whole page. `analyticsService`'s five methods
 * take only `userId`; only `SourceConversionTrend` and `CohortAnalysis`
 * carry a `YYYY-MM` field at all. `Analytics.tsx` applies this value to just
 * those two panels and labels the other three "All time" rather than
 * pretending the control reaches them -- see the pre-flight ruling in
 * `.superpowers/sdd/2026-08-25-m5-application-screens/progress.md`.
 *
 * A native `<select>` (via `ui/select`) rather than a segmented control:
 * four options is on the edge either way, but `Select` already exists and a
 * second selection pattern for one screen would be the "no new component
 * styling" constraint's exact failure mode.
 */
export interface RangePickerProps {
  value: RangeOption
  onChange: (value: RangeOption) => void
}

export function RangePicker({ value, onChange }: RangePickerProps) {
  return (
    <div data-range-picker className="w-44">
      <Select
        aria-label="Date range"
        value={value}
        onChange={(event) => onChange(event.target.value as RangeOption)}
      >
        {RANGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  )
}
