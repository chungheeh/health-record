'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateOneRM } from '@/lib/utils/1rm'

export type SetType = 'normal' | 'warmup' | 'dropset'

export interface SetData {
  id?: string
  set_number: number
  set_type: SetType
  weight_kg: number | null
  reps: number | null
  rest_seconds?: number | null
  one_rm?: number | null
  completed: boolean
}

export interface WorkoutExercise {
  id?: string
  exercise_id: string
  exercise_name: string
  muscle_group: string
  order_index: number
  sets: SetData[]
}

export interface WorkoutSessionState {
  workoutId: string | null
  startedAt: number | null       // null = 준비 중 (타이머 미시작), 숫자 = 타이머 시작 시각 ms
  pausedAt: number | null        // 일시정지 시작 시각
  totalPausedMs: number          // 누적 일시정지 ms
  exercises: WorkoutExercise[]
  restTimer: {
    startAt: number
    duration: number
    exerciseId: string
    setNumber: number
  } | null
}

const STORAGE_KEY = 'we_workout_session'

function loadFromStorage(): WorkoutSessionState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveToStorage(state: WorkoutSessionState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function clearStorage() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

const initialState: WorkoutSessionState = {
  workoutId: null,
  startedAt: null,
  pausedAt: null,
  totalPausedMs: 0,
  exercises: [],
  restTimer: null,
}

export function useWorkoutSession() {
  const [session, setSession] = useState<WorkoutSessionState>(initialState)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const saved = loadFromStorage()
    if (saved?.workoutId) {
      setSession({
        ...saved,
        pausedAt: saved.pausedAt ?? null,
        totalPausedMs: saved.totalPausedMs ?? 0,
      })
    }
  }, [])

  useEffect(() => {
    if (session.workoutId) {
      saveToStorage(session)
    }
  }, [session])

  // ── 1단계: 준비 (DB 워크아웃 생성, 타이머는 아직 시작 안함) ──
  const startWorkout = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다')

      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('workouts')
        .insert({ user_id: user.id, started_at: now })
        .select()
        .single()

      if (error) throw error

      const newSession: WorkoutSessionState = {
        workoutId: data.id,
        startedAt: null,       // 타이머 아직 미시작
        pausedAt: null,
        totalPausedMs: 0,
        exercises: [],
        restTimer: null,
      }
      setSession(newSession)
      saveToStorage(newSession)
      return data.id
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // ── 2단계: 타이머 시작 ──
  const beginTimer = useCallback(() => {
    setSession(prev => {
      if (!prev.workoutId || prev.startedAt !== null) return prev
      const updated = { ...prev, startedAt: Date.now() }
      saveToStorage(updated)
      return updated
    })
  }, [])

  // 일시정지
  const pauseWorkout = useCallback(() => {
    setSession(prev => {
      if (!prev.workoutId || prev.pausedAt !== null) return prev
      return { ...prev, pausedAt: Date.now() }
    })
  }, [])

  // 재개
  const resumeWorkout = useCallback(() => {
    setSession(prev => {
      if (!prev.workoutId || prev.pausedAt === null) return prev
      const pausedDuration = Date.now() - prev.pausedAt
      return {
        ...prev,
        pausedAt: null,
        totalPausedMs: prev.totalPausedMs + pausedDuration,
      }
    })
  }, [])

  // 종목 추가
  const addExercise = useCallback(async (
    exerciseId: string,
    exerciseName: string,
    muscleGroup: string
  ) => {
    if (!session.workoutId) return

    const orderIndex = session.exercises.length
    const { data, error } = await supabase
      .from('workout_exercises')
      .insert({
        workout_id: session.workoutId,
        exercise_id: exerciseId,
        order_index: orderIndex,
      })
      .select()
      .single()

    if (error) throw error

    const newExercise: WorkoutExercise = {
      id: data.id,
      exercise_id: exerciseId,
      exercise_name: exerciseName,
      muscle_group: muscleGroup,
      order_index: orderIndex,
      sets: [{ set_number: 1, set_type: 'normal', weight_kg: null, reps: null, completed: false }],
    }

    setSession(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise],
    }))
  }, [session.workoutId, session.exercises.length, supabase])

  // 세트 업데이트
  const updateSet = useCallback((
    exerciseIndex: number,
    setIndex: number,
    updates: Partial<SetData>
  ) => {
    setSession(prev => {
      const exercises = [...prev.exercises]
      exercises[exerciseIndex] = {
        ...exercises[exerciseIndex],
        sets: exercises[exerciseIndex].sets.map((s, i) =>
          i === setIndex ? { ...s, ...updates } : s
        ),
      }
      return { ...prev, exercises }
    })
  }, [])

  // 세트 수동 추가
  const addSet = useCallback((exerciseIndex: number) => {
    setSession(prev => {
      const exercises = [...prev.exercises]
      const currentSets = exercises[exerciseIndex].sets
      const lastSet = currentSets[currentSets.length - 1]
      const newSet: SetData = {
        set_number: currentSets.length + 1,
        set_type: 'normal',
        weight_kg: lastSet?.weight_kg ?? null,
        reps: lastSet?.reps ?? null,
        completed: false,
      }
      exercises[exerciseIndex] = {
        ...exercises[exerciseIndex],
        sets: [...currentSets, newSet],
      }
      return { ...prev, exercises }
    })
  }, [])

  // 세트 완료 (DB 저장 + 휴식 타이머)
  const completeSet = useCallback(async (
    exerciseIndex: number,
    setIndex: number,
    restDuration = 90
  ) => {
    const exercise = session.exercises[exerciseIndex]
    const set = exercise.sets[setIndex]
    if (!exercise.id) return

    const oneRm = (set.weight_kg && set.reps)
      ? calculateOneRM(set.weight_kg, set.reps)
      : null

    const { data, error } = await supabase
      .from('sets')
      .insert({
        workout_exercise_id: exercise.id,
        set_number: set.set_number,
        set_type: set.set_type,
        weight_kg: set.weight_kg,
        reps: set.reps,
        one_rm: oneRm,
      })
      .select()
      .single()

    if (error) throw error

    setSession(prev => {
      const exercises = [...prev.exercises]
      const currentSets = exercises[exerciseIndex].sets
      const updatedSets = currentSets.map((s, i) =>
        i === setIndex ? { ...s, id: data.id, completed: true, one_rm: oneRm } : s
      )
      exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets: updatedSets }

      return {
        ...prev,
        exercises,
        restTimer: {
          startAt: Date.now(),
          duration: restDuration,
          exerciseId: exercise.id!,
          setNumber: set.set_number,
        },
      }
    })

    if ('vibrate' in navigator) {
      setTimeout(() => navigator.vibrate([200, 100, 200]), restDuration * 1000)
    }
  }, [session.exercises, supabase])

  // 휴식 타이머 취소
  const cancelRestTimer = useCallback(() => {
    setSession(prev => ({ ...prev, restTimer: null }))
  }, [])

  // 종목 삭제
  const removeExercise = useCallback((exerciseIndex: number) => {
    setSession(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== exerciseIndex),
    }))
  }, [])

  // 운동 종료
  const finishWorkout = useCallback(async () => {
    if (!session.workoutId) return

    // 타이머가 시작됐으면 실제 경과 시간, 아니면 0초
    let totalSeconds = 0
    if (session.startedAt) {
      const pausedExtra = session.pausedAt ? (Date.now() - session.pausedAt) : 0
      totalSeconds = Math.floor(
        (Date.now() - session.startedAt - session.totalPausedMs - pausedExtra) / 1000
      )
    }

    const { error } = await supabase
      .from('workouts')
      .update({
        finished_at: new Date().toISOString(),
        total_seconds: totalSeconds,
      })
      .eq('id', session.workoutId)

    if (error) throw error

    const workoutId = session.workoutId
    clearStorage()
    setSession(initialState)
    return workoutId
  }, [session, supabase])

  // 운동 취소
  const cancelWorkout = useCallback(async () => {
    if (!session.workoutId) return
    await supabase.from('workouts').delete().eq('id', session.workoutId)
    clearStorage()
    setSession(initialState)
  }, [session.workoutId, supabase])

  const isActive = Boolean(session.workoutId)                         // 준비 중 or 운동 중
  const isTimerRunning = Boolean(session.workoutId && session.startedAt) // 타이머 실제 가동 중
  const isPaused = Boolean(session.pausedAt !== null && session.workoutId)

  return {
    session,
    isActive,
    isTimerRunning,
    isPaused,
    isLoading,
    startWorkout,
    beginTimer,
    pauseWorkout,
    resumeWorkout,
    addExercise,
    addSet,
    updateSet,
    completeSet,
    cancelRestTimer,
    removeExercise,
    finishWorkout,
    cancelWorkout,
  }
}
