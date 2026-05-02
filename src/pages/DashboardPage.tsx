import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  TrendingUp,
  CheckCircle,
  Target,
  Download,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Sankey,
} from 'recharts'
import { useJobStats, useApplicationsOverTime, useStatusDistribution } from '@/hooks/useJobStats'
import { useAllJobStatusHistory, useJobs } from '@/hooks/useJobs'
import { Job, JobStatus, STATUS_CONFIG } from '@/types'

type GoalPeriod = 'weekly' | 'daily'

const GOAL_STORAGE_KEY = 'job-search-goal-v1'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseISODateLocal(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfWeekSunday(date: Date): Date {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  return start
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round(value * 10) / 10}%`
}

function buildSalaryBuckets(values: number[]): Array<{ range: string; count: number }> {
  const clean = values.filter((v) => Number.isFinite(v) && v > 0)
  if (clean.length === 0) return []

  const min = Math.min(...clean)
  const max = Math.max(...clean)

  let bucketSize = 25000
  let start = Math.floor(min / bucketSize) * bucketSize
  let end = Math.ceil(max / bucketSize) * bucketSize

  const getBucketCount = () => Math.max(1, Math.ceil((end - start) / bucketSize))
  while (getBucketCount() > 12) {
    bucketSize *= 2
    start = Math.floor(min / bucketSize) * bucketSize
    end = Math.ceil(max / bucketSize) * bucketSize
  }

  const buckets = new Array(getBucketCount()).fill(0)

  for (const value of clean) {
    const idx = Math.min(
      buckets.length - 1,
      Math.max(0, Math.floor((value - start) / bucketSize))
    )
    buckets[idx] += 1
  }

  return buckets.map((count, idx) => {
    const bucketStart = start + idx * bucketSize
    const bucketEnd = bucketStart + bucketSize
    return {
      range: `${currencyFormatter.format(bucketStart)}–${currencyFormatter.format(bucketEnd)}`,
      count,
    }
  })
}

const PIPELINE_STATUSES: JobStatus[] = [
  'wishlist',
  'applied',
  'interviewing',
  'offer',
  'rejected',
]

const STATUS_ORDER: Record<JobStatus, number> = {
  wishlist: 0,
  applied: 1,
  interviewing: 2,
  offer: 3,
  rejected: 3,
}

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  subtitle?: string
}

function StatsCard({ title, value, icon: Icon, color, subtitle }: StatsCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className="p-3 rounded-xl"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  )
}

function exportToCSV(jobs: Job[]) {
  const headers = [
    'Company',
    'Role',
    'Status',
    'Salary Min',
    'Salary Max',
    'Date Applied',
    'URL',
    'Notes',
    'Created At',
  ]

  const rows = jobs.map((job) => [
    job.company,
    job.role,
    job.status,
    job.salary_min || '',
    job.salary_max || '',
    job.date_applied || '',
    job.url || '',
    (job.notes || '').replace(/"/g, '""'),
    job.created_at,
  ])

  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${cell}"`).join(',')
    ),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `job-applications-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function DashboardPage() {
  const { data: jobs = [] } = useJobs()
  const {
    data: statusHistory = [],
    isLoading: isStatusHistoryLoading,
    error: statusHistoryError,
  } = useAllJobStatusHistory()
  const stats = useJobStats()
  const { data: timeSeriesData } = useApplicationsOverTime()
  const { data: statusData } = useStatusDistribution()

  const [goalPeriod, setGoalPeriod] = useState<GoalPeriod>('weekly')
  const [goalTarget, setGoalTarget] = useState<number>(10)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GOAL_STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw) as Partial<{
        period: GoalPeriod
        target: number
      }>

      if (parsed.period === 'daily' || parsed.period === 'weekly') {
        setGoalPeriod(parsed.period)
      }

      if (typeof parsed.target === 'number' && Number.isFinite(parsed.target) && parsed.target > 0) {
        setGoalTarget(Math.round(parsed.target))
      }
    } catch {
      // ignore malformed localStorage
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        GOAL_STORAGE_KEY,
        JSON.stringify({ period: goalPeriod, target: goalTarget })
      )
    } catch {
      // ignore storage failures
    }
  }, [goalPeriod, goalTarget])

  const goalMetrics = useMemo(() => {
    const appliedDates = jobs
      .map((job) => (job.date_applied ? parseISODateLocal(job.date_applied) : null))
      .filter((d): d is Date => !!d)

    const countsByKey: Record<string, number> = {}
    for (const date of appliedDates) {
      const key =
        goalPeriod === 'weekly'
          ? formatDateKey(startOfWeekSunday(date))
          : formatDateKey(date)
      countsByKey[key] = (countsByKey[key] || 0) + 1
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const periodStart = goalPeriod === 'weekly' ? startOfWeekSunday(today) : today
    const periodKey =
      goalPeriod === 'weekly'
        ? formatDateKey(startOfWeekSunday(periodStart))
        : formatDateKey(periodStart)

    const current = countsByKey[periodKey] || 0
    const target = Math.max(1, Math.round(goalTarget || 1))
    const progressPct = Math.min(100, (current / target) * 100)

    const stepDays = goalPeriod === 'weekly' ? 7 : 1
    let streak = 0
    let cursor = new Date(periodStart)

    for (let i = 0; i < 520; i += 1) {
      const key =
        goalPeriod === 'weekly'
          ? formatDateKey(startOfWeekSunday(cursor))
          : formatDateKey(cursor)
      const count = countsByKey[key] || 0
      if (count >= target) {
        streak += 1
        cursor = addDays(cursor, -stepDays)
      } else {
        break
      }
    }

    const periodLabel = goalPeriod === 'weekly' ? 'This week' : 'Today'
    const rangeLabel =
      goalPeriod === 'weekly'
        ? `${formatShortDate(periodStart)}–${formatShortDate(addDays(periodStart, 6))}`
        : formatShortDate(periodStart)

    return {
      periodLabel,
      rangeLabel,
      current,
      target,
      progressPct,
      streak,
    }
  }, [jobs, goalPeriod, goalTarget])

  const sourceFunnelRows = useMemo(() => {
    type SourceCounts = Record<JobStatus, number> & { total: number }

    const emptyCounts = (): SourceCounts => ({
      total: 0,
      wishlist: 0,
      applied: 0,
      interviewing: 0,
      offer: 0,
      rejected: 0,
    })

    const getSourceKey = (job: Job): string => {
      if (job.is_referral) return 'Referral'
      const src = (job.source ?? '').trim()
      return src || 'Unknown'
    }

    const bySource: Record<string, SourceCounts> = {}

    for (const job of jobs) {
      const key = getSourceKey(job)
      const bucket = (bySource[key] ??= emptyCounts())
      bucket.total += 1
      bucket[job.status] += 1
    }

    const rows = Object.entries(bySource).map(([source, counts]) => {
      const applications =
        counts.applied + counts.interviewing + counts.offer + counts.rejected
      const interviews = counts.interviewing + counts.offer

      const interviewRate = applications > 0 ? (interviews / applications) * 100 : 0
      const offerRate = applications > 0 ? (counts.offer / applications) * 100 : 0

      return {
        source,
        ...counts,
        applications,
        interviews,
        interviewRate,
        offerRate,
      }
    })

    return rows.sort((a, b) => b.total - a.total)
  }, [jobs])

  const salaryInsights = useMemo(() => {
    const salarySamples = jobs
      .map((job) => {
        const min = job.salary_min
        const max = job.salary_max

        let midpoint: number | null = null
        if (typeof min === 'number' && typeof max === 'number') midpoint = (min + max) / 2
        else if (typeof min === 'number') midpoint = min
        else if (typeof max === 'number') midpoint = max

        if (midpoint == null || !Number.isFinite(midpoint) || midpoint <= 0) return null
        return { job, midpoint }
      })
      .filter((item): item is { job: Job; midpoint: number } => !!item)

    const midpoints = salarySamples.map((item) => item.midpoint)
    const overallAverage =
      midpoints.length > 0
        ? midpoints.reduce((sum, value) => sum + value, 0) / midpoints.length
        : 0

    const distribution = buildSalaryBuckets(midpoints)

    const averageByStatus = PIPELINE_STATUSES.map((status) => {
      const items = salarySamples
        .filter((sample) => sample.job.status === status)
        .map((sample) => sample.midpoint)

      if (items.length === 0) return null
      const avg = items.reduce((sum, value) => sum + value, 0) / items.length

      return {
        status,
        label: STATUS_CONFIG[status].label,
        avg,
        count: items.length,
        color: STATUS_CONFIG[status].color,
      }
    }).filter(Boolean) as Array<{
      status: JobStatus
      label: string
      avg: number
      count: number
      color: string
    }>

    const companyMap = new Map<string, { company: string; sum: number; count: number }>()
    for (const { job, midpoint } of salarySamples) {
      const company = job.company.trim()
      if (!company) continue
      const key = company.toLowerCase()
      const existing = companyMap.get(key) ?? { company, sum: 0, count: 0 }
      existing.sum += midpoint
      existing.count += 1
      companyMap.set(key, existing)
    }

    const topCompanies = Array.from(companyMap.values())
      .map((row) => ({
        company: row.company,
        avg: row.sum / row.count,
        count: row.count,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8)

    return {
      sampleCount: salarySamples.length,
      overallAverage,
      distribution,
      averageByStatus,
      topCompanies,
    }
  }, [jobs])

  const sankeyData = useMemo(() => {
    const indexByStatus = new Map<JobStatus, number>()
    PIPELINE_STATUSES.forEach((status, idx) => indexByStatus.set(status, idx))

    const linkCounts = new Map<string, number>()
    for (const entry of statusHistory) {
      const from = entry.from_status
      const to = entry.to_status

      if (!indexByStatus.has(from) || !indexByStatus.has(to)) continue
      if (STATUS_ORDER[to] <= STATUS_ORDER[from]) continue

      const key = `${from}->${to}`
      linkCounts.set(key, (linkCounts.get(key) || 0) + 1)
    }

    const nodes = PIPELINE_STATUSES.map((status) => ({
      name: STATUS_CONFIG[status].label,
    }))

    const links = Array.from(linkCounts.entries())
      .map(([key, value]) => {
        const [from, to] = key.split('->') as [JobStatus, JobStatus]
        return {
          source: indexByStatus.get(from) ?? 0,
          target: indexByStatus.get(to) ?? 0,
          value,
        }
      })
      .filter((link) => link.value > 0)

    return { nodes, links }
  }, [statusHistory])

  // Format time series data for chart
  const chartData = timeSeriesData.map((item) => ({
    ...item,
    date: formatShortDate(parseISODateLocal(item.date)),
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Track your job search progress
          </p>
        </div>
        <button
          onClick={() => exportToCSV(jobs)}
          className="btn-secondary"
          disabled={jobs.length === 0}
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Onboarding */}
      {jobs.length === 0 ? (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Get started
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Add your first job to unlock analytics, or import a CSV from a spreadsheet.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Link to="/jobs" className="btn-primary w-fit">
              Go to Jobs
            </Link>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 self-center">
              Tip: Use “Import CSV” on the Jobs page.
            </p>
          </div>
        </div>
      ) : null}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Jobs"
          value={stats.totalJobs}
          icon={Briefcase}
          color="#6366f1"
          subtitle="All tracked jobs"
        />
        <StatsCard
          title="Applications Sent"
          value={stats.totalApplications}
          icon={Target}
          color="#3b82f6"
          subtitle="Excluding wishlist"
        />
        <StatsCard
          title="Interview Rate"
          value={`${stats.conversionRate}%`}
          icon={TrendingUp}
          color="#eab308"
          subtitle={`${stats.interviews} interviews`}
        />
        <StatsCard
          title="Offers"
          value={stats.offers}
          icon={CheckCircle}
          color="#22c55e"
          subtitle={`${stats.offerRate}% offer rate`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications Over Time */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Applications Over Time
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e4e4e7"
                  className="dark:stroke-zinc-700"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="#71717a"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#71717a"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  name="Applications"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-zinc-400">
              <p>No application data yet</p>
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Status Distribution
          </h2>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="status"
                  label={({ status, count }) =>
                    `${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].label}: ${count}`
                  }
                  labelLine={false}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    value,
                    STATUS_CONFIG[name as keyof typeof STATUS_CONFIG].label,
                  ]}
                />
                <Legend
                  formatter={(value: string) =>
                    STATUS_CONFIG[value as keyof typeof STATUS_CONFIG].label
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-zinc-400">
              <p>No jobs tracked yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Goals + Source Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goal Tracking */}
        <div className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Goal Tracking
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Based on applications with a Date Applied
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <div className="sm:w-44">
              <label className="label">Period</label>
              <select
                value={goalPeriod}
                onChange={(e) => setGoalPeriod(e.target.value as GoalPeriod)}
                className="input"
              >
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            <div className="sm:w-44">
              <label className="label">Goal</label>
              <input
                type="number"
                min={1}
                value={goalTarget}
                onChange={(e) => {
                  const next = Number(e.target.value)
                  if (!Number.isFinite(next)) return
                  setGoalTarget(Math.max(1, Math.round(next)))
                }}
                className="input"
              />
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  {goalMetrics.periodLabel}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {goalMetrics.rangeLabel}
                </p>
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                {goalMetrics.current} / {goalMetrics.target}
              </p>
            </div>

            <div className="mt-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-primary-600 dark:bg-primary-500"
                style={{ width: `${goalMetrics.progressPct}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <p className="text-zinc-500 dark:text-zinc-400">Streak</p>
              <p className="font-medium text-zinc-900 dark:text-white">
                {goalMetrics.streak}{' '}
                {goalPeriod === 'weekly' ? 'week' : 'day'}
                {goalMetrics.streak === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>

        {/* Funnel + Conversion by Source */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
            Funnel + Conversion by Source
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Referral uses the dedicated referral flag; everything else uses the Source field.
          </p>

          {sourceFunnelRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <th className="text-left py-2 pr-4">Source</th>
                    <th className="text-right py-2 px-2">W</th>
                    <th className="text-right py-2 px-2">A</th>
                    <th className="text-right py-2 px-2">I</th>
                    <th className="text-right py-2 px-2">O</th>
                    <th className="text-right py-2 px-2">R</th>
                    <th className="text-right py-2 px-2">Interview%</th>
                    <th className="text-right py-2 pl-2">Offer%</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceFunnelRows.map((row) => (
                    <tr
                      key={row.source}
                      className="border-t border-zinc-200 dark:border-zinc-800"
                    >
                      <td className="py-2 pr-4 font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                        {row.source}
                      </td>
                      <td className="py-2 px-2 text-right text-zinc-600 dark:text-zinc-300">
                        {row.wishlist}
                      </td>
                      <td className="py-2 px-2 text-right text-zinc-600 dark:text-zinc-300">
                        {row.applied}
                      </td>
                      <td className="py-2 px-2 text-right text-zinc-600 dark:text-zinc-300">
                        {row.interviewing}
                      </td>
                      <td className="py-2 px-2 text-right text-zinc-600 dark:text-zinc-300">
                        {row.offer}
                      </td>
                      <td className="py-2 px-2 text-right text-zinc-600 dark:text-zinc-300">
                        {row.rejected}
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-zinc-900 dark:text-white">
                        {formatPercent(row.interviewRate)}
                      </td>
                      <td className="py-2 pl-2 text-right font-medium text-zinc-900 dark:text-white">
                        {formatPercent(row.offerRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-zinc-400">
              <p>No jobs tracked yet</p>
            </div>
          )}

          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            W/A/I/O/R = Wishlist / Applied / Interviewing / Offer / Rejected. Interview% and Offer% are based on applications (all statuses except Wishlist).
          </p>
        </div>
      </div>

      {/* Salary + Sankey */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salary Insights */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Salary Insights
          </h2>

          {salaryInsights.sampleCount > 0 ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Jobs with salary</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                    {salaryInsights.sampleCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Avg midpoint</p>
                  <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
                    {currencyFormatter.format(salaryInsights.overallAverage)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                  Range Distribution
                </h3>
                {salaryInsights.distribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={salaryInsights.distribution}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e4e4e7"
                        className="dark:stroke-zinc-700"
                      />
                      <XAxis
                        dataKey="range"
                        tick={{ fontSize: 10 }}
                        stroke="#71717a"
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                        height={70}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#71717a"
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e4e4e7',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-zinc-400">
                    <p>No salary distribution data</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                  Average by Stage
                </h3>
                {salaryInsights.averageByStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={salaryInsights.averageByStatus}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e4e4e7"
                        className="dark:stroke-zinc-700"
                      />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#71717a" />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#71717a"
                        tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                      />
                      <Tooltip
                        formatter={(value: number) => currencyFormatter.format(value)}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e4e4e7',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                        {salaryInsights.averageByStatus.map((entry) => (
                          <Cell key={entry.status} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-zinc-400">
                    <p>No stage averages yet</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                  Average by Company
                </h3>
                {salaryInsights.topCompanies.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          <th className="text-left py-2 pr-4">Company</th>
                          <th className="text-right py-2 px-2">Avg</th>
                          <th className="text-right py-2 pl-2">Jobs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salaryInsights.topCompanies.map((row) => (
                          <tr
                            key={row.company}
                            className="border-t border-zinc-200 dark:border-zinc-800"
                          >
                            <td className="py-2 pr-4 font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                              {row.company}
                            </td>
                            <td className="py-2 px-2 text-right text-zinc-600 dark:text-zinc-300">
                              {currencyFormatter.format(row.avg)}
                            </td>
                            <td className="py-2 pl-2 text-right text-zinc-600 dark:text-zinc-300">
                              {row.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No company salary data yet
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-zinc-400">
              <p>Add salary min/max to jobs to see insights</p>
            </div>
          )}
        </div>

        {/* Sankey */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
            Pipeline Flow (Sankey)
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Shows forward status transitions that were logged when you changed a job’s status.
          </p>

          {statusHistoryError ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-zinc-400 text-center px-6">
              <p>Couldn’t load status history</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                If your database doesn’t have the status history table yet, run the V3 migration.
              </p>
            </div>
          ) : isStatusHistoryLoading ? (
            <div className="h-[300px] flex items-center justify-center text-zinc-400">
              <p>Loading status history…</p>
            </div>
          ) : sankeyData.links.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <Sankey
                data={sankeyData}
                nodePadding={20}
                nodeWidth={12}
                linkCurvature={0.5}
              >
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                  }}
                />
              </Sankey>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-zinc-400">
              <p>No status changes yet</p>
            </div>
          )}

          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Note: Backward transitions (e.g. Interviewing → Applied) are ignored to keep the flow readable.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          Status Breakdown
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map(
            (status) => (
              <div
                key={status}
                className="text-center p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800"
              >
                <div
                  className="w-3 h-3 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: STATUS_CONFIG[status].color }}
                />
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {stats.statusDistribution[status]}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {STATUS_CONFIG[status].label}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Conversion Formula */}
      <div className="card p-5 bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-900">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900">
            <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-primary-900 dark:text-primary-100">
              How Conversion Rate is Calculated
            </h3>
            <p className="mt-1 text-sm text-primary-700 dark:text-primary-300">
              Conversion % = (Interviews ÷ Applications) × 100
            </p>
            <p className="mt-2 text-sm text-primary-600 dark:text-primary-400">
              Your rate: ({stats.interviews} ÷ {stats.totalApplications}) × 100 ={' '}
              <strong>{stats.conversionRate}%</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
