'use client'

import { useState, useEffect } from 'react'
import { X, Pause, Play } from 'lucide-react'

interface WorkoutTimerProps {
  startedAt: number | null
  pausedAt: number | null
  totalPausedMs: number
  isPaused: boolean
  restTimer: {
    startAt: number
    duration: number
  } | null
  onFinish: () => void
  onPause: () => void
  onResume: () => void
  onCancelRest?: () => void
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function WorkoutTimer({
  startedAt, pausedAt, totalPausedMs, isPaused,
  restTimer, onFinish, onPause, onResume, onCancelRest,
}: WorkoutTimerProps) {
  const [elapsed, setElapsed] = useState(0)
  const [restRemaining, setRestRemaining] = useState(0)

  useEffect(() => {
    if (!startedAt) return

    const computeElapsed = () => {
      if (isPaused && pausedAt !== null) {
        return Math.floor((pausedAt - startedAt - totalPausedMs) / 1000)
      }
      return Math.floor((Date.now() - startedAt - totalPausedMs) / 1000)
    }

    setElapsed(Math.max(0, computeElapsed()))
    if (isPaused) return

    const id = setInterval(() => {
      setElapsed(Math.max(0, computeElapsed()))
    }, 1000)
    return () => clearInterval(id)
  }, [startedAt, pausedAt, totalPausedMs, isPaused])

  useEffect(() => {
    if (!restTimer) { setRestRemaining(0); return }
    const tick = () => {
      const remaining = Math.max(0, restTimer.duration - Math.floor((Date.now() - restTimer.startAt) / 1000))
      setRestRemaining(remaining)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [restTimer])

  if (!startedAt) return null

  const restProgress = restTimer ? (restRemaining / restTimer.duration) : 0

  return (
    <div className="sticky top-0 z-50 bg-bg-secondary border-b border-we-border px-4 py-2.5">
      <div className="flex items-center justify-between">
        {/* 왼쪽: 상태 + 타이머 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: isPaused ? '#FFB74D' : 'var(--accent)' }}>
            {isPaused ? '⏸ 일시정지' : '🔥 운동 중'}
          </span>
          <span
            className="tabular-nums text-lg font-bold"
            style={{ color: isPaused ? 'var(--text-secondary)' : 'var(--text-primary)' }}
          >
            {formatTime(elapsed)}
          </span>
        </div>

        {/* 오른쪽: 버튼들 */}
        <div className="flex items-center gap-2">
          {/* 일시정지 / 재개 — 항상 뚜렷하게 */}
          <button
            onClick={isPaused ? onResume : onPause}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-[8px] active:scale-95 transition-all"
            style={
              isPaused
                ? { backgroundColor: 'rgba(200,255,0,0.15)', border: '1.5px solid var(--accent)', color: 'var(--accent)' }
                : { backgroundColor: 'var(--border)', border: '1.5px solid var(--border)', color: 'var(--text-primary)' }
            }
          >
            {isPaused ? <Play size={12} fill="var(--accent)" /> : <Pause size={12} />}
            {isPaused ? '재개' : '일시정지'}
          </button>

          {/* 종료 */}
          <button
            onClick={onFinish}
            className="text-xs font-semibold px-3 py-1.5 rounded-[8px] active:scale-95 transition-all"
            style={{ backgroundColor: 'rgba(255,75,75,0.15)', border: '1.5px solid rgba(255,75,75,0.4)', color: 'var(--danger)' }}
          >
            종료
          </button>
        </div>
      </div>

      {/* 휴식 타이머 */}
      {restTimer && restRemaining > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-secondary">
              휴식 <span className="tabular-nums text-text-primary font-semibold">{formatTime(restRemaining)}</span>
            </span>
            <button onClick={onCancelRest} className="text-text-muted hover:text-text-secondary">
              <X size={14} />
            </button>
          </div>
          <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-1000"
              style={{ width: `${restProgress * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
