'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface CalorieEntry {
  date: string
  label: string
  calories: number
}

interface CalorieBarChartProps {
  data: CalorieEntry[]
  targetCalories?: number
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
          {payload[0].value.toLocaleString()} kcal
        </p>
      </div>
    )
  }
  return null
}

export default function CalorieBarChart({ data, targetCalories }: CalorieBarChartProps) {
  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--accent)', opacity: 0.05 }} />
          {targetCalories && (
            <ReferenceLine
              y={targetCalories}
              stroke="var(--accent)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              label={{ value: '목표', fill: 'var(--accent)', fontSize: 10, position: 'insideTopRight' }}
            />
          )}
          <Bar dataKey="calories" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
