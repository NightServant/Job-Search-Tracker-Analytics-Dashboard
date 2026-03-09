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
} from 'recharts'
import { useJobStats, useApplicationsOverTime, useStatusDistribution } from '@/hooks/useJobStats'
import { useJobs } from '@/hooks/useJobs'
import { Job, STATUS_CONFIG } from '@/types'

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
  const stats = useJobStats()
  const { data: timeSeriesData } = useApplicationsOverTime()
  const { data: statusData } = useStatusDistribution()

  // Format time series data for chart
  const chartData = timeSeriesData.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
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
      <div className="card p-5 bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-900">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">
              How Conversion Rate is Calculated
            </h3>
            <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-300">
              Conversion % = (Interviews ÷ Applications) × 100
            </p>
            <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400">
              Your rate: ({stats.interviews} ÷ {stats.totalApplications}) × 100 ={' '}
              <strong>{stats.conversionRate}%</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
