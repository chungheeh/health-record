export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Timer } from 'lucide-react'
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
  const allItems = (meals ?? []).flatMap(m => m.meal_items ?? [])
  const total = {
    calories: allItems.reduce((s, i) => s + (i.calories ?? 0), 0),
    protein: allItems.reduce((s, i) => s + (i.protein_g ?? 0), 0),
    carbs: allItems.reduce((s, i) => s + (i.carbs_g ?? 0), 0),
    fat: allItems.reduce((s, i) => s + (i.fat_g ?? 0), 0),
  }

  // 탄수화물 사이클링: 오늘 운동 여부 확인
  const { data: todayWorkouts } = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', user.id)
    .gte('started_at', `${date}T00:00:00`)
    .lte('started_at', `${date}T23:59:59`)
    .not('finished_at', 'is', null)

  const hasWorkoutToday = (todayWorkouts?.length ?? 0) > 0
  const targetCarbs = profile?.target_carbs_g ?? null

  // 사이클링 비율: 운동일 = 1.3x, 휴식일 = 0.7x
  const carbCycleTarget = targetCarbs
    ? (hasWorkoutToday ? Math.round(targetCarbs * 1.3) : Math.round(targetCarbs * 0.7))
    : null
  const carbCycleLabel = hasWorkoutToday ? '🏋️ 운동일 (고탄수)' : '😴 휴식일 (저탄수)'

  const targetCal = profile?.target_calories ?? 2000
  const calProgress = Math.min((total.calories / targetCal) * 100, 100)

  // 식단 추천 — 남은 영양소 기반 규칙 추천
  const remainCal = targetCal - total.calories
  const remainProtein = (profile?.target_protein_g ?? 120) - total.protein
  const today = new Date().toISOString().split('T')[0]
  const isToday = date === today

  type Tip = { emoji: string; text: string; sub: string }
  const tips: Tip[] = []

  if (isToday && total.calories > 0) {
    if (remainCal > 600) {
      tips.push({ emoji: '🍚', text: '탄수화물이 부족해요', sub: `${Math.round(remainCal)}kcal 남았어요. 현미밥, 고구마, 바나나를 추가해보세요.` })
    } else if (remainCal < -200) {
      tips.push({ emoji: '🥗', text: '칼로리 초과 주의', sub: `목표보다 ${Math.round(-remainCal)}kcal 초과했어요. 야채 위주로 드세요.` })
    } else if (remainCal > 0) {
      tips.push({ emoji: '✅', text: '칼로리 잘 조절 중', sub: `목표까지 약 ${Math.round(remainCal)}kcal 남았어요. 가볍게 채워보세요.` })
    }

    if (remainProtein > 50) {
      tips.push({ emoji: '💪', text: '단백질이 부족해요', sub: `약 ${Math.round(remainProtein)}g 더 필요해요. 닭가슴살, 계란, 두부, 그릭요거트를 드세요.` })
    }

    if (total.fat > (profile?.target_fat_g ?? 60) * 1.2) {
      tips.push({ emoji: '⚠️', text: '지방 섭취가 높아요', sub: '튀긴 음식보다 삶거나 구운 음식을 선택해보세요.' })
    }

    if (tips.length === 0 && total.calories > targetCal * 0.8) {
      tips.push({ emoji: '🌟', text: '오늘 식단 완벽해요!', sub: '목표 영양소를 균형있게 섭취하고 있어요. 잘 하고 있습니다!' })
    }
  }

  return (
    <main className="min-h-screen bg-bg-primary">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-bg-primary border-b border-we-border px-4 h-14 flex items-center justify-between">
        <h1 className="font-semibold text-text-primary">식단 기록</h1>
        <div className="flex items-center gap-2">
          <Link href="/fasting" className="p-2 text-text-secondary hover:text-accent transition-colors" title="간헐적 단식">
            <Timer size={18} />
          </Link>
          <DietDateNav date={date} />
        </div>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* 영양소 요약 카드 */}
        <div className="bg-bg-secondary rounded-[16px] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-text-primary">오늘 섭취</span>
            <span className="text-xs text-text-secondary">
              목표 {targetCal.toLocaleString()}kcal
            </span>
          </div>

          {/* 칼로리 게이지 바 */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-text-secondary mb-1.5">
              <span className="text-text-primary font-bold tabular-nums">
                {Math.round(total.calories).toLocaleString()}kcal
              </span>
              <span>{Math.round(calProgress)}%</span>
            </div>
            <div className="h-2.5 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${calProgress}%`,
                  backgroundColor: calProgress >= 100 ? 'var(--danger)' : calProgress >= 90 ? '#FFB800' : 'var(--accent)',
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
              <div key={label} className="bg-bg-tertiary rounded-[10px] p-3 text-center">
                <p className="text-xs text-text-secondary mb-1">{label}</p>
                <p className="text-base font-bold tabular-nums" style={{ color }}>
                  {Math.round(value)}<span className="text-xs font-normal text-text-secondary">{unit}</span>
                </p>
                {target && (
                  <p className="text-[10px] text-text-muted mt-0.5">/ {target}{unit}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 탄수화물 사이클링 카드 */}
        {carbCycleTarget !== null && (
          <div className="bg-bg-secondary rounded-[14px] px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-text-secondary">탄수화물 사이클링</p>
              <p className="text-sm font-bold text-text-primary mt-0.5">{carbCycleLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums" style={{ color: hasWorkoutToday ? 'var(--accent)' : '#4FC3F7' }}>
                {carbCycleTarget}g
              </p>
              <p className="text-[10px] text-text-muted">오늘 탄수화물 목표</p>
            </div>
          </div>
        )}

        {/* 식단 추천 카드 */}
        {tips.length > 0 && (
          <div className="space-y-2">
            {tips.map((tip, i) => (
              <div key={i} className="bg-bg-secondary rounded-[14px] px-4 py-3 flex items-start gap-3">
                <span className="text-lg shrink-0 mt-0.5">{tip.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{tip.text}</p>
                  <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{tip.sub}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 식사별 카드 */}
        {MEAL_TYPES.map(mealType => {
          const mealData = (meals ?? []).filter(m => m.meal_type === mealType)
          const mealItems = mealData.flatMap(m => m.meal_items)
          const mealCals = mealItems.reduce((s, i) => s + (i.calories ?? 0), 0)

          return (
            <div key={mealType} className="bg-bg-secondary rounded-[16px] overflow-hidden">
              {/* 식사 헤더 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-we-border">
                <div className="flex items-center gap-2">
                  <span>{MEAL_EMOJI[mealType]}</span>
                  <span className="font-semibold text-text-primary text-sm">{mealType}</span>
                  {mealCals > 0 && (
                    <span className="text-xs text-text-secondary tabular-nums">{Math.round(mealCals)}kcal</span>
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
                    className="bg-bg-tertiary text-accent rounded-full p-1.5"
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
