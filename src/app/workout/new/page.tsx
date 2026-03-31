'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useWorkoutSession } from '@/lib/hooks/useWorkoutSession'
import WorkoutTimer from '@/components/workout/WorkoutTimer'
import ExerciseCard from '@/components/workout/ExerciseCard'
import type { Tables } from '@/lib/supabase/types'

type Exercise = Tables<'exercises'>

export default function WorkoutNewPage() {
  const router = useRouter()
  const {
    session, isActive, isLoading,
    startWorkout, addExercise, updateSet,
    completeSet, cancelRestTimer, removeExercise,
    finishWorkout, cancelWorkout,
  } = useWorkoutSession()

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  // 경과 시간 업데이트
  useEffect(() => {
    if (!session.startedAt) return
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - session.startedAt!) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [session.startedAt])

  // 운동 종목 검색
  useEffect(() => {
    const supabase = createClient()
    const search = async () => {
      let query = supabase.from('exercises').select('*').order('muscle_group')
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`)
      }
      const { data } = await query.limit(20)
      setExercises(data ?? [])
    }
    search()
  }, [searchQuery])

  const handleStart = async () => {
    await startWorkout()
    setShowSearch(true)
  }

  const handleAddExercise = async (ex: Exercise) => {
    await addExercise(ex.id, ex.name, ex.muscle_group)
    setShowSearch(false)
    setSearchQuery('')
  }

  const handleFinish = async () => {
    if (finishing) return
    setFinishing(true)
    try {
      const workoutId = await finishWorkout()
      router.push(`/workout/${workoutId}`)
    } catch {
      setFinishing(false)
    }
  }

  const handleCancel = async () => {
    if (confirm('운동을 취소하시겠습니까?')) {
      await cancelWorkout()
      router.push('/')
    }
  }

  // 부위별 그룹핑
  const muscleGroups = Array.from(new Set(exercises.map(e => e.muscle_group)))

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* 워크아웃 타이머 */}
      {isActive && (
        <WorkoutTimer
          startedAt={session.startedAt}
          restTimer={session.restTimer}
          onFinish={handleFinish}
          onCancelRest={cancelRestTimer}
        />
      )}

      {/* 시작 전 화면 */}
      {!isActive && (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#f0f0f0] mb-2">운동 시작</h1>
            <p className="text-[#888888] text-sm">오늘도 최선을 다해봐요 💪</p>
          </div>
          <button
            onClick={handleStart}
            disabled={isLoading}
            className="w-full max-w-xs bg-[#C8FF00] text-[#0f0f0f] font-bold text-lg rounded-[16px] py-5 active:scale-95 transition-transform disabled:opacity-50"
          >
            {isLoading ? '준비 중...' : '운동 시작하기'}
          </button>
          <button onClick={() => router.back()} className="text-[#555555] text-sm">취소</button>
        </div>
      )}

      {/* 운동 중 화면 */}
      {isActive && (
        <div className="px-4 pt-4 pb-28">
          {/* 추가된 운동 카드 목록 */}
          {session.exercises.length === 0 ? (
            <div className="text-center py-16 text-[#555555]">
              <p className="text-4xl mb-3">🏋️</p>
              <p className="text-sm">아래 버튼으로 운동을 추가해보세요</p>
            </div>
          ) : (
            <div className="space-y-4">
              {session.exercises.map((ex, exIdx) => (
                <ExerciseCard
                  key={ex.id ?? exIdx}
                  exercise={ex}
                  exerciseIndex={exIdx}
                  onUpdateSet={updateSet}
                  onCompleteSet={completeSet}
                  onRemove={removeExercise}
                />
              ))}
            </div>
          )}

          {/* 운동 추가 버튼 */}
          <button
            onClick={() => setShowSearch(true)}
            className="mt-4 w-full bg-[#1a1a1a] border border-dashed border-[#2a2a2a] rounded-[16px] py-4 text-[#888888] text-sm flex items-center justify-center gap-2"
          >
            <Search size={16} />
            운동 추가하기
          </button>
        </div>
      )}

      {/* 운동 검색 모달 */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end">
          <div className="bg-[#1a1a1a] rounded-t-[24px] max-h-[80vh] flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[#2a2a2a]">
              <h3 className="font-semibold text-[#f0f0f0]">운동 선택</h3>
              <button onClick={() => setShowSearch(false)} className="text-[#555555]">
                <X size={20} />
              </button>
            </div>

            {/* 검색창 */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 bg-[#242424] rounded-[12px] px-3">
                <Search size={16} className="text-[#555555]" />
                <input
                  type="text"
                  placeholder="운동 이름 검색..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent py-3 text-sm text-[#f0f0f0] outline-none placeholder:text-[#555555]"
                  autoFocus
                />
              </div>
            </div>

            {/* 운동 목록 */}
            <div className="overflow-y-auto flex-1 pb-6">
              {muscleGroups.map(group => {
                const groupExercises = exercises.filter(e => e.muscle_group === group)
                if (!groupExercises.length) return null
                return (
                  <div key={group}>
                    <p className="px-4 py-2 text-xs font-semibold text-[#555555] bg-[#242424]">
                      {group}
                    </p>
                    {groupExercises.map(ex => (
                      <button
                        key={ex.id}
                        onClick={() => handleAddExercise(ex)}
                        className="w-full flex items-center justify-between px-4 py-3.5 border-b border-[#2a2a2a] hover:bg-[#242424] transition-colors text-left"
                      >
                        <span className="text-sm text-[#f0f0f0]">{ex.name}</span>
                        <span className="text-xs text-[#555555]">{ex.equipment}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 운동 종료 하단 바 */}
      {isActive && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0f0f0f] border-t border-[#2a2a2a] px-4 py-3 flex gap-3 z-40">
          <button
            onClick={handleCancel}
            className="flex-1 bg-[#242424] text-[#888888] font-medium rounded-[12px] py-3.5 text-sm"
          >
            취소
          </button>
          <button
            onClick={handleFinish}
            disabled={finishing || session.exercises.length === 0}
            className="flex-[2] bg-[#C8FF00] text-[#0f0f0f] font-bold rounded-[12px] py-3.5 text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {finishing ? '저장 중...' : '운동 종료'}
          </button>
        </div>
      )}
    </div>
  )
}
