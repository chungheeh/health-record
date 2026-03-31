'use client'

interface HeatmapEntry {
  date: string
  count: number
}

interface WorkoutHeatmapProps {
  data: HeatmapEntry[]
}

function getCellColor(count: number): string {
  if (count === 0) return '#1e1e1e'
  if (count === 1) return 'rgba(74, 255, 74, 0.3)'
  return 'rgba(200, 255, 0, 0.7)'
}

export default function WorkoutHeatmap({ data }: WorkoutHeatmapProps) {
  // Build a map for quick lookup
  const countMap = new Map<string, number>()
  data.forEach((d) => {
    countMap.set(d.date, d.count)
  })

  // Generate 84 days (12 weeks x 7 days), oldest first
  const days: { date: string; count: number }[] = []
  const today = new Date()
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    days.push({ date: dateStr, count: countMap.get(dateStr) ?? 0 })
  }

  // Split into 12 columns (weeks), each with up to 7 days
  const weeks: typeof days[] = []
  for (let w = 0; w < 12; w++) {
    weeks.push(days.slice(w * 7, w * 7 + 7))
  }

  // Compute month labels per week (label for first day of week)
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  const weekMonthLabels = weeks.map((week) => {
    const firstDay = new Date(week[0].date)
    // Show label only when month changes (or first week)
    return { month: firstDay.getMonth(), label: monthNames[firstDay.getMonth()] }
  })

  // Deduplicate: show label only when it changes from previous week
  const labels = weekMonthLabels.map((item, i) => {
    if (i === 0 || item.month !== weekMonthLabels[i - 1].month) {
      return item.label
    }
    return ''
  })

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-flex flex-col gap-1" style={{ minWidth: '100%' }}>
        {/* Month labels row */}
        <div className="flex gap-1">
          {labels.map((label, i) => (
            <div
              key={i}
              className="flex-1 text-center"
              style={{ fontSize: '10px', color: '#888888', minWidth: '20px' }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid: 7 rows x 12 columns */}
        {Array.from({ length: 7 }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-1">
            {weeks.map((week, colIdx) => {
              const cell = week[rowIdx]
              if (!cell) {
                return (
                  <div
                    key={colIdx}
                    className="flex-1"
                    style={{
                      aspectRatio: '1/1',
                      minWidth: '20px',
                      borderRadius: '3px',
                      backgroundColor: 'transparent',
                    }}
                  />
                )
              }
              return (
                <div
                  key={colIdx}
                  className="flex-1"
                  title={`${cell.date}: ${cell.count}회`}
                  style={{
                    aspectRatio: '1/1',
                    minWidth: '20px',
                    borderRadius: '3px',
                    backgroundColor: getCellColor(cell.count),
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3" style={{ color: '#888888', fontSize: '11px' }}>
        <span>없음</span>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '2px',
            backgroundColor: '#1e1e1e',
            border: '1px solid #2a2a2a',
          }}
        />
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '2px',
            backgroundColor: 'rgba(74, 255, 74, 0.3)',
          }}
        />
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '2px',
            backgroundColor: 'rgba(200, 255, 0, 0.7)',
          }}
        />
        <span>2회 이상</span>
      </div>
    </div>
  )
}
