import { supabase } from '@/lib/supabase'
import type { JobStatus } from '@/types'
import * as Sentry from '@sentry/react'

export interface TimeInStageMetric {
  status: JobStatus
  avgDays: number
  medianDays: number
  minDays: number
  maxDays: number
  count: number
}

export interface ConversionFunnelMetric {
  stage: string
  count: number
  percentage: number
  avgDaysToStage: number
}

export interface ConversionMetrics {
  totalJobs: number
  timeToFirstInterview: number | null
  timeToOffer: number | null
  conversionRate: number
  conversionBySource: Record<string, number>
}

export interface SourceConversionTrend {
  source: string
  month: string
  applied: number
  interviewing: number
  offer: number
  rejected: number
  conversionRate: number
}

export interface CohortAnalysis {
  cohort: string // Month when job was first applied
  jobsApplied: number
  jobsInterviewing: number
  jobsOffered: number
  jobsRejected: number
  conversionRate: number
  avgTimeToOffer: number | null
}

export const analyticsService = {
  /**
   * Compute time-in-stage metrics for a user's job applications
   * Shows how long jobs spend in each status stage
   */
  async getTimeInStageMetrics(userId: string): Promise<TimeInStageMetric[]> {
    try {
      Sentry.addBreadcrumb({
        category: 'analytics.timeInStage',
        message: 'Computing time-in-stage metrics',
        level: 'info',
        data: { userId },
      })

      // Get all status changes for user's jobs
      const { data: statusHistory, error: historyError } = await supabase
        .from('job_status_history')
        .select('*')
        .eq('user_id', userId)
        .order('changed_at', { ascending: true })

      if (historyError) throw historyError

      // Compute duration in each status
      const stageMetrics = new Map<JobStatus, number[]>()

      for (const change of statusHistory ?? []) {
        const fromTime = new Date(change.changed_at)

        // Find next status change
        const nextChange = statusHistory?.find(
          (h) =>
            h.job_id === change.job_id &&
            h.from_status === change.to_status &&
            new Date(h.changed_at) > fromTime
        )

        const toTime = nextChange ? new Date(nextChange.changed_at) : new Date()
        const daysInStatus = (toTime.getTime() - fromTime.getTime()) / (1000 * 60 * 60 * 24)

        if (!stageMetrics.has(change.to_status)) {
          stageMetrics.set(change.to_status, [])
        }
        stageMetrics.get(change.to_status)!.push(daysInStatus)
      }

      // Compute statistics for each stage
      const metrics: TimeInStageMetric[] = []
      for (const [status, durations] of stageMetrics.entries()) {
        if (durations.length === 0) continue

        durations.sort((a, b) => a - b)
        const avgDays = durations.reduce((a, b) => a + b, 0) / durations.length
        const medianDays = durations[Math.floor(durations.length / 2)] ?? 0

        metrics.push({
          status: status as JobStatus,
          avgDays: Math.round(avgDays * 10) / 10,
          medianDays: Math.round(medianDays * 10) / 10,
          minDays: Math.round(Math.min(...durations) * 10) / 10,
          maxDays: Math.round(Math.max(...durations) * 10) / 10,
          count: durations.length,
        })
      }

      Sentry.addBreadcrumb({
        category: 'analytics.timeInStage',
        message: 'Time-in-stage metrics computed',
        level: 'info',
        data: { stageCount: metrics.length },
      })

      return metrics
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      Sentry.captureException(error, {
        tags: { function: 'getTimeInStageMetrics' },
        extra: { userId },
      })
      throw error
    }
  },

  /**
   * Compute conversion funnel: wishlist -> applied -> interviewing -> offer
   * Shows how many jobs move through each stage
   */
  async getConversionFunnel(userId: string): Promise<ConversionFunnelMetric[]> {
    try {
      Sentry.addBreadcrumb({
        category: 'analytics.conversionFunnel',
        message: 'Computing conversion funnel',
        level: 'info',
        data: { userId },
      })

      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, status')
        .eq('user_id', userId)

      if (jobsError) throw jobsError

      const jobList = jobs ?? []
      const totalJobs = jobList.length

      // Count jobs at each stage
      const stageCounts = {
        applied: jobList.filter((j) => j.status === 'applied' || jobList.some((x) => x.id === j.id && x.status !== 'wishlist')).length,
        interviewing: jobList.filter((j) => j.status === 'interviewing').length,
        offer: jobList.filter((j) => j.status === 'offer').length,
        rejected: jobList.filter((j) => j.status === 'rejected').length,
      }

      // Compute time to each stage
      const timeToInterviewMs = await this._computeTimeToStatus(userId, 'interviewing')
      const timeToOfferMs = await this._computeTimeToStatus(userId, 'offer')

      const funnel: ConversionFunnelMetric[] = [
        {
          stage: 'Applied',
          count: stageCounts.applied,
          percentage: totalJobs > 0 ? (stageCounts.applied / totalJobs) * 100 : 0,
          avgDaysToStage: timeToInterviewMs ? Math.round(timeToInterviewMs / (1000 * 60 * 60 * 24)) : 0,
        },
        {
          stage: 'Interviewing',
          count: stageCounts.interviewing,
          percentage: totalJobs > 0 ? (stageCounts.interviewing / totalJobs) * 100 : 0,
          avgDaysToStage: timeToInterviewMs ? Math.round(timeToInterviewMs / (1000 * 60 * 60 * 24)) : 0,
        },
        {
          stage: 'Offer',
          count: stageCounts.offer,
          percentage: totalJobs > 0 ? (stageCounts.offer / totalJobs) * 100 : 0,
          avgDaysToStage: timeToOfferMs ? Math.round(timeToOfferMs / (1000 * 60 * 60 * 24)) : 0,
        },
      ]

      Sentry.addBreadcrumb({
        category: 'analytics.conversionFunnel',
        message: 'Conversion funnel computed',
        level: 'info',
        data: { stages: funnel.length, totalJobs },
      })

      return funnel
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      Sentry.captureException(error, {
        tags: { function: 'getConversionFunnel' },
        extra: { userId },
      })
      throw error
    }
  },

  /**
   * Get source-based conversion trends over time
   * Shows how many applications, interviews, and offers per source per month
   */
  async getSourceConversionTrends(userId: string): Promise<SourceConversionTrend[]> {
    try {
      Sentry.addBreadcrumb({
        category: 'analytics.sourceConversionTrends',
        message: 'Computing source conversion trends',
        level: 'info',
        data: { userId },
      })

      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, source, status, created_at')
        .eq('user_id', userId)

      if (jobsError) throw jobsError

      // Group by source and month
      const trendMap = new Map<string, Map<string, any>>()

      for (const job of jobs ?? []) {
        const source = job.source || 'Direct'
        const month = new Date(job.created_at).toISOString().slice(0, 7) // YYYY-MM

        if (!trendMap.has(source)) {
          trendMap.set(source, new Map())
        }

        const sourceMap = trendMap.get(source)!
        if (!sourceMap.has(month)) {
          sourceMap.set(month, {
            applied: 0,
            interviewing: 0,
            offer: 0,
            rejected: 0,
            total: 0,
          })
        }

        const monthData = sourceMap.get(month)!
        monthData.total += 1

        if (job.status === 'applied') monthData.applied += 1
        else if (job.status === 'interviewing') monthData.interviewing += 1
        else if (job.status === 'offer') monthData.offer += 1
        else if (job.status === 'rejected') monthData.rejected += 1
      }

      // Convert map to array
      const trends: SourceConversionTrend[] = []
      for (const [source, monthMap] of trendMap.entries()) {
        for (const [month, data] of monthMap.entries()) {
          trends.push({
            source,
            month,
            applied: data.applied,
            interviewing: data.interviewing,
            offer: data.offer,
            rejected: data.rejected,
            conversionRate: data.total > 0 ? (data.offer / data.total) * 100 : 0,
          })
        }
      }

      trends.sort((a, b) => a.month.localeCompare(b.month))

      Sentry.addBreadcrumb({
        category: 'analytics.sourceConversionTrends',
        message: 'Source conversion trends computed',
        level: 'info',
        data: { sources: trendMap.size, months: trends.length },
      })

      return trends
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      Sentry.captureException(error, {
        tags: { function: 'getSourceConversionTrends' },
        extra: { userId },
      })
      throw error
    }
  },

  /**
   * Cohort analysis: group applications by month applied, track progression
   * Shows retention and conversion over time for each cohort
   */
  async getCohortAnalysis(userId: string): Promise<CohortAnalysis[]> {
    try {
      Sentry.addBreadcrumb({
        category: 'analytics.cohortAnalysis',
        message: 'Computing cohort analysis',
        level: 'info',
        data: { userId },
      })

      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, status, created_at, date_applied')
        .eq('user_id', userId)

      if (jobsError) throw jobsError

      // Group by cohort (month of first application)
      const cohortMap = new Map<string, any>()

      for (const job of jobs ?? []) {
        // Use date_applied if available, otherwise created_at
        const appliedDate = job.date_applied ? new Date(job.date_applied) : new Date(job.created_at)
        const cohort = appliedDate.toISOString().slice(0, 7) // YYYY-MM

        if (!cohortMap.has(cohort)) {
          cohortMap.set(cohort, {
            applied: 0,
            interviewing: 0,
            offered: 0,
            rejected: 0,
            timeToOffers: [] as number[],
          })
        }

        const cohortData = cohortMap.get(cohort)!
        cohortData.applied += 1

        if (job.status === 'interviewing') cohortData.interviewing += 1
        else if (job.status === 'offer') {
          cohortData.offered += 1
          const daysToOffer = (new Date().getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24)
          cohortData.timeToOffers.push(daysToOffer)
        } else if (job.status === 'rejected') cohortData.rejected += 1
      }

      // Convert to cohort analysis array
      const analysis: CohortAnalysis[] = []
      for (const [cohort, data] of cohortMap.entries()) {
        const avgTimeToOffer =
          data.timeToOffers.length > 0
            ? Math.round((data.timeToOffers.reduce((a: number, b: number) => a + b, 0) / data.timeToOffers.length) * 10) / 10
            : null

        analysis.push({
          cohort,
          jobsApplied: data.applied,
          jobsInterviewing: data.interviewing,
          jobsOffered: data.offered,
          jobsRejected: data.rejected,
          conversionRate: data.applied > 0 ? (data.offered / data.applied) * 100 : 0,
          avgTimeToOffer,
        })
      }

      analysis.sort((a, b) => b.cohort.localeCompare(a.cohort)) // Most recent first

      Sentry.addBreadcrumb({
        category: 'analytics.cohortAnalysis',
        message: 'Cohort analysis computed',
        level: 'info',
        data: { cohorts: analysis.length },
      })

      return analysis
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      Sentry.captureException(error, {
        tags: { function: 'getCohortAnalysis' },
        extra: { userId },
      })
      throw error
    }
  },

  /**
   * Get overall conversion metrics
   */
  async getConversionMetrics(userId: string): Promise<ConversionMetrics> {
    try {
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, status, source')
        .eq('user_id', userId)

      if (jobsError) throw jobsError

      const jobList = jobs ?? []
      const offeredJobs = jobList.filter((j) => j.status === 'offer')
      const timeToFirstInterview = await this._computeTimeToStatus(userId, 'interviewing')
      const timeToOffer = await this._computeTimeToStatus(userId, 'offer')

      // Count by source
      const conversionBySource: Record<string, number> = {}
      for (const job of jobList) {
        const source = job.source || 'Direct'
        if (!conversionBySource[source]) {
          conversionBySource[source] = 0
        }
        if (job.status === 'offer') {
          conversionBySource[source] += 1
        }
      }

      return {
        totalJobs: jobList.length,
        timeToFirstInterview: timeToFirstInterview ? Math.round(timeToFirstInterview / (1000 * 60 * 60 * 24)) : null,
        timeToOffer: timeToOffer ? Math.round(timeToOffer / (1000 * 60 * 60 * 24)) : null,
        conversionRate: jobList.length > 0 ? (offeredJobs.length / jobList.length) * 100 : 0,
        conversionBySource,
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      Sentry.captureException(error, {
        tags: { function: 'getConversionMetrics' },
        extra: { userId },
      })
      throw error
    }
  },

  /**
   * Helper: Compute average time from creation to reaching a specific status
   */
  async _computeTimeToStatus(userId: string, targetStatus: JobStatus): Promise<number | null> {
    const { data: statusHistory, error } = await supabase
      .from('job_status_history')
      .select('job_id, changed_at')
      .eq('user_id', userId)
      .eq('to_status', targetStatus)

    if (error || !statusHistory || statusHistory.length === 0) return null

    // Get job creation times
    const { data: jobs } = await supabase.from('jobs').select('id, created_at').eq('user_id', userId)

    if (!jobs) return null

    const jobCreationMap = new Map(jobs.map((j) => [j.id, new Date(j.created_at).getTime()]))

    // Compute average time to status
    const timesToStatus = statusHistory
      .map((change) => {
        const createdTime = jobCreationMap.get(change.job_id)
        if (!createdTime) return null
        return new Date(change.changed_at).getTime() - createdTime
      })
      .filter((t): t is number => t !== null)

    if (timesToStatus.length === 0) return null

    return timesToStatus.reduce((a, b) => a + b, 0) / timesToStatus.length
  },
}
