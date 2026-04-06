'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Plus, Check, Minus } from 'lucide-react'
import type { WorkoutExercise, SetData, SetType } from '@/lib/hooks/useWorkoutSession'

interface ExerciseCardProps {
  exercise: WorkoutExercise
  exerciseIndex: number
  previousSets?: { weight_kg: number | null; reps: number | null }[]
  onUpdateSet: (exerciseIndex: number, setIndex: number, updates: Partial<SetData>) => void
  onCompleteSet: (exerciseIndex: number, setIndex: number, restDuration?: number) => Promise<void>
  onAddSet: (exerciseIndex: number) => void
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void
  onRemove: (exerciseIndex: number) => void
  restDuration?: number
}

const REST_OPTIONS = [30, 60, 90, 120, 180]

const SET_TYPE_OPTIONS: { value: SetType; label: string; color: string }[] = [
  { value: 'normal', label: '기본', color: '#888888' },
  { value: 'warmup', label: '웜업', color: '#FFB74D' },
  { value: 'dropset', label: '드랍', color: '#FF6B6B' },
]

const muscleGroupColor: Record<string, string> = {
  '가슴': 'bg-blue-500/20 text-blue-300',
  '등': 'bg-green-500/20 text-green-300',
  '하체': 'bg-red-500/20 text-red-300',
  '어깨': 'bg-yellow-500/20 text-yellow-300',
  '팔': 'bg-purple-500/20 text-purple-300',
  '복근': 'bg-orange-500/20 text-orange-300',
  '유산소': 'bg-pink-500/20 text-pink-300',
  '전신': 'bg-teal-500/20 text-teal-300',
}

