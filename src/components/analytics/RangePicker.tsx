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
 * `ui/select` rather than a segmented control: four options is on the edge
 * either way, but `Select` already exists and a second selection pattern for
 * one screen would be the "no new component styling" constraint's exact
 * failure mode.
 *
 * It stopped being a native `<select>` on 2026-09-05 -- the OS drew that
 * element's option list, so it was the one control in the app the design
 * system did not reach. Nothing here changed but the call signature.
 */
export interface RangePickerProps {
  value: RangeOption
  onChange: (value: RangeOption) => void
}

export function RangePicker({ value, onChange }: RangePickerProps) {
  return (
    // Full width on a phone, where it has wrapped onto its own line under the
    // page title, and its natural 176px from 375 up. `w-44` alone made a
    // 320px screen carry a control more than half the width of the viewport
    // with nothing beside it.
    <div data-range-picker className="w-full xs:w-44">
      <Select
        aria-label="Date range"
        value={value}
        onValueChange={(next) => onChange(next as RangeOption)}
        items={RANGE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
      />
    </div>
  )
}
