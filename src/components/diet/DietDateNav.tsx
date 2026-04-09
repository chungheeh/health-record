'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DietDateNavProps {
  date: string // YYYY-MM-DD
}

export default function DietDateNav({ date }: DietDateNavProps) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const isToday = date === today

  const navigate = (direction: 'prev' | 'next') => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + (direction === 'next' ? 1 : -1))
    router.push(`/diet?date=${d.toISOString().split('T')[0]}`)
  }

  const dateObj = new Date(date + 'T12:00:00')
  const label = isToday
    ? '오늘'
    : dateObj.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => navigate('prev')}
        className="p-1.5 text-text-secondary hover:text-text-primary active:text-accent transition-colors"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm text-text-primary font-medium min-w-[80px] text-center tabular-nums">
        {label}
      </span>
      <button
        onClick={() => navigate('next')}
        disabled={isToday}
        className="p-1.5 text-text-secondary hover:text-text-primary active:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
