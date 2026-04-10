import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, MessageSquarePlus } from 'lucide-react'
import TodayWorkouts from '@/components/home/TodayWorkouts'
import CoachSheet from '@/components/coach/CoachSheet'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const date = searchParams.date ?? today
  const isToday = date === today

  const prevDate = addDays(date, -1)
  const nextDate = addDays(date, 1)
  const canGoNext = date < today

  // 선택 날짜 운동 요약 (완료된 것만)
  const { data: workoutsRaw } = await supabase
    .from('workouts')
    .select(`
      id, total_seconds,
      workout_exercises(
        sets(weight_kg, reps, set_type)
      )
    `)
    .eq('user_id', user.id)
    .gte('started_at', `${date}T00:00:00`)
    .lte('started_at', `${date}T23:59:59`)
    .not('finished_at', 'is', null)

  // 운동 요약 계산
  type SetRaw = { weight_kg: number | null; reps: number | null; set_type: string | null }
  type ExRaw = { sets: SetRaw[] }
  const workouts = (workoutsRaw ?? []) as { id: string; total_seconds: number | null; workout_exercises: ExRaw[] }[]

  const totalWorkoutSeconds = workouts.reduce((s, w) => s + (w.total_seconds ?? 0), 0)
  const totalVolume = workouts.reduce((sum, w) =>
    sum + w.workout_exercises.reduce((s, ex) =>
      s + ex.sets
        .filter(set => (!set.set_type || set.set_type === 'normal') && set.weight_kg && set.reps)
        .reduce((sv, set) => sv + (set.weight_kg! * set.reps!), 0),
      0),
    0)
  const totalExercises = workouts.reduce((s, w) => s + w.workout_exercises.length, 0)
  const hasWorkout = workouts.length > 0

  // 해당 날짜 식단 칼로리
  const { data: todayMeals } = await supabase
    .from('meals')
    .select('id, meal_items(calories)')
    .eq('user_id', user.id)
    .gte('eaten_at', `${date}T00:00:00`)
    .lte('eaten_at', `${date}T23:59:59`)

  const todayCalories = (todayMeals ?? []).reduce((sum, meal) => {
    const mealCals = (meal.meal_items as { calories: number | null }[])?.reduce(
      (s, item) => s + (item.calories ?? 0), 0
    ) ?? 0
    return sum + mealCals
  }, 0)

  // 활성 루틴
  const { data: activeRoutine } = await supabase
    .from('ai_routines')
    .select('goal, routine_data')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  const routineData = activeRoutine?.routine_data as {
    summary?: { target_calories?: number; protein_g?: number; carbs_g?: number }
  } | null

  // 날짜 레이블
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  })

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}시간 ${m}분`
    if (m > 0) return `${m}분`
    return `${seconds}초`
  }

  return (
    <main className="min-h-screen bg-bg-primary">
      <CoachSheet />
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-bg-primary border-b border-we-border px-4 h-14 flex items-center justify-between">
        <h1 className="text-xl font-bold text-accent">W.E</h1>

        {/* 날짜 네비게이션 */}
        <div className="flex items-center gap-1">
          <Link
            href={`/?date=${prevDate}`}
            className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <ChevronLeft size={18} />
          </Link>
          <span className="text-sm text-text-primary font-medium min-w-[110px] text-center">
            {isToday ? `오늘 · ${dateLabel.split(' ').slice(-1)[0]}` : dateLabel}
          </span>
          <Link
            href={canGoNext ? `/?date=${nextDate}` : '#'}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
              canGoNext
                ? 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                : 'text-text-muted pointer-events-none'
            }`}
          >
            <ChevronRight size={18} />
          </Link>
          <Link
            href="/suggestions"
            className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
            title="건의사항"
          >
            <MessageSquarePlus size={17} />
          </Link>
        </div>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-4">

        {/* 오늘 요약 카드 */}
        <div className="bg-bg-secondary rounded-[16px] p-5">
          <h2 className="text-sm text-text-secondary mb-4">
            {isToday ? '오늘 요약' : `${dateLabel} 요약`}
          </h2>

          {/* 운동 요약 */}
          <div className="mb-3">
            <p className="text-xs text-text-muted mb-2">💪 운동</p>
            {hasWorkout ? (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-bg-tertiary rounded-[10px] p-3 text-center">
                  <p className="text-base font-bold text-accent tabular-nums">
                    {formatDuration(totalWorkoutSeconds)}
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5">시간</p>
                </div>
                <div className="bg-bg-tertiary rounded-[10px] p-3 text-center">
                  <p className="text-base font-bold text-text-primary tabular-nums">
                    {totalExercises}
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5">종목</p>
                </div>
                <div className="bg-bg-tertiary rounded-[10px] p-3 text-center">
                  <p className="text-base font-bold text-text-primary tabular-nums">
                    {Math.round(totalVolume).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5">볼륨(kg)</p>
                </div>
              </div>
            ) : (
              <div className="bg-bg-tertiary rounded-[10px] p-3 text-center">
                <p className="text-sm text-text-muted">운동 없음</p>
              </div>
            )}
          </div>

          {/* 식단 요약 */}
          <div>
            <p className="text-xs text-text-muted mb-2">🥗 식단</p>
            <div className="bg-bg-tertiary rounded-[10px] p-3 flex items-center justify-between">
              <p className="text-sm text-text-secondary">섭취 칼로리</p>
              <p className="text-base font-bold text-text-primary tabular-nums">
                {Math.round(todayCalories)}
                <span className="text-xs font-normal text-text-secondary">kcal</span>
              </p>
            </div>
          </div>
        </div>

        {/* 빠른 시작 버튼 (오늘만 표시) */}
        {isToday && (
          <div className="space-y-3">
            <Link
              href="/workout/new"
              className="block w-full bg-accent text-bg-primary font-semibold rounded-[12px] py-4 text-center text-base active:scale-[0.98] transition-transform"
            >
              💪 운동 시작하기
            </Link>
            <Link
              href="/diet"
              className="block w-full bg-bg-secondary text-text-primary font-medium rounded-[12px] py-4 text-center text-base border border-we-border active:scale-[0.98] transition-transform"
            >
              🥗 식단 기록하기
            </Link>
          </div>
        )}

        {/* 운동 기록 섹션 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-text-primary">운동 기록</p>
            {!isToday && (
              <Link href={`/diet?date=${date}`} className="text-xs text-accent">
                식단 보기 →
              </Link>
            )}
          </div>
          <TodayWorkouts date={date} />
        </div>

        {/* 활성 루틴 카드 (오늘만) */}
        {isToday && (
          activeRoutine ? (
            <div className="bg-bg-secondary rounded-[16px] p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-text-primary">🤖 AI 맞춤 루틴</h2>
                <Link href="/routine" className="text-xs text-accent">자세히 →</Link>
              </div>
              <p className="text-xs text-text-secondary mb-2">목표: {activeRoutine.goal}</p>
              {routineData?.summary?.target_calories && (
                <div className="flex gap-4 text-sm">
                  <span className="text-text-primary font-bold tabular-nums">
                    {routineData.summary.target_calories}
                    <span className="text-xs font-normal text-text-secondary">kcal</span>
                  </span>
                  <span className="text-text-secondary">단백질 {routineData.summary.protein_g}g</span>
                  <span className="text-text-secondary">탄수 {routineData.summary.carbs_g}g</span>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/routine"
              className="block bg-bg-secondary rounded-[16px] p-5 border border-dashed border-we-border"
            >
              <p className="text-sm text-text-secondary text-center">
                🤖 AI 맞춤 루틴을 생성해보세요 →
              </p>
            </Link>
          )
        )}
      </div>
    </main>
  )
}
