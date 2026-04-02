import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import MealItemList from '@/components/diet/MealItemList'
import DietDateNav from '@/components/diet/DietDateNav'
import MealTemplatePanel from '@/components/diet/MealTemplatePanel'

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

  return (
    <main className="min-h-screen bg-[#0f0f0f]">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f] border-b border-[#2a2a2a] px-4 h-14 flex items-center justify-between">
        <h1 className="font-semibold text-[#f0f0f0]">식단 기록</h1>
        <DietDateNav date={date} />
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
          const mealItems = mealData.flatMap(m => m.meal_items)
          const mealCals = mealItems.reduce((s, i) => s + (i.calories ?? 0), 0)

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
                <div className="flex items-center gap-2">
                  <MealTemplatePanel
                    mealType={mealType}
                    date={date}
                    currentItems={mealItems}
                  />
                  <Link
                    href={`/diet/add?date=${date}&meal=${encodeURIComponent(mealType)}`}
                    className="bg-[#242424] text-[#C8FF00] rounded-full p-1.5"
                  >
                    <Plus size={14} />
                  </Link>
                </div>
              </div>

              {/* 음식 항목 — 수정/삭제 지원 */}
              <MealItemList
                items={mealItems}
                date={date}
                mealType={mealType}
              />
            </div>
          )
        })}
      </div>
    </main>
  )
}
