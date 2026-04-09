'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface WeeklyEntry {
  week: string
  calories: number
  workouts: number
}

const tooltipStyle = {
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 12,
}

export default function WeeklyComboChart({ data }: { data: WeeklyEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="week"
          tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
        />
        <YAxis
          yAxisId="cal"
          tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `${v}`}
        />
        <YAxis
          yAxisId="workout"
          orientation="right"
          tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          domain={[0, 10]}
          tickFormatter={v => `${v}회`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number, name: string) =>
            name === 'calories' ? [`${value.toLocaleString()} kcal`, '일평균 칼로리']
            : [`${value}회`, '운동 횟수']
          }
        />
        <Legend
          formatter={(v) => v === 'calories' ? '일평균 칼로리' : '운동 횟수'}
          wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }}
        />
        <Bar yAxisId="cal" dataKey="calories" fill="var(--accent)" opacity={0.7} radius={[4, 4, 0, 0]} />
        <Line
          yAxisId="workout"
          type="monotone"
          dataKey="workouts"
          stroke="#4FC3F7"
          strokeWidth={2}
          dot={{ fill: '#4FC3F7', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
