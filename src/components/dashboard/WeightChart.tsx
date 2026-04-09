'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface WeightEntry {
  date: string
  weight: number
}

interface WeightChartProps {
  data: WeightEntry[]
}

interface TooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '8px 12px',
        }}
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>{label}</p>
        <p style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: 600, margin: '2px 0 0' }}>
          {payload[0].value} kg
        </p>
      </div>
    )
  }
  return null
}

export default function WeightChart({ data }: WeightChartProps) {
  // Format date labels to MM/DD
  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5).replace('-', '/'),
  }))

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ fill: 'var(--accent)', r: 3, strokeWidth: 0 }}
            activeDot={{ fill: 'var(--accent)', r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
