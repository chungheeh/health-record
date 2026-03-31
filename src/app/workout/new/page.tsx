'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Dumbbell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useWorkoutSession } from '@/lib/hooks/useWorkoutSession'
import WorkoutTimer from '@/components/workout/WorkoutTimer'
import ExerciseCard from '@/components/workout/ExerciseCard'
import type { Tables } from '@/lib/supabase/types'
import { motion, AnimatePresence } from 'framer-motion'

type Exercise = Tables<'exercises'>

const MOTIVATIONAL_MESSAGES = [
  { emoji: '🔥', msg: '수고했어요!', sub: '오늘도 최선을 다했습니다!' },
  { emoji: '💪', msg: '대단해요!', sub: '꾸준함이 결과를 만듭니다!' },
  { emoji: '🏆', msg: '완벽해요!', sub: '당신은 이미 승리자입니다!' },
  { emoji: '⚡', msg: '파워풀!', sub: '오늘 운동도 완료! 내일이 기대됩니다!' },
  { emoji: '🌟', msg: '빛나고 있어요!', sub: '꾸준히 하는 당신이 멋있습니다!' },
]

export default function WorkoutNewPage() {
  const router = useRouter()
  const {
    session, isActive, isLoading,
    startWorkout, addExercise, addSet, updateSet,
    completeSet, cancelRestTimer, removeExercise,
    finishWorkout, cancelWorkout,
  } = useWorkoutSession()

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [showMotivation, setShowMotivation] = useState(false)
  const [motivationMsg] = useState(() =>
    MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]
  )

  // 운동 종목 검색
  useEffect(() => {
    const supabase = createClient()
    const search = async () => {
      let query = supabase.from('exercises').select('*').order('muscle_group').order('name')
      if (searchQuery) query = query.ilike('name', `%${searchQuery}%`)
      const { data } = await query.limit(50)
      setExercises(data ?? [])
    }
    search()
  }, [searchQuery])

  const handleStart = async () => {
    await startWorkout()
  }

  const handleAddExercise = async (ex: Exercise) => {
    await addExercise(ex.id, ex.name, ex.muscle_group)
    setShowSearch(false)
    setSearchQuery('')
  }

  const handleFinish = async () => {
    if (finishing || session.exercises.length === 0) return
    setFinishing(true)
    try {
      const workoutId = await finishWorkout()
      // 동기부여 팝업 먼저 보여주고 이동
      setShowMotivation(true)
      setTimeout(() => {
        setShowMotivation(false)
        router.push(`/workout/${workoutId}`)
      }, 2200)
    } catch {
      setFinishing(false)
    }
  }

  const handleCancel = async () => {
    if (confirm('운동을 취소하시겠습니까? 기록이 삭제됩니다.')) {
      await cancelWorkout()
      router.push('/')
    }
  }

  // 부위별 그룹핑
  const muscleGroups = Array.from(new Set(exercises.map(e => e.muscle_group)))

  return (
    <div className="min-h-screen bg-[#0f0f0f]">

      {/* ────────── 동기부여 팝업 ────────── */}
      <AnimatePresence>
        {showMotivation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="bg-[#1a1a1a] rounded-[24px] p-8 text-center w-full max-w-sm border border-[#2a2a2a]"
            >
              <p className="text-6xl mb-4">{motivationMsg.emoji}</p>
              <p className="text-2xl font-bold text-[#C8FF00] mb-2">{motivationMsg.msg}</p>
              <p className="text-sm text-[#888888]">{motivationMsg.sub}</p>
              <div className="mt-6 flex justify-center gap-1">
                {[0,1,2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#C8FF00]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.3 }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────── 워크아웃 타이머 (운동 중) ────────── */}
      {isActive && (
        <WorkoutTimer
          startedAt={session.startedAt}
          restTimer={session.restTimer}
          onFinish={handleFinish}
          onCancelRest={cancelRestTimer}
        />
      )}

      {/* ────────── 시작 전 화면 ────────── */}
      {!isActive && (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-6">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-[#C8FF00]/10 border-2 border-[#C8FF00]/30 flex items-center justify-center mx-auto mb-4">
              <Dumbbell size={36} className="text-[#C8FF00]" />
            </div>
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

      {/* ────────── 운동 중 화면 ────────── */}
      {isActive && (
        <div className="px-4 pt-4 pb-28">
          {session.exercises.length === 0 ? (
            <div className="text-center py-16 text-[#555555]">
              <p className="text-4xl mb-3">🏋️</p>
              <p className="text-sm mb-4">아래 버튼으로 운동을 추가해보세요</p>
              <button
                onClick={() => setShowSearch(true)}
                className="bg-[#C8FF00] text-[#0f0f0f] font-bold px-6 py-3 rounded-[12px] text-sm active:scale-95 transition-transform"
              >
                운동 추가하기
              </button>
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
                  onAddSet={addSet}
                  onRemove={removeExercise}
                />
              ))}
            </div>
          )}

          {/* 운동 추가 버튼 */}
          {session.exercises.length > 0 && (
            <button
              onClick={() => setShowSearch(true)}
              className="mt-4 w-full bg-[#1a1a1a] border border-dashed border-[#2a2a2a] rounded-[16px] py-4 text-[#888888] text-sm flex items-center justify-center gap-2 active:bg-[#242424] transition-colors"
            >
              <Search size={16} />
              운동 추가하기
            </button>
          )}
        </div>
      )}

      {/* ────────── 운동 검색 모달 ────────── */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end"
            onClick={e => { if (e.target === e.currentTarget) setShowSearch(false) }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-[#1a1a1a] rounded-t-[24px] max-h-[85vh] flex flex-col"
            >
              {/* 모달 핸들 */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-[#2a2a2a] rounded-full" />
              </div>

              {/* 모달 헤더 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
                <h3 className="font-semibold text-[#f0f0f0]">운동 선택</h3>
                <button onClick={() => setShowSearch(false)} className="text-[#555555] p-1">
                  <X size={20} />
                </button>
              </div>

              {/* 검색창 */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 bg-[#242424] rounded-[12px] px-3 border border-[#2a2a2a] focus-within:border-[#C8FF00]">
                  <Search size={16} className="text-[#555555]" />
                  <input
                    type="text"
                    placeholder="운동 이름 검색..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent py-3 text-sm text-[#f0f0f0] outline-none placeholder:text-[#555555]"
                    autoFocus
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')}>
                      <X size={14} className="text-[#555555]" />
                    </button>
                  )}
                </div>
              </div>

              {/* 운동 목록 */}
              <div className="overflow-y-auto flex-1 pb-6">
                {muscleGroups.map(group => {
                  const groupExercises = exercises.filter(e => e.muscle_group === group)
                  if (!groupExercises.length) return null
                  return (
                    <div key={group}>
                      <p className="px-4 py-2 text-xs font-semibold text-[#555555] bg-[#242424] sticky top-0">
                        {group} ({groupExercises.length})
                      </p>
                      {groupExercises.map(ex => (
                        <button
                          key={ex.id}
                          onClick={() => handleAddExercise(ex)}
                          className="w-full flex items-center justify-between px-4 py-3.5 border-b border-[#2a2a2a] hover:bg-[#242424] active:bg-[#242424] transition-colors text-left"
                        >
                          <span className="text-sm text-[#f0f0f0]">{ex.name}</span>
                          <span className="text-xs text-[#555555]">{ex.equipment}</span>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────── 운동 종료 하단 바 ────────── */}
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
