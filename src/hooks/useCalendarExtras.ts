'use client'

import * as React from 'react'
import { useJobFeed, useJobFeedIndustries } from '@/hooks/useJobFeed'
import { useHolidayCountries, usePublicHolidays } from '@/hooks/usePublicHolidays'
import { HOLIDAY_COUNTRY_KEY, resolveHolidayCountry } from '@/services/holidays'
import { JOB_FEED_INDUSTRY_KEY } from '@/services/jobFeed'
import type { JobFeedProps } from '@/components/calendar/JobFeed'
import type { CalendarProps } from '@/components/calendar/Calendar'

/**
 * The two THIRD-PARTY reads the calendar screen carries, and the per-browser
 * choices in front of them.
 *
 * A SHARED HOOK BECAUSE THERE ARE TWO CALENDARS. `/calendar` reads the user's
 * own events; `/demo/calendar` renders a fixture. Holidays and the job feed
 * are identical on both -- they are public data with nothing to do with the
 * account -- so a second hand-written copy in the demo would be two places to
 * keep a localStorage key, a sentinel value and a fallback in step.
 *
 * IT DELIBERATELY DOES NOT READ EVENTS OR JOBS. Those are the account's, and
 * the route-owns-the-reads split still holds for them: this hook is only the
 * part that is the same whoever is looking.
 *
 * NEITHER READ CAN GATE A SCREEN. Both are supplementary by construction --
 * the caller spreads the result into `Calendar`, which draws a full month with
 * or without them.
 */
export interface CalendarExtras {
  /** Spread straight into `Calendar`. */
  calendar: Pick<
    CalendarProps,
    'holidays' | 'holidayCountry' | 'holidayCountries' | 'onHolidayCountryChange' | 'onVisibleYearsChange'
  >
  /** Spread straight into `JobFeed`. */
  feed: Pick<JobFeedProps, 'jobs' | 'loading' | 'error' | 'industries' | 'industry' | 'onIndustryChange'>
}

/** `all` is the panel's sentinel for "no industry filter", not an API slug. */
const ANY_INDUSTRY = 'all'

/** Reads a remembered choice without letting a blocked store throw. */
function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* private mode, or storage disabled */
  }
}

export function useCalendarExtras(): CalendarExtras {
  // Which years the grid is showing. `Calendar` reports it, because the month
  // cursor lives there and only it knows a December grid reaches into January.
  const [years, setYears] = React.useState<number[]>(() => [new Date().getFullYear()])

  // Null until the effect runs: `localStorage` and `navigator` do not exist
  // during the server render, and reading them in the initial state would be a
  // hydration mismatch rather than a clever shortcut.
  const [country, setCountry] = React.useState<string | null>(null)
  const [industry, setIndustry] = React.useState<string | null>(null)

  React.useEffect(() => {
    const storedCountry = readStored(HOLIDAY_COUNTRY_KEY)
    if (storedCountry) setCountry(storedCountry)
    else {
      const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
      setCountry(resolveHolidayCountry(languages))
    }

    const storedIndustry = readStored(JOB_FEED_INDUSTRY_KEY)
    if (storedIndustry) setIndustry(storedIndustry)
  }, [])

  const holidays = usePublicHolidays(years, country)
  const holidayCountries = useHolidayCountries()
  const feed = useJobFeed(industry)
  const industries = useJobFeedIndustries()

  return {
    calendar: {
      holidays: holidays.data ?? [],
      holidayCountry: country,
      holidayCountries: holidayCountries.data ?? [],
      onHolidayCountryChange: (code) => {
        setCountry(code)
        writeStored(HOLIDAY_COUNTRY_KEY, code)
      },
      onVisibleYearsChange: setYears,
    },
    feed: {
      jobs: feed.data ?? [],
      loading: feed.isLoading,
      error: !!feed.error,
      industries: industries.data ?? [],
      industry,
      onIndustryChange: (slug) => {
        const next = slug === ANY_INDUSTRY ? null : slug
        setIndustry(next)
        writeStored(JOB_FEED_INDUSTRY_KEY, next ?? '')
      },
    },
  }
}
