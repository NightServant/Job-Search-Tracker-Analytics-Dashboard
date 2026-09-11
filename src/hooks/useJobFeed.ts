import { useQuery } from '@tanstack/react-query'
import {
  fetchFeedIndustries,
  fetchFeedLocations,
  fetchRemoteJobs,
  type FeedFacet,
  type FeedJob,
} from '@/services/jobFeed'

/**
 * Recent remote postings for the calendar's feed panel.
 *
 * NOT KEYED ON THE USER and not gated on a session, for the same reason
 * `usePublicHolidays` is not: this is public third-party data, identical for
 * everyone, and it has nothing to do with auth.
 *
 * `staleTime` is fifteen minutes rather than `Infinity`. A holiday list is
 * fixed once published; a job board is not, and the whole value of the panel
 * is that the postings are recent. Fifteen minutes is short enough that a
 * morning and an afternoon visit differ, and long enough that clicking
 * between screens costs nothing.
 */
export function useJobFeed(industry: string | null, geo: string | null, enabled = true) {
  return useQuery<FeedJob[]>({
    queryKey: ['job-feed', industry, geo],
    queryFn: ({ signal }) => fetchRemoteJobs({ count: 24, industry, geo }, signal),
    enabled,
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

/** The feed's own industry taxonomy, behind the panel's filter. */
export function useJobFeedIndustries(enabled = true) {
  return useQuery<FeedFacet[]>({
    queryKey: ['job-feed-industries'],
    queryFn: ({ signal }) => fetchFeedIndustries(signal),
    enabled,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

/** The feed's own geo taxonomy, behind the panel's region filter. */
export function useJobFeedLocations(enabled = true) {
  return useQuery<FeedFacet[]>({
    queryKey: ['job-feed-locations'],
    queryFn: ({ signal }) => fetchFeedLocations(signal),
    enabled,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
