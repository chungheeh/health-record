'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Trash2, ChevronRight, ChevronDown } from 'lucide-react'

interface WorkoutSummary {
  id: string
  started_at: string
  finished_at: string | null
  total_seconds: number | null
  exercise_count: number
  total_volume: number
  exercise_names: string[]
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}시간 ${m}분`
  if (m > 0) return `${m}분`
  return `${seconds}초`
}

const INITIAL_SHOW = 3

export default function TodayWorkouts({ date }: { date: string }) {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const fetchWorkouts = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('workouts')
      .select(`
        id, started_at, finished_at, total_seconds,
        workout_exercises(
          exercises(name),
          sets(weight_kg, reps, set_type)
        )
      `)
      .gte('started_at', `${date}T00:00:00`)
      .lte('started_at', `${date}T23:59:59`)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })

    if (data) {
      const summaries: WorkoutSummary[] = data.map((w) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const exRows = (w.workout_exercises as any[]) ?? []
        const exerciseNames = exRows
          .map((ex) => ex.exercises?.name as string)
          .filter(Boolean)
        const totalVolume = exRows.reduce((sum: number, ex) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const normalSets = (ex.sets as any[]).filter(
            (s) => (!s.set_type || s.set_type === 'normal') && s.weight_kg && s.reps
          )
          return sum + normalSets.reduce(
            (s: number, set: { weight_kg: number; reps: number }) =>
              s + set.weight_kg * set.reps,
            0
          )
        }, 0)
        return {
          id: w.id,
          started_at: w.started_at,
          finished_at: w.finished_at,
          total_seconds: w.total_seconds,
          exercise_count: exRows.length,
          total_volume: Math.round(totalVolume),
          exercise_names: exerciseNames.slice(0, 3),
        }
      })
      setWorkouts(summaries)
    }
    setLoading(false)
  }, [date])

  useEffect(() => { fetchWorkouts() }, [fetchWorkouts])

  const handleDelete = async (workoutId: string) => {
    if (!confirm('이 운동 기록을 삭제하시겠습니까?')) return
    setDeleting(workoutId)
    const supabase = createClient()
    await supabase.from('workouts').delete().eq('id', workoutId)
    await fetchWorkouts()
    setDeleting(null)
  }

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] rounded-[16px] p-4 flex items-center justify-center h-20">
        <div className="w-5 h-5 border-2 border-[#C8FF00] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (workouts.length === 0) {
    return (
      <div className="bg-[#1a1a1a] rounded-[16px] p-5 text-center">
        <p className="text-3xl mb-2">🏋️</p>
        <p className="text-sm text-[#555555]">이 날 운동 기록이 없습니다</p>
      </div>
    )
  }

  const displayed = showAll ? workouts : workouts.slice(0, INITIAL_SHOW)
  const hiddenCount = workouts.length - INITIAL_SHOW

  return (
    <div className="space-y-3">
      {displayed.map((w) => (
        <div key={w.id} className="bg-[#1a1a1a] rounded-[16px] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
            <span className="text-xs text-[#888888]">
              {new Date(w.started_at).toLocaleTimeString('ko-KR', {
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/workout/${w.id}`}
                className="text-xs text-[#C8FF00] flex items-center gap-0.5"
              >
                상세 <ChevronRight size={12} />
              </Link>
              <button
                onClick={() => handleDelete(w.id)}
                disabled={deleting === w.id}
                className="text-[#555555] hover:text-[#FF4B4B] transition-colors p-1 disabled:opacity-40"
              >
                {deleting === w.id
                  ? <span className="text-xs">삭제 중</span>
                  : <Trash2 size={14} />
                }
              </button>
            </div>
          </div>

          <Link href={`/workout/${w.id}`} className="block px-4 py-3">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <p className="text-base font-bold text-[#C8FF00] tabular-nums">
                  {formatDuration(w.total_seconds)}
                </p>
                <p className="text-[10px] text-[#555555] mt-0.5">시간</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-[#f0f0f0] tabular-nums">
                  {w.exercise_count}
                </p>
                <p className="text-[10px] text-[#555555] mt-0.5">종목</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-[#f0f0f0] tabular-nums">
                  {w.total_volume.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#555555] mt-0.5">볼륨(kg)</p>
              </div>
            </div>
            {w.exercise_names.length > 0 && (
              <p className="text-xs text-[#555555] truncate">
                {w.exercise_names.join(' · ')}
                {w.exercise_count > 3 ? ` 외 ${w.exercise_count - 3}개` : ''}
              </p>
            )}
          </Link>
        </div>
      ))}

      {/* 더보기 / 접기 버튼 */}
      {workouts.length > INITIAL_SHOW && (
        <button
          onClick={() => setShowAll(prev => !prev)}
          className="w-full flex items-center justify-center gap-1.5 py-3 bg-[#1a1a1a] rounded-[16px] text-xs text-[#888888] border border-[#2a2a2a] active:bg-[#242424] transition-colors"
        >
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`}
          />
          {showAll ? '접기' : `${hiddenCount}개 더보기`}
        </button>
      )}
    </div>
  )
}
