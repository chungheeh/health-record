import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// --- Type Definitions ---

interface RoutineExercise {
  name: string
  sets: number
  reps: string
  rest_sec: number
  notes?: string
}

interface RoutineDay {
  day: number
  day_name: string
  focus: string
  exercises: RoutineExercise[]
}

interface RoutineSummary {
  goal: string
  tdee: number
  target_calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

interface RoutineData {
  summary: RoutineSummary
  schedule: RoutineDay[]
  rest_days: number[]
  notes?: string
}

interface AiRoutine {
  id: string
  user_id: string
  routine_data: RoutineData | null
  created_at: string
  is_active: boolean
}

// --- Sub Components ---

function NutrientBadge({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span style={{ color: '#888888' }} className="text-xs">{label}</span>
      <span style={{ color: '#f0f0f0' }} className="text-base font-semibold">
        {value}
        <span style={{ color: '#888888' }} className="text-xs font-normal ml-0.5">{unit}</span>
      </span>
    </div>
  )
}

function SummaryCard({ summary }: { summary: RoutineSummary }) {
  return (
    <div
      style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
      className="rounded-2xl border p-5 mb-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ color: '#f0f0f0' }} className="text-base font-semibold">루틴 요약</h2>
        <span
          style={{ backgroundColor: '#C8FF0020', color: '#C8FF00', borderColor: '#C8FF0040' }}
          className="text-xs font-medium px-2.5 py-1 rounded-full border"
        >
          {summary.goal}
        </span>
      </div>

      {/* Calorie row */}
      <div
        style={{ backgroundColor: '#242424', borderColor: '#2a2a2a' }}
        className="rounded-xl border p-4 mb-3 flex justify-around"
      >
        <div className="flex flex-col items-center gap-1">
          <span style={{ color: '#888888' }} className="text-xs">TDEE</span>
          <span style={{ color: '#f0f0f0' }} className="text-base font-semibold">
            {summary.tdee.toLocaleString()}
            <span style={{ color: '#888888' }} className="text-xs font-normal ml-0.5">kcal</span>
          </span>
        </div>
        <div style={{ borderColor: '#2a2a2a' }} className="border-l" />
        <div className="flex flex-col items-center gap-1">
          <span style={{ color: '#888888' }} className="text-xs">목표 칼로리</span>
          <span style={{ color: '#C8FF00' }} className="text-base font-semibold">
            {summary.target_calories.toLocaleString()}
            <span style={{ color: '#888888' }} className="text-xs font-normal ml-0.5">kcal</span>
          </span>
        </div>
      </div>

      {/* Macro row */}
      <div
        style={{ backgroundColor: '#242424', borderColor: '#2a2a2a' }}
        className="rounded-xl border p-4 flex justify-around"
      >
        <NutrientBadge label="단백질" value={summary.protein_g} unit="g" />
        <div style={{ borderColor: '#2a2a2a' }} className="border-l" />
        <NutrientBadge label="탄수화물" value={summary.carbs_g} unit="g" />
        <div style={{ borderColor: '#2a2a2a' }} className="border-l" />
        <NutrientBadge label="지방" value={summary.fat_g} unit="g" />
      </div>
    </div>
  )
}

function ExerciseRow({ exercise, index }: { exercise: RoutineExercise; index: number }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span
        style={{ backgroundColor: '#242424', color: '#888888' }}
        className="min-w-[24px] h-6 rounded-md text-xs flex items-center justify-center font-medium mt-0.5"
      >
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p style={{ color: '#f0f0f0' }} className="text-sm font-medium leading-tight">{exercise.name}</p>
        {exercise.notes && (
          <p style={{ color: '#888888' }} className="text-xs mt-0.5 leading-tight">{exercise.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          style={{ backgroundColor: '#C8FF0015', color: '#C8FF00' }}
          className="text-xs px-2 py-0.5 rounded-md font-medium"
        >
          {exercise.sets}세트
        </span>
        <span style={{ color: '#888888' }} className="text-xs">{exercise.reps}회</span>
        <span style={{ color: '#888888' }} className="text-xs">{exercise.rest_sec}s</span>
      </div>
    </div>
  )
}

function DayCard({ day }: { day: RoutineDay }) {
  return (
    <div
      style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
      className="rounded-2xl border mb-3 overflow-hidden"
    >
      {/* Day header */}
      <div
        style={{ borderColor: '#2a2a2a' }}
        className="flex items-center justify-between px-4 py-3 border-b"
      >
        <div className="flex items-center gap-2.5">
          <span
            style={{ backgroundColor: '#C8FF00', color: '#0f0f0f' }}
            className="text-xs font-bold px-2 py-0.5 rounded-md"
          >
            {day.day_name}
          </span>
          <span style={{ color: '#f0f0f0' }} className="text-sm font-semibold">{day.focus}</span>
        </div>
        <span style={{ color: '#888888' }} className="text-xs">{day.exercises.length}개 운동</span>
      </div>

      {/* Exercise list */}
      <div className="px-4 divide-y" style={{ borderColor: '#2a2a2a' }}>
        {day.exercises.map((exercise, i) => (
          <ExerciseRow key={i} exercise={exercise} index={i} />
        ))}
      </div>
    </div>
  )
}

function RestDayCard({ dayName }: { dayName: string }) {
  return (
    <div
      style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
      className="rounded-2xl border mb-3 px-4 py-4 flex items-center gap-3"
    >
      <span
        style={{ backgroundColor: '#242424', color: '#888888' }}
        className="text-xs font-bold px-2 py-0.5 rounded-md"
      >
        {dayName}
      </span>
      <span style={{ color: '#888888' }} className="text-sm">휴식</span>
      <span className="ml-auto text-lg">😴</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div
        style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
        className="w-20 h-20 rounded-full border flex items-center justify-center mb-5"
      >
        <span className="text-3xl">🤖</span>
      </div>
      <h2 style={{ color: '#f0f0f0' }} className="text-lg font-semibold mb-2">루틴이 없습니다</h2>
      <p style={{ color: '#888888' }} className="text-sm mb-8 leading-relaxed">
        아직 AI 루틴이 생성되지 않았습니다.<br />
        설정에서 목표를 입력하고 루틴을 만들어보세요.
      </p>
      <Link
        href="/settings"
        style={{ backgroundColor: '#C8FF00', color: '#0f0f0f' }}
        className="px-6 py-3 rounded-xl text-sm font-bold"
      >
        루틴 생성하러 가기
      </Link>
    </div>
  )
}

// --- Page ---

export default async function RoutinePage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: routine } = await supabase
    .from('ai_routines')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .maybeSingle<AiRoutine>()

  const routineData = routine?.routine_data ?? null

  // Build a full 7-day map (day 1–7) from the schedule
  const DAY_NAMES = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
  const scheduleMap = new Map<number, RoutineDay>()
  if (routineData?.schedule) {
    for (const d of routineData.schedule) {
      scheduleMap.set(d.day, d)
    }
  }
  const restDaysSet = new Set(routineData?.rest_days ?? [])

  return (
    <div style={{ backgroundColor: '#0f0f0f' }} className="min-h-screen">
      <div className="mx-auto w-full max-w-[430px]">

        {/* Sticky header */}
        <header
          style={{ backgroundColor: '#0f0f0f', borderColor: '#2a2a2a' }}
          className="sticky top-0 z-20 border-b px-5 py-4"
        >
          <h1 style={{ color: '#f0f0f0' }} className="text-xl font-bold">나의 루틴</h1>
        </header>

        {/* Content */}
        <main className="px-4 pt-5 pb-24">
          {!routine || !routineData ? (
            <EmptyState />
          ) : (
            <>
              {/* Generated date */}
              <p style={{ color: '#888888' }} className="text-xs mb-4">
                생성일:{' '}
                {new Date(routine.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>

              {/* Summary card */}
              {routineData.summary && <SummaryCard summary={routineData.summary} />}

              {/* Weekly schedule title */}
              <h2 style={{ color: '#f0f0f0' }} className="text-base font-semibold mb-3 mt-2">
                주간 스케줄
              </h2>

              {/* 7-day cards */}
              {DAY_NAMES.map((name, idx) => {
                const dayNum = idx + 1
                const dayData = scheduleMap.get(dayNum)

                if (restDaysSet.has(dayNum) && !dayData) {
                  return <RestDayCard key={dayNum} dayName={name} />
                }

                if (dayData) {
                  return <DayCard key={dayNum} day={{ ...dayData, day_name: dayData.day_name || name }} />
                }

                // Day not in schedule and not in rest_days — show as rest
                return <RestDayCard key={dayNum} dayName={name} />
              })}

              {/* General notes */}
              {routineData.notes && (
                <div
                  style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
                  className="rounded-2xl border p-4 mt-1 mb-4"
                >
                  <p style={{ color: '#888888' }} className="text-xs font-medium mb-1.5">메모</p>
                  <p style={{ color: '#f0f0f0' }} className="text-sm leading-relaxed">{routineData.notes}</p>
                </div>
              )}

              {/* Regenerate button */}
              <div className="mt-4">
                <Link
                  href="/settings"
                  style={{ borderColor: '#2a2a2a', color: '#888888' }}
                  className="w-full flex items-center justify-center gap-2 border rounded-xl py-3.5 text-sm font-medium"
                >
                  <span>🔄</span>
                  <span>루틴 재생성</span>
                </Link>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
