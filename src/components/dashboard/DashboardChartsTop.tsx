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
import { STATUS_CONFIG, StatusDataPoint, TimeSeriesDataPoint } from '@/types'

interface DashboardChartsTopProps {
  chartData: TimeSeriesDataPoint[]
  statusData: StatusDataPoint[]
}

export default function DashboardChartsTop({
  chartData,
  statusData,
}: DashboardChartsTopProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Applications Over Time */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          Applications Over Time
        </h2>
        {chartData.length > 0 ? (
          <div className="w-full h-72 sm:h-80 lg:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e4e4e7"
                className="dark:stroke-zinc-700"
              />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#71717a" />
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
          </div>
        ) : (
          <div className="h-72 sm:h-80 lg:h-96 flex items-center justify-center text-zinc-400">
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
          <div className="w-full h-72 sm:h-80 lg:h-96">
            <ResponsiveContainer width="100%" height="100%">
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
          </div>
        ) : (
          <div className="h-72 sm:h-80 lg:h-96 flex items-center justify-center text-zinc-400">
            <p>No jobs tracked yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
