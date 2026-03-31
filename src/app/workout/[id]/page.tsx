import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface PageProps {
  params: { id: string }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}시간 ${m}분`
  if (m > 0) return `${m}분 ${s}초`
  return `${s}초`
}

const SET_TYPE_LABEL: Record<string, string> = {
  normal: '',
  warmup: '🌡️ 웜업',
  dropset: '🔻 드랍',
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

  type SetRow = { weight_kg: number | null; reps: number | null; one_rm: number | null; set_number: number; set_type?: string }
  type WorkoutExRow = { exercises: { name: string; muscle_group: string } | null; sets: SetRow[] }

  const workoutExercises = (workout.workout_exercises as WorkoutExRow[]) ?? []
  // 총 볼륨: 기본 세트(normal)만 포함
  const totalVolume = workoutExercises.reduce((sum, we) => {
    return sum + we.sets
      .filter(s => (!s.set_type || s.set_type === 'normal') && s.weight_kg && s.reps)
      .reduce((s, set) => s + ((set.weight_kg ?? 0) * (set.reps ?? 0)), 0)
  }, 0)
  // 총 세트: 완료된 모든 세트
  const totalSets = workoutExercises.reduce((sum, we) => sum + we.sets.filter(s => s.weight_kg && s.reps).length, 0)

  const workoutDate = new Date(workout.started_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  return (
    <main className="min-h-screen bg-[#0f0f0f]">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f] border-b border-[#2a2a2a] px-4 h-14 flex items-center gap-3">
        <h1 className="font-semibold text-[#f0f0f0]">🎉 운동 완료</h1>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* 요약 카드 */}
        <div className="bg-[#1a1a1a] rounded-[16px] p-5">
          <p className="text-xs text-[#888888] mb-3">{workoutDate}</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-[#242424] rounded-[12px] p-3 text-center">
              <p className="text-2xl font-bold text-[#C8FF00] tabular-nums">
                {formatDuration(workout.total_seconds)}
              </p>
              <p className="text-xs text-[#888888] mt-1">운동 시간</p>
            </div>
            <div className="bg-[#242424] rounded-[12px] p-3 text-center">
              <p className="text-2xl font-bold text-[#f0f0f0] tabular-nums">
                {workoutExercises.length}
              </p>
              <p className="text-xs text-[#888888] mt-1">종목 수</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#242424] rounded-[12px] p-3 text-center">
              <p className="text-2xl font-bold text-[#f0f0f0] tabular-nums">
                {totalSets}
              </p>
              <p className="text-xs text-[#888888] mt-1">총 세트</p>
            </div>
            <div className="bg-[#242424] rounded-[12px] p-3 text-center">
              <p className="text-2xl font-bold text-[#f0f0f0] tabular-nums">
                {Math.round(totalVolume).toLocaleString()}
              </p>
              <p className="text-xs text-[#888888] mt-1">총 볼륨(kg)</p>
            </div>
          </div>
        </div>

        {/* 종목별 기록 */}
        {workoutExercises.map((we, idx) => {
          const completedSets = we.sets.filter(s => s.weight_kg && s.reps)
          const bestSet = completedSets.reduce<SetRow | null>((best, s) => {
            if (!best) return s
            return (s.one_rm ?? 0) > (best.one_rm ?? 0) ? s : best
          }, null)

          return (
            <div key={idx} className="bg-[#1a1a1a] rounded-[16px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
                <span className="font-semibold text-[#f0f0f0]">{we.exercises?.name}</span>
                <span className="text-xs text-[#888888]">{we.exercises?.muscle_group}</span>
              </div>
              <div className="px-4 py-3">
                <div className="grid grid-cols-[32px_1fr_1fr_1fr] gap-2 text-xs text-[#555555] mb-2">
                  <span className="text-center">세트</span>
                  <span className="text-center">종류</span>
                  <span className="text-center">무게</span>
                  <span className="text-center">횟수</span>
                </div>
                {completedSets.sort((a, b) => a.set_number - b.set_number).map((set, si) => (
                  <div key={si} className="grid grid-cols-[32px_1fr_1fr_1fr] gap-2 py-1.5 text-sm">
                    <span className="text-center text-[#888888] tabular-nums">{set.set_number}</span>
                    <span className="text-center text-xs text-[#888888]">
                      {set.set_type ? (SET_TYPE_LABEL[set.set_type] || '기본') : '기본'}
                    </span>
                    <span className="text-center text-[#f0f0f0] tabular-nums">{set.weight_kg}kg</span>
                    <span className="text-center text-[#f0f0f0] tabular-nums">{set.reps}회</span>
                  </div>
                ))}
                {bestSet?.one_rm && (
                  <p className="text-xs text-[#C8FF00] mt-2">
                    추정 1RM: {Math.round(bestSet.one_rm)}kg
                  </p>
                )}
              </div>
            </div>
          )
        })}

        {/* 홈으로 버튼 */}
        <Link
          href="/"
          className="block w-full bg-[#C8FF00] text-[#0f0f0f] font-bold rounded-[12px] py-4 text-center active:scale-[0.98] transition-transform"
        >
          홈으로
        </Link>
      </div>
    </main>
  )
}
