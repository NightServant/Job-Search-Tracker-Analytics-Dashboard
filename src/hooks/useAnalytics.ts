import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { analyticsService } from '@/services/analyticsService'
import { supabase } from '@/lib/supabase'
import type {
  TimeInStageMetric,
  ConversionFunnelMetric,
  SourceConversionTrend,
  CohortAnalysis,
  ConversionMetrics,
} from '@/services/analyticsService'

export function useTimeInStage(userId?: string) {
  return useQuery<TimeInStageMetric[]>({
    queryKey: ['analytics', 'timeInStage', userId],
    queryFn: async () => {
      // Try cache-backed edge function first
      try {
        const { data, error } = await supabase.functions.invoke('analytics-cache-proxy', { body: { metric: 'timeInStage' } })
        if (!error && data && (data as any).cached && (data as any).payload) {
          return (data as any).payload as TimeInStageMetric[]
        }
      } catch (e) {
        // ignore cache errors and fall back to live compute
      }
      return analyticsService.getTimeInStageMetrics(userId!)
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useConversionFunnel(userId?: string) {
  return useQuery<ConversionFunnelMetric[]>({
    queryKey: ['analytics', 'conversionFunnel', userId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('analytics-cache-proxy', { body: { metric: 'conversionFunnel' } })
        if (!error && data && (data as any).cached && (data as any).payload) {
          return (data as any).payload as ConversionFunnelMetric[]
        }
      } catch (e) {}
      return analyticsService.getConversionFunnel(userId!)
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useSourceConversionTrends(userId?: string) {
  return useQuery<SourceConversionTrend[]>({
    queryKey: ['analytics', 'sourceConversionTrends', userId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('analytics-cache-proxy', { body: { metric: 'sourceConversionTrends' } })
        if (!error && data && (data as any).cached && (data as any).payload) {
          return (data as any).payload as SourceConversionTrend[]
        }
      } catch (e) {}
      return analyticsService.getSourceConversionTrends(userId!)
    },
    enabled: !!userId,
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useCohortAnalysis(userId?: string) {
  return useQuery<CohortAnalysis[]>({
    queryKey: ['analytics', 'cohortAnalysis', userId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('analytics-cache-proxy', { body: { metric: 'cohortAnalysis' } })
        if (!error && data && (data as any).cached && (data as any).payload) {
          return (data as any).payload as CohortAnalysis[]
        }
      } catch (e) {}
      return analyticsService.getCohortAnalysis(userId!)
    },
    enabled: !!userId,
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useConversionMetrics(userId?: string) {
  return useQuery<ConversionMetrics>({
    queryKey: ['analytics', 'conversionMetrics', userId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke('analytics-cache-proxy', { body: { metric: 'conversionMetrics' } })
        if (!error && data && (data as any).cached && (data as any).payload) {
          return (data as any).payload as ConversionMetrics
        }
      } catch (e) {}
      return analyticsService.getConversionMetrics(userId!)
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useStatusTransitions(userId?: string) {
  return useQuery({
    queryKey: ['analytics', 'statusTransitions', userId],
    queryFn: () => analyticsService.getStatusTransitions(userId!),
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
