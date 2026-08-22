import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Sankey,
} from 'recharts'
import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { JobStatus } from '@/types'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

type SalaryDistributionDatum = {
  range: string
  count: number
}

type SalaryAverageByStatusDatum = {
  status: JobStatus
  label: string
  avg: number
  count: number
  color: string
}

type SalaryTopCompanyDatum = {
  company: string
  avg: number
  count: number
}

export interface SalaryInsights {
  sampleCount: number
  overallAverage: number
  distribution: SalaryDistributionDatum[]
  averageByStatus: SalaryAverageByStatusDatum[]
  topCompanies: SalaryTopCompanyDatum[]
}

type SankeyData = {
  nodes: Array<{ name: string }>
  links: Array<{ source: number; target: number; value: number }>
}

interface DashboardChartsBottomProps {
  salaryInsights: SalaryInsights
  sankeyData: SankeyData
  isStatusHistoryLoading: boolean
  hasStatusHistoryError: boolean
}

export default function DashboardChartsBottom({
  salaryInsights,
  sankeyData,
  isStatusHistoryLoading,
  hasStatusHistoryError,
}: DashboardChartsBottomProps) {
  const [showSalaryDetails, setShowSalaryDetails] = useState(false)
  const [showSankeyDetails, setShowSankeyDetails] = useState(false)
  const [isLargeScreen, setIsLargeScreen] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const updateScreenSize = () => setIsLargeScreen(mediaQuery.matches)

    updateScreenSize()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateScreenSize)
      return () => mediaQuery.removeEventListener('change', updateScreenSize)
    }

    mediaQuery.addListener(updateScreenSize)
    return () => mediaQuery.removeListener(updateScreenSize)
  }, [])

  return (
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
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Jobs with salary
                </p>
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

            {/* Show Details Toggle */}
            <button
              onClick={() => setShowSalaryDetails(!showSalaryDetails)}
              className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors lg:hidden"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showSalaryDetails ? 'rotate-180' : ''}`}
              />
              {showSalaryDetails ? 'Hide Details' : 'Show Details'}
            </button>

            {(showSalaryDetails || isLargeScreen) && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                    Range Distribution
                  </h3>
                  {salaryInsights.distribution.length > 0 ? (
                    <div className="w-full h-56 sm:h-60 lg:h-64">
                      <ResponsiveContainer width="100%" height="100%">
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
                    </div>
                  ) : (
                    <div className="h-56 sm:h-60 lg:h-64 flex items-center justify-center text-zinc-400">
                      <p>No salary distribution data</p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                    Average by Stage
                  </h3>
                  {salaryInsights.averageByStatus.length > 0 ? (
                    <div className="w-full h-56 sm:h-60 lg:h-64">
                      <ResponsiveContainer width="100%" height="100%">
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
                    </div>
                  ) : (
                    <div className="h-56 sm:h-60 lg:h-64 flex items-center justify-center text-zinc-400">
                      <p>No salary data by stage</p>
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
              </>
            )}
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
        {/* Show Details Toggle */}
        <button
          onClick={() => setShowSankeyDetails(!showSankeyDetails)}
          className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors mb-4 lg:hidden"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${showSankeyDetails ? 'rotate-180' : ''}`}
          />
          {showSankeyDetails ? 'Hide Flow Chart' : 'Show Flow Chart'}
        </button>

        {(showSankeyDetails || isLargeScreen) && (
          <>
            {hasStatusHistoryError ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-zinc-400 text-center px-6">
                <p>Couldn’t load status history</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                  Status history isn’t available right now. Please try again later — or consult the app
                  documentation or contact support to enable this feature.
                </p>
              </div>
            ) : isStatusHistoryLoading ? (
              <div className="h-[300px] flex items-center justify-center text-zinc-400">
                <p>Loading status history…</p>
              </div>
            ) : sankeyData.links.length > 0 ? (
              <div className="w-full h-72 sm:h-80 lg:h-96">
                <ResponsiveContainer width="100%" height="100%">
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
              </div>
            ) : (
              <div className="h-72 sm:h-80 lg:h-96 flex items-center justify-center text-zinc-400">
                <p>No status changes yet</p>
              </div>
            )}

            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Note: Backward transitions (e.g. Interviewing → Applied) are ignored to keep the flow readable.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
