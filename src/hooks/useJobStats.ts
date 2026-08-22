import { useMemo } from 'react'
import { useJobs } from './useJobs'
import { JobStats, JobStatus, STATUS_CONFIG, TimeSeriesDataPoint, StatusDataPoint, Job } from '@/types'

/**
 * Hook to calculate job statistics
 */
export function useJobStats(): JobStats & { isLoading: boolean } {
  const { data: jobs = [], isLoading } = useJobs()
  const typedJobs = (jobs || []) as Job[]

  const stats = useMemo(() => {
    const totalJobs = typedJobs.length

    // Applied = everything except wishlist
    const appliedJobs = typedJobs.filter((j: Job) => j.status !== 'wishlist')
    const totalApplications = appliedJobs.length

    // Interviews = interviewing + offer (they got past application stage)
    const interviews = typedJobs.filter(
      (j: Job) => j.status === 'interviewing' || j.status === 'offer'
    ).length

    const offers = typedJobs.filter((j: Job) => j.status === 'offer').length
    const rejections = typedJobs.filter((j: Job) => j.status === 'rejected').length

    // Conversion rate: (Interviews / Applications) × 100
    const conversionRate =
      totalApplications > 0 ? (interviews / totalApplications) * 100 : 0

    // Offer rate: (Offers / Applications) × 100
    const offerRate =
      totalApplications > 0 ? (offers / totalApplications) * 100 : 0

    // Status distribution
    const statusDistribution = {
      wishlist: typedJobs.filter((j: Job) => j.status === 'wishlist').length,
      applied: typedJobs.filter((j: Job) => j.status === 'applied').length,
      interviewing: typedJobs.filter((j: Job) => j.status === 'interviewing').length,
      offer: typedJobs.filter((j: Job) => j.status === 'offer').length,
      rejected: typedJobs.filter((j: Job) => j.status === 'rejected').length,
    }

    return {
      totalJobs,
      totalApplications,
      interviews,
      offers,
      rejections,
      conversionRate: Math.round(conversionRate * 10) / 10,
      offerRate: Math.round(offerRate * 10) / 10,
      statusDistribution,
    }
  }, [typedJobs])

  return { ...stats, isLoading }
}

/**
 * Hook to get applications over time data for charts
 */
export function useApplicationsOverTime(): {
  data: TimeSeriesDataPoint[]
  isLoading: boolean
} {
  const { data: jobs = [], isLoading } = useJobs()
  const typedJobs = (jobs || []) as Job[]

  const data = useMemo(() => {
    const parseISODateLocal = (value: string): Date => {
      const [year, month, day] = value.split('-').map(Number)
      return new Date(year, (month ?? 1) - 1, day ?? 1)
    }

    const formatDateKey = (date: Date): string => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }

    // Filter jobs with date_applied
    const appliedJobs = typedJobs.filter((j: Job) => j.date_applied)

    if (appliedJobs.length === 0) return []

    // Group by week
    const grouped = appliedJobs.reduce(
      (acc, job) => {
        const date = parseISODateLocal(job.date_applied!)
        // Get start of week (Sunday)
        const startOfWeek = new Date(date)
        startOfWeek.setDate(date.getDate() - date.getDay())
        const key = formatDateKey(startOfWeek)

        acc[key] = (acc[key] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Convert to array and sort
    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [typedJobs])

  return { data, isLoading }
}

/**
 * Hook to get status distribution data for pie chart
 */
export function useStatusDistribution(): {
  data: StatusDataPoint[]
  isLoading: boolean
} {
  const { statusDistribution, isLoading } = useJobStats()

  const data = useMemo(() => {
    const statuses: JobStatus[] = [
      'wishlist',
      'applied',
      'interviewing',
      'offer',
      'rejected',
    ]

    return statuses
      .map((status) => ({
        status,
        count: statusDistribution[status],
        color: STATUS_CONFIG[status].color,
      }))
      .filter((item) => item.count > 0)
  }, [statusDistribution])

  return { data, isLoading }
}
