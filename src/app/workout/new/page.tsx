'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Dumbbell, Plus, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useWorkoutSession } from '@/lib/hooks/useWorkoutSession'
import WorkoutTimer from '@/components/workout/WorkoutTimer'
import ExerciseCard from '@/components/workout/ExerciseCard'
import type { Tables } from '@/lib/supabase/types'
import { motion, AnimatePresence } from 'framer-motion'

type Exercise = Tables<'exercises'> & { category?: string; brand?: string | null }

// ─── 메모이즈된 목록 아이템 (선택 상태 변경 시에만 리렌더) ────────────────────
const ExerciseListItem = memo(function ExerciseListItem({
  ex,
  isSelected,
  showBrand,
  onToggle,
}: {
  ex: Exercise
  isSelected: boolean
  showBrand: boolean
  onToggle: (ex: Exercise) => void
}) {
  return (
    <button
      onClick={() => onToggle(ex)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-we-border transition-colors text-left ${isSelected ? 'bg-accent/10' : 'hover:bg-bg-tertiary active:bg-bg-tertiary'}`}
    >
      <div className={`w-5 h-5 rounded-[6px] flex items-center justify-center flex-shrink-0 border-2 transition-all ${isSelected ? 'bg-accent border-accent' : 'border-we-border'}`}>
        {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="var(--bg-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-text-primary block truncate">{ex.name}</span>
        {showBrand && ex.brand && (
          <span className="text-[10px] text-accent">{ex.brand}</span>
        )}
      </div>
      <span className="text-xs text-text-muted shrink-0">{ex.equipment}</span>
    </button>
  )
})

const MOTIVATIONAL_MESSAGES = [
  { emoji: '🔥', msg: '수고했어요!', sub: '오늘도 최선을 다했습니다!' },
  { emoji: '💪', msg: '대단해요!', sub: '꾸준함이 결과를 만듭니다!' },
  { emoji: '🏆', msg: '완벽해요!', sub: '당신은 이미 승리자입니다!' },
  { emoji: '⚡', msg: '파워풀!', sub: '오늘 운동도 완료! 내일이 기대됩니다!' },
  { emoji: '🌟', msg: '빛나고 있어요!', sub: '꾸준히 하는 당신이 멋있습니다!' },
]

const MUSCLE_GROUPS = ['가슴', '등', '하체', '어깨', '팔', '복근', '유산소', '전신']

const MACHINE_BRANDS = [
  '전체',
  'Hammer Strength', 'Life Fitness', 'Nautilus', 'Cybex',
  'Technogym', 'Matrix Fitness', 'Panatta', 'Newtech',
  'Atlantis', 'Arsenal Strength', 'Watson', 'Precor',
]

export default function WorkoutNewPage() {
  const router = useRouter()
  const {
    session, isActive, isTimerRunning, isPaused, isLoading,
    startWorkout, beginTimer, pauseWorkout, resumeWorkout,
    addExercise, addSet, updateSet,
    completeSet, cancelRestTimer, removeSet, removeExercise,
    finishWorkout, cancelWorkout,
  } = useWorkoutSession()

  const [exercises, setExercises] = useState<Exercise[]>([])
  // 입력 즉시 반영 (포커스 안정) / 쿼리는 디바운스 후 DB 호출
  const [inputValue, setInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [showMotivation, setShowMotivation] = useState(false)
  const [motivationMsg] = useState(() =>
    MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]
  )

  // 다중 선택
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([])

  // 카테고리 탭: 프리웨이트 / 머신
  const [categoryTab, setCategoryTab] = useState<'free' | 'machine'>('free')
  const [selectedBrand, setSelectedBrand] = useState<string>(MACHINE_BRANDS[0])

  // 이전 기록 맵 (exercise_id → 이전 세트들)
  const [previousSetsMap, setPreviousSetsMap] = useState<Record<string, { weight_kg: number | null; reps: number | null }[]>>({})

  // 직접 추가 폼
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customMuscle, setCustomMuscle] = useState('가슴')
  const [customEquipment, setCustomEquipment] = useState('바벨')
  const [customAdding, setCustomAdding] = useState(false)

  const isSetup = isActive && !isTimerRunning

  // inputValue → searchQuery 디바운스 (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(inputValue), 300)
    return () => clearTimeout(timer)
  }, [inputValue])

  // 운동 종목 검색
  useEffect(() => {
    const supabase = createClient()
    const search = async () => {
      let query = supabase
        .from('exercises')
        .select('*')
        .order('muscle_group')
        .order('name')

      if (searchQuery) {
        // 검색 시엔 카테고리 무관하게 전체 검색
        query = query.ilike('name', `%${searchQuery}%`)
      } else if (categoryTab === 'free') {
        query = query.neq('category', 'machine')
      } else {
        // machine 탭
        query = query.eq('category', 'machine')
        if (selectedBrand !== '전체') {
          query = query.eq('brand', selectedBrand)
        }
      }

      const { data } = await query.limit(300)
      setExercises((data ?? []) as Exercise[])
    }
    search()
  }, [searchQuery, categoryTab, selectedBrand])

  const fetchPreviousSets = async (exerciseId: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data: recentWorkouts } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(10)
    if (!recentWorkouts?.length) return []
    const workoutIds = recentWorkouts.map(w => w.id)
    const { data: we } = await supabase
      .from('workout_exercises')
      .select('id')
      .eq('exercise_id', exerciseId)
      .in('workout_id', workoutIds)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!we) return []
    const { data: sets } = await supabase
      .from('sets')
      .select('set_number, weight_kg, reps')
      .eq('workout_exercise_id', we.id)
      .order('set_number')
    return sets ?? []
  }

  const handleStart = async () => { await startWorkout() }

  const toggleSelectExercise = useCallback((ex: Exercise) => {
    setSelectedExercises(prev =>
      prev.some(e => e.id === ex.id)
        ? prev.filter(e => e.id !== ex.id)
        : [...prev, ex]
    )
  }, [])

  // 근육 그룹별 그룹핑 캐시 (exercises 변경 시에만 재계산)
  const groupedExercises = useMemo(() =>
    MUSCLE_GROUPS
      .map(group => ({ group, items: exercises.filter(e => e.muscle_group === group) }))
      .filter(g => g.items.length > 0),
    [exercises]
  )

  const handleAddSelected = async () => {
    for (const ex of selectedExercises) {
      await addExercise(ex.id, ex.name, ex.muscle_group)
      const prevSets = await fetchPreviousSets(ex.id)
      if (prevSets.length > 0) {
        setPreviousSetsMap(prev => ({ ...prev, [ex.id]: prevSets }))
      }
    }
    setShowSearch(false)
    setInputValue('')
    setSearchQuery('')
    setShowCustomForm(false)
    setSelectedExercises([])
  }

  const handleAddCustom = async () => {
    if (!customName.trim()) return
    setCustomAdding(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          name: customName.trim(),
          muscle_group: customMuscle,
          equipment: customEquipment,
          description: null,
        })
        .select()
        .single()
      if (error) throw error
      if (data) await addExercise(data.id, data.name, data.muscle_group)
      setShowSearch(false)
      setInputValue('')
      setSearchQuery('')
      setShowCustomForm(false)
      setCustomName('')
    } catch {
      alert('운동 추가에 실패했습니다.')
    } finally {
      setCustomAdding(false)
    }
  }

  const handleFinish = async () => {
    if (finishing) return
    if (!confirm('운동을 종료하시겠습니까?')) return
    setFinishing(true)
    try {
      const workoutId = await finishWorkout()
      setRedirecting(true)
      setShowMotivation(true)
      setTimeout(() => router.push(`/workout/${workoutId}`), 2200)
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

  const muscleGroups = Array.from(new Set(exercises.map(e => e.muscle_group)))

  return (
    <div className="min-h-screen bg-bg-primary">

      {/* 동기부여 팝업 */}
      <AnimatePresence>
        {showMotivation && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="bg-bg-secondary rounded-[24px] p-8 text-center w-full max-w-sm border border-we-border"
            >
              <p className="text-6xl mb-4">{motivationMsg.emoji}</p>
              <p className="text-2xl font-bold text-accent mb-2">{motivationMsg.msg}</p>
              <p className="text-sm text-text-secondary">{motivationMsg.sub}</p>
              <div className="mt-6 flex justify-center gap-1">
                {[0,1,2].map(i => (
                  <motion.div key={i} className="w-2 h-2 rounded-full bg-accent"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.3 }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 타이머 헤더 */}
      {isTimerRunning && (
        <WorkoutTimer
          startedAt={session.startedAt}
          pausedAt={session.pausedAt}
          totalPausedMs={session.totalPausedMs}
          isPaused={isPaused}
          restTimer={session.restTimer}
          onFinish={handleFinish}
          onPause={pauseWorkout}
          onResume={resumeWorkout}
          onCancelRest={cancelRestTimer}
        />
      )}

      {/* 준비 중 헤더 */}
      {isSetup && (
        <header className="sticky top-0 z-50 bg-bg-primary border-b border-we-border px-4 h-14 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-text-primary">운동 준비</span>
            <span className="text-[10px] text-text-muted">종목을 추가하고 시작하세요</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCancel}
              className="px-3 py-1.5 rounded-[8px] text-xs font-medium text-text-secondary bg-bg-tertiary active:scale-95 transition-transform">
              취소
            </button>
            <button onClick={beginTimer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-bold bg-accent text-bg-primary active:scale-95 transition-transform shadow-md shadow-accent/20">
              ▶ 운동 시작
            </button>
          </div>
        </header>
      )}

      {/* 시작 전 화면 */}
      {!isActive && !redirecting && (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-6">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center mx-auto mb-4">
              <Dumbbell size={36} className="text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">운동 시작</h1>
            <p className="text-text-secondary text-sm">오늘도 최선을 다해봐요 💪</p>
          </div>
          <button onClick={handleStart} disabled={isLoading}
            className="w-full max-w-xs bg-accent text-bg-primary font-bold text-lg rounded-[16px] py-5 active:scale-95 transition-transform disabled:opacity-50">
            {isLoading ? '준비 중...' : '운동 준비하기'}
          </button>
          <button onClick={() => router.back()} className="text-text-muted text-sm">취소</button>
        </div>
      )}

      {/* 운동 중 화면 */}
      {isActive && (
        <div className="px-4 pt-4 pb-8">
          {session.exercises.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <p className="text-4xl mb-3">🏋️</p>
              <p className="text-sm mb-4">운동 종목을 추가해보세요</p>
              <button onClick={() => setShowSearch(true)}
                className="bg-accent text-bg-primary font-bold px-6 py-3 rounded-[12px] text-sm active:scale-95 transition-transform">
                종목 추가하기
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {session.exercises.map((ex, exIdx) => (
                <ExerciseCard
                  key={ex.id ?? exIdx}
                  exercise={ex}
                  exerciseIndex={exIdx}
                  previousSets={previousSetsMap[ex.exercise_id] ?? []}
                  onUpdateSet={updateSet}
                  onCompleteSet={completeSet}
                  onAddSet={addSet}
                  onRemoveSet={removeSet}
                  onRemove={removeExercise}
                />
              ))}
            </div>
          )}

          {session.exercises.length > 0 && (
            <button onClick={() => setShowSearch(true)}
              className="mt-4 w-full bg-bg-secondary border border-dashed border-we-border rounded-[16px] py-4 text-text-secondary text-sm flex items-center justify-center gap-2 active:bg-bg-tertiary transition-colors">
              <Plus size={16} />종목 추가하기
            </button>
          )}

          {isTimerRunning && (
            <button onClick={handleFinish}
              disabled={finishing}
              className="mt-6 w-full bg-bg-secondary border border-we-border text-text-secondary font-medium rounded-[12px] py-3 text-sm active:scale-[0.98] transition-transform disabled:opacity-40">
              {finishing ? '저장 중...' : '운동 종료하기'}
            </button>
          )}
        </div>
      )}

      {/* ── 운동 검색 모달 ── */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex flex-col justify-end"
            onClick={e => { if (e.target === e.currentTarget) { setShowSearch(false); setInputValue(''); setSearchQuery(''); setShowCustomForm(false); setSelectedExercises([]) } }}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-bg-secondary rounded-t-[24px] max-h-[92vh] flex flex-col"
            >
              {/* 핸들 */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-we-border rounded-full" />
              </div>

              {/* 헤더 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-we-border">
                <div>
                  <h3 className="font-semibold text-text-primary">운동 선택</h3>
                  {selectedExercises.length > 0 && (
                    <p className="text-xs text-accent">{selectedExercises.length}개 선택됨</p>
                  )}
                </div>
                <button onClick={() => { setShowSearch(false); setInputValue(''); setSearchQuery(''); setShowCustomForm(false); setSelectedExercises([]) }} className="text-text-muted p-1">
                  <X size={20} />
                </button>
              </div>

              {/* 검색창 */}
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-2 bg-bg-tertiary rounded-[12px] px-3 border border-we-border focus-within:border-accent">
                  <Search size={16} className="text-text-muted" />
                  <input
                    type="text"
                    placeholder="운동 이름 검색..."
                    value={inputValue}
                    onChange={e => { setInputValue(e.target.value); setShowCustomForm(false) }}
                    className="flex-1 bg-transparent py-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
                    autoFocus
                  />
                  {inputValue && (
                    <button onClick={() => { setInputValue(''); setSearchQuery('') }}>
                      <X size={14} className="text-text-muted" />
                    </button>
                  )}
                </div>
              </div>

              {/* 카테고리 탭 (검색 중엔 숨김) */}
              {!inputValue && (
                <div className="flex mx-4 mb-2 bg-bg-tertiary rounded-[10px] p-0.5">
                  {(['free', 'machine'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setCategoryTab(tab); setShowCustomForm(false) }}
                      className={`flex-1 py-2 rounded-[8px] text-xs font-semibold transition-colors ${
                        categoryTab === tab
                          ? 'bg-accent text-bg-primary'
                          : 'text-text-muted'
                      }`}
                    >
                      {tab === 'free' ? '🏋️ 프리웨이트' : '⚙️ 머신'}
                    </button>
                  ))}
                </div>
              )}

              {/* 머신 브랜드 선택 (머신 탭, 검색 중 아닐 때) */}
              {!inputValue && categoryTab === 'machine' && (
                <div className="px-4 pb-2">
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
                    {MACHINE_BRANDS.map(brand => (
                      <button
                        key={brand}
                        onClick={() => setSelectedBrand(brand)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
                          selectedBrand === brand
                            ? 'bg-accent text-bg-primary'
                            : 'bg-bg-tertiary text-text-secondary border border-we-border'
                        }`}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 목록 */}
              <div className="overflow-y-auto flex-1 pb-2">
                {/* 검색 결과 없음 — inputValue 기준(즉시 반응)으로 표시 */}
                {inputValue && exercises.length === 0 && !showCustomForm && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-text-muted mb-3">"{inputValue}" 검색 결과가 없어요</p>
                    <button
                      onClick={() => { setCustomName(inputValue); setShowCustomForm(true) }}
                      className="bg-accent text-bg-primary font-bold px-5 py-2.5 rounded-[10px] text-sm active:scale-95 transition-transform"
                    >
                      + "{inputValue}" 직접 추가하기
                    </button>
                  </div>
                )}

                {/* 머신 탭: 브랜드 정보 표시 */}
                {!inputValue && categoryTab === 'machine' && exercises.length > 0 && (
                  <p className="px-4 py-1.5 text-[10px] text-text-muted">
                    {selectedBrand} · {exercises.length}개 기구
                  </p>
                )}

                {/* 운동 목록 — useMemo 캐시된 groupedExercises + React.memo 아이템 */}
                {groupedExercises.map(({ group, items }) => (
                  <div key={group}>
                    <p className="px-4 py-2 text-xs font-semibold text-text-muted bg-bg-tertiary sticky top-0">
                      {group} ({items.length})
                    </p>
                    {items.map(ex => (
                      <ExerciseListItem
                        key={ex.id}
                        ex={ex}
                        isSelected={selectedExercises.some(e => e.id === ex.id)}
                        showBrand={!!inputValue}
                        onToggle={toggleSelectExercise}
                      />
                    ))}
                  </div>
                ))}

                {!showCustomForm && (
                  <button
                    onClick={() => { setCustomName(inputValue); setShowCustomForm(true) }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm text-text-muted hover:text-accent transition-colors border-t border-we-border mt-2"
                  >
                    <Plus size={15} />
                    찾는 운동이 없나요? 직접 추가하기
                  </button>
                )}

                {/* 선택 추가 버튼 */}
                {selectedExercises.length > 0 && (
                  <div className="sticky bottom-0 px-4 pb-4 pt-2 bg-gradient-to-t from-bg-secondary to-transparent">
                    <button
                      onClick={handleAddSelected}
                      className="w-full bg-accent text-bg-primary font-bold py-3.5 rounded-[14px] text-sm active:scale-[0.98] transition-transform shadow-lg shadow-accent/20"
                    >
                      {selectedExercises.length}개 종목 추가하기
                    </button>
                  </div>
                )}

                {/* 직접 추가 폼 */}
                <AnimatePresence>
                  {showCustomForm && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="mx-4 my-3 bg-bg-tertiary rounded-[14px] p-4 border border-we-border"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-text-primary">운동 직접 추가</span>
                        <button onClick={() => setShowCustomForm(false)} className="text-text-muted"><X size={16} /></button>
                      </div>
                      <div className="mb-3">
                        <label className="text-xs text-text-secondary mb-1 block">운동 이름 *</label>
                        <input
                          type="text" value={customName} onChange={e => setCustomName(e.target.value)}
                          placeholder="예) 케이블 크런치"
                          className="w-full bg-bg-secondary border border-we-border rounded-[8px] px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent placeholder:text-text-muted"
                          autoFocus
                        />
                      </div>
                      <div className="mb-3">
                        <label className="text-xs text-text-secondary mb-1 block">근육 부위 *</label>
                        <div className="relative">
                          <select value={customMuscle} onChange={e => setCustomMuscle(e.target.value)}
                            className="w-full bg-bg-secondary border border-we-border rounded-[8px] px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent appearance-none">
                            {MUSCLE_GROUPS.map(m => <option key={m} value={m} style={{ backgroundColor: 'var(--bg-secondary)' }}>{m}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="text-xs text-text-secondary mb-1 block">기구</label>
                        <div className="relative">
                          <select value={customEquipment} onChange={e => setCustomEquipment(e.target.value)}
                            className="w-full bg-bg-secondary border border-we-border rounded-[8px] px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent appearance-none">
                            {['바벨', '덤벨', '케이블', '머신', '맨몸', '기타'].map(e => (
                              <option key={e} value={e} style={{ backgroundColor: 'var(--bg-secondary)' }}>{e}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                        </div>
                      </div>
                      <button onClick={handleAddCustom} disabled={!customName.trim() || customAdding}
                        className="w-full bg-accent text-bg-primary font-bold py-3 rounded-[10px] text-sm active:scale-95 transition-transform disabled:opacity-40">
                        {customAdding ? '추가 중...' : '추가하고 세트 기록하기'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
