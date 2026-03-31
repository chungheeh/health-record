import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 오늘 날짜
  const today = new Date().toISOString().split('T')[0]

  // 오늘 운동 세션
  const { data: todayWorkout } = await supabase
    .from('workouts')
    .select('id, started_at, finished_at, total_seconds')
    .eq('user_id', user.id)
    .gte('started_at', `${today}T00:00:00`)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 오늘 식단 칼로리
  const { data: todayMeals } = await supabase
    .from('meals')
    .select('id, meal_items(calories)')
    .eq('user_id', user.id)
    .gte('eaten_at', `${today}T00:00:00`)

  const todayCalories = todayMeals?.reduce((sum, meal) => {
    const mealCals = (meal.meal_items as { calories: number | null }[])?.reduce(
      (s, item) => s + (item.calories ?? 0), 0
    ) ?? 0
    return sum + mealCals
  }, 0) ?? 0

  // 활성 루틴
  const { data: activeRoutine } = await supabase
    .from('ai_routines')
    .select('goal, routine_data')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  const routineData = activeRoutine?.routine_data as {
    daily_calories?: number
    macros?: { protein_g: number; carbs_g: number; fat_g: number }
  } | null

  return (
    <main className="min-h-screen bg-[#0f0f0f]">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f] border-b border-[#2a2a2a] px-4 h-14 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#C8FF00]">W.E</h1>
        <span className="text-sm text-[#888888]">
          {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
        </span>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* 오늘 요약 카드 */}
        <div className="bg-[#1a1a1a] rounded-[16px] p-5">
          <h2 className="text-sm text-[#888888] mb-4">오늘 요약</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#242424] rounded-[12px] p-4">
              <p className="text-xs text-[#888888] mb-1">운동</p>
              <p className="text-lg font-bold text-[#f0f0f0] tabular-nums">
                {todayWorkout
                  ? `${Math.floor((todayWorkout.total_seconds ?? 0) / 60)}분`
                  : '미완료'}
              </p>
            </div>
            <div className="bg-[#242424] rounded-[12px] p-4">
              <p className="text-xs text-[#888888] mb-1">섭취 칼로리</p>
              <p className="text-lg font-bold text-[#f0f0f0] tabular-nums">
                {Math.round(todayCalories)}<span className="text-xs font-normal text-[#888888]">kcal</span>
              </p>
            </div>
          </div>
        </div>

        {/* 빠른 시작 버튼 */}
        <div className="space-y-3">
          <Link
            href="/workout/new"
            className="block w-full bg-[#C8FF00] text-[#0f0f0f] font-semibold rounded-[12px] py-4 text-center text-base active:scale-[0.98] transition-transform"
          >
            💪 운동 시작하기
          </Link>
          <Link
            href="/diet"
            className="block w-full bg-[#1a1a1a] text-[#f0f0f0] font-medium rounded-[12px] py-4 text-center text-base border border-[#2a2a2a] active:scale-[0.98] transition-transform"
          >
            🥗 식단 기록하기
          </Link>
        </div>

        {/* 활성 루틴 카드 */}
        {activeRoutine ? (
          <div className="bg-[#1a1a1a] rounded-[16px] p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#f0f0f0]">내 루틴</h2>
              <Link href="/routine" className="text-xs text-[#C8FF00]">자세히 →</Link>
            </div>
            <p className="text-xs text-[#888888] mb-2">목표: {activeRoutine.goal}</p>
            {routineData?.daily_calories && (
              <div className="flex gap-4 text-sm">
                <span className="text-[#f0f0f0] font-bold tabular-nums">{routineData.daily_calories}<span className="text-xs font-normal text-[#888888]">kcal</span></span>
                <span className="text-[#888888]">단백질 {routineData.macros?.protein_g}g</span>
                <span className="text-[#888888]">탄수 {routineData.macros?.carbs_g}g</span>
              </div>
            )}
          </div>
        ) : (
          <Link href="/routine" className="block bg-[#1a1a1a] rounded-[16px] p-5 border border-dashed border-[#2a2a2a]">
            <p className="text-sm text-[#888888] text-center">
              🤖 AI 맞춤 루틴을 생성해보세요 →
            </p>
          </Link>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#2a2a2a] h-16 z-50">
        <div className="max-w-[430px] mx-auto h-full flex items-center justify-around px-2">
          {[
            { href: '/', icon: '🏠', label: '홈', active: true },
            { href: '/workout/new', icon: '💪', label: '운동', active: false },
            { href: '/diet', icon: '🥗', label: '식단', active: false },
            { href: '/dashboard', icon: '📊', label: '통계', active: false },
            { href: '/my', icon: '👤', label: '마이', active: false },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 ${item.active ? 'text-[#C8FF00]' : 'text-[#555555]'}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  )
}