export default function ExerciseCard({
  exercise,
  exerciseIndex,
  previousSets = [],
  onUpdateSet,
  onCompleteSet,
  onAddSet,
  onRemoveSet,
  onRemove,
  restDuration = 90,
}: ExerciseCardProps) {
  const [completing, setCompleting] = useState<number | null>(null)
  const [selectedRest, setSelectedRest] = useState(restDuration)
  const [showRestPicker, setShowRestPicker] = useState(false)

  const fillPreviousSets = () => {
    previousSets.forEach((prevSet, i) => {
      if (i < exercise.sets.length && !exercise.sets[i].completed) {
        if (prevSet.weight_kg) onUpdateSet(exerciseIndex, i, { weight_kg: prevSet.weight_kg })
        if (prevSet.reps) onUpdateSet(exerciseIndex, i, { reps: prevSet.reps })
      }
    })
  }

  const hasPrevious = previousSets.length > 0
  const hasUnfilled = exercise.sets.some(s => !s.completed && (!s.weight_kg || !s.reps))

  const handleComplete = async (setIndex: number) => {
    const set = exercise.sets[setIndex]
    if (!set.weight_kg || !set.reps) return
    setCompleting(setIndex)
    try {
      await onCompleteSet(exerciseIndex, setIndex, selectedRest)
    } finally {
      setCompleting(null)
    }
  }

  const badgeClass = muscleGroupColor[exercise.muscle_group] ?? 'bg-[#242424] text-[#888888]'

  return (
    <div className="bg-[#1a1a1a] rounded-[16px] overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
            {exercise.muscle_group}
          </span>
          <span className="font-semibold text-[#f0f0f0]">{exercise.exercise_name}</span>
        </div>
        <div className="flex items-center gap-1">
          {hasPrevious && hasUnfilled && (
            <button
              onClick={fillPreviousSets}
              className="text-[10px] text-[#C8FF00] bg-[#C8FF00]/10 border border-[#C8FF00]/20 px-2 py-1 rounded-[6px] font-medium whitespace-nowrap"
            >
              이전 기록 채우기
            </button>
          )}
          <button
            onClick={() => onRemove(exerciseIndex)}
            className="text-[#555555] hover:text-[#FF4B4B] transition-colors p-1"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* 세트 목록 */}
      <div className="px-4 py-3 space-y-2">
        {/* 컬럼 헤더 */}
        <div className="grid grid-cols-[44px_1fr_1fr_1fr_40px_28px] gap-2 text-xs text-[#555555] mb-1">
          <span className="text-center">세트</span>
          <span className="text-center">종류</span>
          <span className="text-center">무게(kg)</span>
          <span className="text-center">횟수</span>
          <span />
          <span />
        </div>

        <AnimatePresence initial={false}>
          {exercise.sets.map((set, setIndex) => {
            const prevSet = previousSets[setIndex]
            const isCompleted = set.completed
            const isCompleting = completing === setIndex
            const setTypeInfo = SET_TYPE_OPTIONS.find(o => o.value === set.set_type) ?? SET_TYPE_OPTIONS[0]

            return (
              <motion.div
                key={setIndex}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className={`grid grid-cols-[44px_1fr_1fr_1fr_40px_28px] gap-2 items-center transition-all duration-200 ${
                  isCompleted
                    ? 'bg-[#C8FF00]/5 rounded-[10px] px-0'
                    : ''
                }`}
              >
                {/* 세트 번호 */}
                <span className={`text-center text-sm font-medium tabular-nums ${isCompleted ? 'text-[#C8FF00]/60' : 'text-[#888888]'}`}>
                  {set.set_number}
                </span>

                {/* 세트 종류 선택 */}
                <select
                  value={set.set_type}
                  onChange={e => onUpdateSet(exerciseIndex, setIndex, { set_type: e.target.value as SetType })}
                  disabled={isCompleted}
                  className="bg-[#242424] border border-[#2a2a2a] rounded-[8px] py-2 text-center text-xs outline-none disabled:opacity-40 appearance-none cursor-pointer"
                  style={{ color: setTypeInfo.color }}
                >
                  {SET_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} style={{ color: opt.color, backgroundColor: '#242424' }}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* 무게 입력 */}
                <div className="relative">
                  {prevSet?.weight_kg && !set.weight_kg && (
                    <span className="absolute inset-0 flex items-center justify-center text-sm text-[#333333] pointer-events-none tabular-nums">
                      {prevSet.weight_kg}
                    </span>
                  )}
                  <input
                    type="number"
                    value={set.weight_kg ?? ''}
                    onChange={e => onUpdateSet(exerciseIndex, setIndex, { weight_kg: Number(e.target.value) || null })}
                    disabled={isCompleted}
                    placeholder={prevSet?.weight_kg?.toString() ?? '0'}
                    className="w-full bg-[#242424] border border-[#2a2a2a] rounded-[10px] px-2 py-2 text-center text-sm text-[#f0f0f0] tabular-nums focus:border-[#C8FF00] outline-none disabled:opacity-40"
                    inputMode="decimal"
                    step="0.5"
                  />
                </div>

                {/* 횟수 입력 */}
                <div className="relative">
                  {prevSet?.reps && !set.reps && (
                    <span className="absolute inset-0 flex items-center justify-center text-sm text-[#333333] pointer-events-none tabular-nums">
                      {prevSet.reps}
                    </span>
                  )}
                  <input
                    type="number"
                    value={set.reps ?? ''}
                    onChange={e => onUpdateSet(exerciseIndex, setIndex, { reps: Number(e.target.value) || null })}
                    disabled={isCompleted}
                    placeholder={prevSet?.reps?.toString() ?? '0'}
                    className="w-full bg-[#242424] border border-[#2a2a2a] rounded-[10px] px-2 py-2 text-center text-sm text-[#f0f0f0] tabular-nums focus:border-[#C8FF00] outline-none disabled:opacity-40"
                    inputMode="numeric"
                  />
                </div>

                {/* 완료 버튼 */}
                <motion.button
                  whileTap={{ scale: 1.2 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => !isCompleted && handleComplete(setIndex)}
                  disabled={isCompleted || isCompleting || !set.weight_kg || !set.reps}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isCompleted
                      ? 'bg-[#C8FF00] shadow-lg shadow-[#C8FF00]/30'
                      : (set.weight_kg && set.reps)
                        ? 'bg-[#2a2a2a] border-2 border-[#555555] hover:border-[#C8FF00]/60 active:bg-[#C8FF00]/20'
                        : 'bg-[#1e1e1e] border border-[#2a2a2a]'
                  }`}
                >
                  {isCompleting ? (
                    <div className="w-3.5 h-3.5 border-2 border-[#888888] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check
                      size={15}
                      strokeWidth={isCompleted ? 3 : 2.5}
                      className={
                        isCompleted
                          ? 'text-[#0f0f0f]'
                          : (set.weight_kg && set.reps)
                            ? 'text-[#888888]'
                            : 'text-[#3a3a3a]'
                      }
                    />
                  )}
                </motion.button>

                {/* 세트 삭제 버튼 */}
                {!isCompleted && exercise.sets.length > 1 && (
                  <button
                    onClick={() => onRemoveSet(exerciseIndex, setIndex)}
                    className="w-6 h-6 flex items-center justify-center text-[#444444] hover:text-[#FF4B4B] transition-colors"
                  >
                    <Minus size={13} />
                  </button>
                )}
                {(isCompleted || exercise.sets.length <= 1) && <span />}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* 휴식 시간 선택 */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setShowRestPicker(!showRestPicker)}
          className="text-xs text-[#555555] hover:text-[#888888] transition-colors"
        >
          휴식 {selectedRest}초 {showRestPicker ? '▲' : '▼'}
        </button>
        {showRestPicker && (
          <div className="flex gap-2 mt-2">
            {REST_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => { setSelectedRest(s); setShowRestPicker(false) }}
                className={`flex-1 py-1 rounded-[8px] text-xs font-medium transition-colors
                  ${selectedRest === s
                    ? 'bg-[#C8FF00] text-[#0f0f0f]'
                    : 'bg-[#242424] text-[#888888]'
                  }`}
              >
                {s >= 60 ? `${s / 60}분` : `${s}초`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* + 세트 추가 */}
      <button
        onClick={() => onAddSet(exerciseIndex)}
        className="w-full py-2.5 flex items-center justify-center gap-1 text-xs text-[#555555] hover:text-[#C8FF00] border-t border-[#2a2a2a] transition-colors active:bg-[#242424]"
      >
        <Plus size={14} />
        세트 추가
      </button>
    </div>
  )
}
