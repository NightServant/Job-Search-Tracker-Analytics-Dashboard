import { useQuery } from '@tanstack/react-query'
import {
  fetchHolidayCountries,
  fetchPublicHolidays,
  type HolidayCountry,
  type PublicHoliday,
} from '@/services/holidays'

/**
 * Public holidays for the years a calendar is currently showing.
 *
 * NOT KEYED ON THE USER and not gated on a session: this is public reference
 * data from a third party, identical for everyone, so it has nothing to do
 * with auth and must not sit behind `enabled: !!user` the way every other hook
 * in this directory does.
 *
 * `staleTime: Infinity` because a year's holidays are fixed once published.
 * Refetching them is pure waste, and Cloudflare in front of the API is already
 * telling the browser as much with a week-long `max-age`.
 *
 * `years` is usually one entry and occasionally two — a month grid pads with
 * the neighbouring months, so December's grid reaches into January. The
 * caller passes exactly the years its own grid contains rather than a fixed
 * window, so paging around inside one year costs no requests at all.
 */
export function usePublicHolidays(years: number[], countryCode: string | null) {
  const sorted = [...new Set(years)].sort()
  return useQuery<PublicHoliday[]>({
    queryKey: ['public-holidays', countryCode, sorted],
    queryFn: async ({ signal }) => {
      const pages = await Promise.all(
        sorted.map((year) => fetchPublicHolidays(year, countryCode as string, signal))
      )
      return pages.flat()
    },
    enabled: !!countryCode && sorted.length > 0,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

/** The country list behind the calendar's picker. Fetched once, kept. */
export function useHolidayCountries(enabled = true) {
  return useQuery<HolidayCountry[]>({
    queryKey: ['holiday-countries'],
    queryFn: ({ signal }) => fetchHolidayCountries(signal),
    enabled,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
