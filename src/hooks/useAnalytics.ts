import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { analyticsService } from '@/services/analyticsService'
import { supabase } from '@/lib/supabase'

/**
 * THE RANGE IS PART OF THE CACHE KEY, and it has to be: two windows over the
 * same account are two different answers, and sharing a key would serve
 * whichever was fetched first for both.
 *
 * IT ALSO TURNS THE EDGE CACHE OFF. `analytics-cache-proxy` stores one
 * all-time payload per metric; consulting it for a narrowed window would
 * return the all-time numbers under a "last 3 months" heading -- which is a
 * more convincing version of the bug this change exists to fix. So the cache
 * is read only when there is no window (`since === null`), and every other
 * range is computed live.
 */
const cacheable = (since: string | null) => since === null
import type {
  TimeInStageMetric,
  ConversionFunnelMetric,
  SourceConversionTrend,
  CohortAnalysis,
  ConversionMetrics,
} from '@/services/analyticsService'

export function useTimeInStage(userId?: string, since: string | null = null) {
  return useQuery<TimeInStageMetric[]>({
    queryKey: ['analytics', 'timeInStage', userId, since],
    queryFn: async () => {
      // The cache holds one ALL-TIME payload per metric, so it is only
      // consulted when no window is set. See `cacheable` above.
      if (cacheable(since)) {
        try {
          const { data, error } = await supabase.functions.invoke('analytics-cache-proxy', { body: { metric: 'timeInStage' } })
          if (!error && data && (data as any).cached && (data as any).payload) {
            return (data as any).payload as TimeInStageMetric[]
          }
        } catch {
          // ignore cache errors and fall back to live compute
        }
      }
      return analyticsService.getTimeInStageMetrics(userId!, since)
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useConversionFunnel(userId?: string, since: string | null = null) {
  return useQuery<ConversionFunnelMetric[]>({
    queryKey: ['analytics', 'conversionFunnel', userId, since],
    queryFn: async () => {
      // The cache holds one ALL-TIME payload per metric, so it is only
      // consulted when no window is set. See `cacheable` above.
      if (cacheable(since)) {
        try {
          const { data, error } = await supabase.functions.invoke('analytics-cache-proxy', { body: { metric: 'conversionFunnel' } })
          if (!error && data && (data as any).cached && (data as any).payload) {
            return (data as any).payload as ConversionFunnelMetric[]
          }
        } catch {
          // ignore cache errors and fall back to live compute
        }
      }
      return analyticsService.getConversionFunnel(userId!, since)
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useSourceConversionTrends(userId?: string, since: string | null = null) {
  return useQuery<SourceConversionTrend[]>({
    queryKey: ['analytics', 'sourceConversionTrends', userId, since],
    queryFn: async () => {
      // The cache holds one ALL-TIME payload per metric, so it is only
      // consulted when no window is set. See `cacheable` above.
      if (cacheable(since)) {
        try {
          const { data, error } = await supabase.functions.invoke('analytics-cache-proxy', { body: { metric: 'sourceConversionTrends' } })
          if (!error && data && (data as any).cached && (data as any).payload) {
            return (data as any).payload as SourceConversionTrend[]
          }
        } catch {
          // ignore cache errors and fall back to live compute
        }
      }
      return analyticsService.getSourceConversionTrends(userId!, since)
    },
    enabled: !!userId,
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useCohortAnalysis(userId?: string, since: string | null = null) {
  return useQuery<CohortAnalysis[]>({
    queryKey: ['analytics', 'cohortAnalysis', userId, since],
    queryFn: async () => {
      // The cache holds one ALL-TIME payload per metric, so it is only
      // consulted when no window is set. See `cacheable` above.
      if (cacheable(since)) {
        try {
          const { data, error } = await supabase.functions.invoke('analytics-cache-proxy', { body: { metric: 'cohortAnalysis' } })
          if (!error && data && (data as any).cached && (data as any).payload) {
            return (data as any).payload as CohortAnalysis[]
          }
        } catch {
          // ignore cache errors and fall back to live compute
        }
      }
      return analyticsService.getCohortAnalysis(userId!, since)
    },
    enabled: !!userId,
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useConversionMetrics(userId?: string, since: string | null = null) {
  return useQuery<ConversionMetrics>({
    queryKey: ['analytics', 'conversionMetrics', userId, since],
    queryFn: async () => {
      // The cache holds one ALL-TIME payload per metric, so it is only
      // consulted when no window is set. See `cacheable` above.
      if (cacheable(since)) {
        try {
          const { data, error } = await supabase.functions.invoke('analytics-cache-proxy', { body: { metric: 'conversionMetrics' } })
          if (!error && data && (data as any).cached && (data as any).payload) {
            return (data as any).payload as ConversionMetrics
          }
        } catch {
          // ignore cache errors and fall back to live compute
        }
      }
      return analyticsService.getConversionMetrics(userId!, since)
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useStatusTransitions(userId?: string, since: string | null = null) {
  return useQuery({
    queryKey: ['analytics', 'statusTransitions', userId, since],
    queryFn: () => analyticsService.getStatusTransitions(userId!, since),
    enabled: !!userId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useAnalytics() {
  const { session } = useAuth()
  const userId = session?.user?.id

  const timeInStage = useTimeInStage(userId)
  const conversionFunnel = useConversionFunnel(userId)
  const sourceConversionTrends = useSourceConversionTrends(userId)
  const cohortAnalysis = useCohortAnalysis(userId)
  const conversionMetrics = useConversionMetrics(userId)

  const loading = useMemo(() => {
    return [timeInStage, conversionFunnel, sourceConversionTrends, cohortAnalysis, conversionMetrics].some((q) => q.isLoading)
  }, [timeInStage.isLoading, conversionFunnel.isLoading, sourceConversionTrends.isLoading, cohortAnalysis.isLoading, conversionMetrics.isLoading])

  const error = useMemo(() => {
    return timeInStage.error || conversionFunnel.error || sourceConversionTrends.error || cohortAnalysis.error || conversionMetrics.error || null
  }, [timeInStage.error, conversionFunnel.error, sourceConversionTrends.error, cohortAnalysis.error, conversionMetrics.error])

  return {
    timeInStage: timeInStage.data ?? null,
    conversionFunnel: conversionFunnel.data ?? null,
    sourceConversionTrends: sourceConversionTrends.data ?? null,
    cohortAnalysis: cohortAnalysis.data ?? null,
    conversionMetrics: conversionMetrics.data ?? null,
    loading,
    error,
  }
}
