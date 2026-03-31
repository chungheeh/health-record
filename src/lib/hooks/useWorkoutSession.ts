'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateOneRM } from '@/lib/utils/1rm'

export interface SetData {
  id?: string
  set_number: number
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
  startedAt: number | null  // timestamp ms
  exercises: WorkoutExercise[]
  restTimer: {
    startAt: number    // timestamp ms
    duration: number   // seconds
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
  exercises: [],
  restTimer: null,
}

export function useWorkoutSession() {
  const [session, setSession] = useState<WorkoutSessionState>(initialState)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  // 마운트 시 localStorage에서 복원
  useEffect(() => {
    const saved = loadFromStorage()
    if (saved?.workoutId) {
      setSession(saved)
    }
  }, [])

  // state 변경 시 localStorage 동기화
  useEffect(() => {
    if (session.workoutId) {
      saveToStorage(session)
    }
  }, [session])

  // 운동 시작
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
        startedAt: Date.now(),
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
      sets: [{ set_number: 1, weight_kg: null, reps: null, completed: false }],
    }

    setSession(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise],
    }))
  }, [session.workoutId, session.exercises.length, supabase])

  // 세트 업데이트 (입력 중)
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

  // 세트 완료 (DB 저장 + 휴식 타이머 시작)
  const completeSet = useCallback(async (
    exerciseIndex: number,
    setIndex: number,
    restDuration = 90
  ) => {
    const exercise = session.exercises[exerciseIndex]
    const set = exercise.sets[setIndex]
    if (!exercise.id) return

    // 1RM 계산
    const oneRm = (set.weight_kg && set.reps)
      ? calculateOneRM(set.weight_kg, set.reps)
      : null

    // DB 저장
    const { data, error } = await supabase
      .from('sets')
      .insert({
        workout_exercise_id: exercise.id,
        set_number: set.set_number,
        weight_kg: set.weight_kg,
        reps: set.reps,
        one_rm: oneRm,
      })
      .select()
      .single()

    if (error) throw error

    // 상태 업데이트: 세트 완료 + 새 세트 추가 + 휴식 타이머 시작
    setSession(prev => {
      const exercises = [...prev.exercises]
      const currentSets = exercises[exerciseIndex].sets
      const updatedSets = currentSets.map((s, i) =>
        i === setIndex ? { ...s, id: data.id, completed: true, one_rm: oneRm } : s
      )
      // 다음 세트 추가
      if (!currentSets.some((s, i) => i > setIndex && !s.completed)) {
        updatedSets.push({
          set_number: currentSets.length + 1,
          weight_kg: set.weight_kg,  // 이전 무게 기본값
          reps: set.reps,
          completed: false,
        })
      }
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

    // 진동 예약 (휴식 타이머 완료 시)
    if ('vibrate' in navigator) {
      setTimeout(() => {
        navigator.vibrate([200, 100, 200])
      }, restDuration * 1000)
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
    if (!session.workoutId || !session.startedAt) return

    const totalSeconds = Math.floor((Date.now() - session.startedAt) / 1000)

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
  }, [session.workoutId, session.startedAt, supabase])

  // 세션 취소 (운동 삭제)
  const cancelWorkout = useCallback(async () => {
    if (!session.workoutId) return
    await supabase.from('workouts').delete().eq('id', session.workoutId)
    clearStorage()
    setSession(initialState)
  }, [session.workoutId, supabase])

  const isActive = Boolean(session.workoutId)
  const elapsedSeconds = session.startedAt
    ? Math.floor((Date.now() - session.startedAt) / 1000)
    : 0

  return {
    session,
    isActive,
    isLoading,
    elapsedSeconds,
    startWorkout,
    addExercise,
    updateSet,
    completeSet,
    cancelRestTimer,
    removeExercise,
    finishWorkout,
    cancelWorkout,
  }
}
