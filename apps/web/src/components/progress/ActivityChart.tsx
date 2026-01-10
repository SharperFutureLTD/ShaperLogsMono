'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'

interface ActivityChartProps {
  data: { date: string; count: number }[]
}

export function ActivityChart({ data }: ActivityChartProps) {
  // Ensure we have 30 days of data
  const chartData = useMemo(() => {
    const today = new Date()
    const result = []

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const existing = data.find(d => d.date === dateStr)
      result.push({
        date: dateStr,
        count: existing?.count || 0,
        isRecent: i < 7 // Last 7 days in green
      })
    }

    return result
  }, [data])

  const startDate = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - 29)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }, [])

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#141A17', border: '1px solid #2A332E' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: '#F1F5F3' }}>
          Activity
        </h3>
        <span className="text-xs" style={{ color: '#5C6660' }}>
          Last 30 days
        </span>
      </div>

      {/* Chart */}
      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="15%">
            <XAxis
              dataKey="date"
              tick={false}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Bar
              dataKey="count"
              radius={[2, 2, 0, 0]}
              maxBarSize={12}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isRecent ? '#34A853' : '#2A332E'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2">
        <span className="text-xs" style={{ color: '#5C6660' }}>
          {startDate}
        </span>
        <span className="text-xs" style={{ color: '#5C6660' }}>
          Today
        </span>
      </div>
    </div>
  )
}
