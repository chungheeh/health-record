import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WorkoutHeatmap from '@/components/dashboard/WorkoutHeatmap'
import CalorieBarChart from '@/components/dashboard/CalorieBarChart'
import WeightChart from '@/components/dashboard/WeightChart'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeatmapEntry {
  date: string
  count: number
}

interface CalorieEntry {
  date: string
  label: string
  calories: number
}

interface WeightEntry {
  date: string
  weight: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const today = new Date()

  // ── 1. Heatmap: last 84 days ──────────────────────────────────────────────
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 83)

  const { data: workoutDays } = await supabase
    .from('workouts')
    .select('started_at')
    .eq('user_id', user.id)
    .gte('started_at', startDate.toISOString())
    .not('finished_at', 'is', null)

  // Count workouts per day
  const dayCounts = new Map<string, number>()
  for (const w of workoutDays ?? []) {
    const d = toDateStr(new Date(w.started_at as string))
    dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1)
  }

  const heatmapData: HeatmapEntry[] = []
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = toDateStr(d)
    heatmapData.push({ date: dateStr, count: dayCounts.get(dateStr) ?? 0 })
  }

  // ── 2. Calorie data: last 7 days ─────────────────────────────────────────
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const { data: mealsData } = await supabase
    .from('meals')
    .select('eaten_at, meal_items(calories)')
    .eq('user_id', user.id)
    .gte('eaten_at', sevenDaysAgo.toISOString().split('T')[0] + 'T00:00:00')

  // Aggregate calories per day
  const calMap = new Map<string, number>()
  for (const meal of mealsData ?? []) {
    const d = toDateStr(new Date(meal.eaten_at as string))
    const items = (meal.meal_items as { calories: number }[] | null) ?? []
    const total = items.reduce((sum, item) => sum + (item.calories ?? 0), 0)
    calMap.set(d, (calMap.get(d) ?? 0) + total)
  }

  const calorieData: CalorieEntry[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = toDateStr(d)
    calorieData.push({
      date: dateStr,
      label: i === 0 ? '오늘' : DAY_LABELS[d.getDay()],
      calories: calMap.get(dateStr) ?? 0,
    })
  }

  // ── 3. Body stats: last 30 records ───────────────────────────────────────
  const { data: bodyStats } = await supabase
    .from('body_stats')
    .select('weight_kg, body_fat_pct, recorded_at')
    .eq('user_id', user.id)
    .order('recorded_at', { ascending: true })
    .limit(30)

  const weightData: WeightEntry[] = (bodyStats ?? [])
    .filter((s) => s.weight_kg != null)
    .map((s) => ({
      date: toDateStr(new Date(s.recorded_at as string)),
      weight: s.weight_kg as number,
    }))

  // ── 4. Derived stats ──────────────────────────────────────────────────────

  // This month's workout count
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const workoutsThisMonth = (workoutDays ?? []).filter((w) => {
    return new Date(w.started_at as string) >= monthStart
  }).length

  // This week's workout days (Mon–Sun)
  const dayOfWeek = today.getDay() // 0=Sun
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - ((dayOfWeek + 6) % 7)) // Monday
  weekStart.setHours(0, 0, 0, 0)

  const workoutDaysThisWeek = new Set(
    (workoutDays ?? [])
      .filter((w) => new Date(w.started_at as string) >= weekStart)
      .map((w) => toDateStr(new Date(w.started_at as string)))
  ).size

  // Today's calories
  const todayStr = toDateStr(today)
  const todayCalories = calMap.get(todayStr) ?? 0

  // Current weight (latest record)
  const currentWeight =
    weightData.length > 0 ? weightData[weightData.length - 1].weight : null

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        backgroundColor: '#0f0f0f',
        minHeight: '100vh',
        maxWidth: '430px',
        margin: '0 auto',
        paddingBottom: '96px',
        color: '#f0f0f0',
        fontFamily: 'Pretendard Variable, Pretendard, sans-serif',
      }}
    >
      {/* Sticky Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#0f0f0f',
          borderBottom: '1px solid #2a2a2a',
          padding: '16px 20px',
        }}
      >
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>통계</h1>
      </header>

      <div style={{ padding: '20px 20px 0' }}>
        {/* ── Stat Pills ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginBottom: '28px',
          }}
        >
          <StatPill label="이번 달 운동" value={`${workoutsThisMonth}회`} />
          <StatPill label="이번 주 운동일" value={`${workoutDaysThisWeek}일`} />
          <StatPill label="오늘 칼로리" value={`${todayCalories.toLocaleString()} kcal`} />
          <StatPill
            label="현재 체중"
            value={currentWeight != null ? `${currentWeight} kg` : '—'}
          />
        </div>

        {/* ── Workout Heatmap ────────────────────────────────────────────────── */}
        <Section title="운동 기록">
          <WorkoutHeatmap data={heatmapData} />
        </Section>

        {/* ── Calorie Bar Chart ──────────────────────────────────────────────── */}
        <Section title="최근 7일 칼로리">
          <CalorieBarChart data={calorieData} />
        </Section>

        {/* ── Weight Chart (only if data exists) ────────────────────────────── */}
        {weightData.length > 0 && (
          <Section title="체중 변화">
            <WeightChart data={weightData} />
          </Section>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components (server-safe, no 'use client' needed) ─────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        backgroundColor: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: '12px',
        padding: '14px 16px',
      }}
    >
      <p style={{ color: '#888888', fontSize: '12px', margin: '0 0 4px' }}>{label}</p>
      <p style={{ color: '#f0f0f0', fontSize: '18px', fontWeight: 700, margin: 0 }}>{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '28px' }}>
      <h2
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: '#f0f0f0',
          margin: '0 0 12px',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '16px',
          padding: '16px',
        }}
      >
        {children}
      </div>
    </section>
  )
}
