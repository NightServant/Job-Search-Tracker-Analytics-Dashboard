import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { analyticsService } from '@/services/analyticsService'
import type {
  TimeInStageMetric,
  ConversionFunnelMetric,
  SourceConversionTrend,
  CohortAnalysis,
  ConversionMetrics,
} from '@/services/analyticsService'

export interface AnalyticsData {
  timeInStage: TimeInStageMetric[] | null
  conversionFunnel: ConversionFunnelMetric[] | null
  sourceConversionTrends: SourceConversionTrend[] | null
  cohortAnalysis: CohortAnalysis[] | null
  conversionMetrics: ConversionMetrics | null
}

export const useAnalytics = () => {
  const { session } = useAuth()
  const userId = session?.user?.id
  const [data, setData] = useState<AnalyticsData>({
    timeInStage: null,
    conversionFunnel: null,
    sourceConversionTrends: null,
    cohortAnalysis: null,
    conversionMetrics: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        const [timeInStage, conversionFunnel, sourceConversionTrends, cohortAnalysis, conversionMetrics] = await Promise.all([
          analyticsService.getTimeInStageMetrics(userId).catch(() => null),
          analyticsService.getConversionFunnel(userId).catch(() => null),
          analyticsService.getSourceConversionTrends(userId).catch(() => null),
          analyticsService.getCohortAnalysis(userId).catch(() => null),
          analyticsService.getConversionMetrics(userId).catch(() => null),
        ])

        setData({
          timeInStage,
          conversionFunnel,
          sourceConversionTrends,
          cohortAnalysis,
          conversionMetrics,
        })
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load analytics')
        setError(error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [userId])

  return {
    ...data,
    loading,
    error,
  }
}
