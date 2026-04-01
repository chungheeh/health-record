import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import WorkoutDetailClient, { type EditableExercise, type EditableSet, type SetType } from '@/components/workout/WorkoutDetailClient'

interface PageProps {
  params: { id: string }
}

export default async function WorkoutDetailPage({ params }: PageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { data: workout } = await supabase
    .from('workouts')
    .select(`
      *,
      workout_exercises(
        *,
        exercises(name, muscle_group),
        sets(*)
      )
    `)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!workout) return notFound()

  type RawSet = {
    id: string
    set_number: number
    set_type: string | null
    weight_kg: number | null
    reps: number | null
    one_rm: number | null
  }
  type RawExercise = {
    id: string
    exercise_id: string
    exercises: { name: string; muscle_group: string } | null
    sets: RawSet[]
  }

  const rawExercises = (workout.workout_exercises as RawExercise[]) ?? []

  // 클라이언트로 넘길 데이터 변환
  const exercises: EditableExercise[] = rawExercises.map(ex => ({
    id: ex.id,
    exercise_id: ex.exercise_id,
    name: ex.exercises?.name ?? '',
    muscle_group: ex.exercises?.muscle_group ?? '',
    sets: ex.sets
      .sort((a, b) => a.set_number - b.set_number)
      .map(s => ({
        id: s.id,
        set_number: s.set_number,
        set_type: (s.set_type ?? 'normal') as SetType,
        weight_kg: s.weight_kg,
        reps: s.reps,
        one_rm: s.one_rm,
      } as EditableSet)),
  }))

  // 총 볼륨: normal 세트만
  const totalVolume = exercises.reduce((sum, ex) =>
    sum + ex.sets
      .filter(s => (!s.set_type || s.set_type === 'normal') && s.weight_kg && s.reps)
      .reduce((sv, s) => sv + (s.weight_kg! * s.reps!), 0),
    0
  )

  // 총 세트
  const totalSets = exercises.reduce((sum, ex) =>
    sum + ex.sets.filter(s => s.weight_kg && s.reps).length, 0
  )

  const workoutDate = new Date(workout.started_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  return (
    <WorkoutDetailClient
      workout={{
        id: workout.id,
        total_seconds: workout.total_seconds,
        started_at: workout.started_at,
      }}
      exercises={exercises}
      totalVolume={totalVolume}
      totalSets={totalSets}
      workoutDate={workoutDate}
    />
  )
}
