import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'

const MEAL_TYPES = ['아침', '점심', '저녁', '간식'] as const
type MealType = typeof MEAL_TYPES[number]

const MEAL_EMOJI: Record<MealType, string> = {
  '아침': '🌅', '점심': '☀️', '저녁': '🌙', '간식': '🍎',
}

interface MealItem {
  id: string
  food_name: string
  amount_g: number | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

interface Meal {
  id: string
  meal_type: string
  eaten_at: string
  meal_items: MealItem[]
}

export default async function DietPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const date = searchParams.date ?? new Date().toISOString().split('T')[0]

  // 해당 날짜 식단 조회
  const { data: meals } = await supabase
    .from('meals')
    .select('*, meal_items(*)')
    .eq('user_id', user.id)
    .gte('eaten_at', `${date}T00:00:00`)
    .lte('eaten_at', `${date}T23:59:59`)
    .order('eaten_at') as { data: Meal[] | null }

  // 사용자 목표
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('target_calories, target_protein_g, target_carbs_g, target_fat_g')
    .eq('user_id', user.id)
    .maybeSingle()

  // 총 영양소 계산
  const allItems = (meals ?? []).flatMap(m => m.meal_items)
  const total = {
    calories: allItems.reduce((s, i) => s + (i.calories ?? 0), 0),
    protein: allItems.reduce((s, i) => s + (i.protein_g ?? 0), 0),
    carbs: allItems.reduce((s, i) => s + (i.carbs_g ?? 0), 0),
    fat: allItems.reduce((s, i) => s + (i.fat_g ?? 0), 0),
  }

  const targetCal = profile?.target_calories ?? 2000
  const calProgress = Math.min((total.calories / targetCal) * 100, 100)

  // 날짜 포맷
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  })

  return (
    <main className="min-h-screen bg-[#0f0f0f]">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f] border-b border-[#2a2a2a] px-4 h-14 flex items-center justify-between">
        <h1 className="font-semibold text-[#f0f0f0]">식단 기록</h1>
        <span className="text-sm text-[#888888]">{dateLabel}</span>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* 영양소 요약 카드 */}
        <div className="bg-[#1a1a1a] rounded-[16px] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[#f0f0f0]">오늘 섭취</span>
            <span className="text-xs text-[#888888]">
              목표 {targetCal.toLocaleString()}kcal
            </span>
          </div>

          {/* 칼로리 게이지 바 */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-[#888888] mb-1.5">
              <span className="text-[#f0f0f0] font-bold tabular-nums">
                {Math.round(total.calories).toLocaleString()}kcal
              </span>
              <span>{Math.round(calProgress)}%</span>
            </div>
            <div className="h-2.5 bg-[#242424] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${calProgress}%`,
                  backgroundColor: calProgress >= 100 ? '#FF4B4B' : calProgress >= 90 ? '#FFB800' : '#C8FF00',
                }}
              />
            </div>
          </div>

          {/* 탄단지 */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '단백질', value: total.protein, target: profile?.target_protein_g, unit: 'g', color: '#4FC3F7' },
              { label: '탄수화물', value: total.carbs, target: profile?.target_carbs_g, unit: 'g', color: '#81C784' },
              { label: '지방', value: total.fat, target: profile?.target_fat_g, unit: 'g', color: '#FFB74D' },
            ].map(({ label, value, target, unit, color }) => (
              <div key={label} className="bg-[#242424] rounded-[10px] p-3 text-center">
                <p className="text-xs text-[#888888] mb-1">{label}</p>
                <p className="text-base font-bold tabular-nums" style={{ color }}>
                  {Math.round(value)}<span className="text-xs font-normal text-[#888888]">{unit}</span>
                </p>
                {target && (
                  <p className="text-[10px] text-[#555555] mt-0.5">/ {target}{unit}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 식사별 카드 */}
        {MEAL_TYPES.map(mealType => {
          const mealData = (meals ?? []).filter(m => m.meal_type === mealType)
          const mealCals = mealData
            .flatMap(m => m.meal_items)
            .reduce((s, i) => s + (i.calories ?? 0), 0)

          return (
            <div key={mealType} className="bg-[#1a1a1a] rounded-[16px] overflow-hidden">
              {/* 식사 헤더 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
                <div className="flex items-center gap-2">
                  <span>{MEAL_EMOJI[mealType]}</span>
                  <span className="font-semibold text-[#f0f0f0] text-sm">{mealType}</span>
                  {mealCals > 0 && (
                    <span className="text-xs text-[#888888] tabular-nums">{Math.round(mealCals)}kcal</span>
                  )}
                </div>
                <Link
                  href={`/diet/add?date=${date}&meal=${mealType}`}
                  className="bg-[#242424] text-[#C8FF00] rounded-full p-1.5"
                >
                  <Plus size={14} />
                </Link>
              </div>

              {/* 음식 항목 */}
              {mealData.length === 0 ? (
                <div className="px-4 py-4 text-center">
                  <Link
                    href={`/diet/add?date=${date}&meal=${mealType}`}
                    className="text-xs text-[#555555]"
                  >
                    + 음식 추가
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[#2a2a2a]">
                  {mealData.flatMap(m => m.meal_items).map(item => (
                    <div key={item.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[#f0f0f0]">{item.food_name}</p>
                        {item.amount_g && (
                          <p className="text-xs text-[#555555] mt-0.5 tabular-nums">{item.amount_g}g</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#f0f0f0] tabular-nums">
                          {Math.round(item.calories ?? 0)}kcal
                        </p>
                        <p className="text-xs text-[#555555] tabular-nums">
                          P{Math.round(item.protein_g ?? 0)} C{Math.round(item.carbs_g ?? 0)} F{Math.round(item.fat_g ?? 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#2a2a2a] h-16 z-50">
        <div className="max-w-[430px] mx-auto h-full flex items-center justify-around px-2">
          {[
            { href: '/', icon: '🏠', label: '홈' },
            { href: '/workout/new', icon: '💪', label: '운동' },
            { href: '/diet', icon: '🥗', label: '식단', active: true },
            { href: '/dashboard', icon: '📊', label: '통계' },
            { href: '/my', icon: '👤', label: '마이' },
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
