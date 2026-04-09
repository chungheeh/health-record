import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import WorkoutHeatmap from '@/components/dashboard/WorkoutHeatmap'
import CalorieBarChart from '@/components/dashboard/CalorieBarChart'
import WeightChart from '@/components/dashboard/WeightChart'
import WeeklyComboChart from '@/components/dashboard/WeeklyComboChart'
import { calcTDEE, ACTIVITY_INFO, type ActivityLevel, type Gender } from '@/lib/utils/tdee'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeatmapEntry  { date: string; count: number }
interface CalorieEntry  { date: string; label: string; calories: number }
interface WeightEntry   { date: string; weight: number }

function toDateStr(date: Date): string { return date.toISOString().split('T')[0] }
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date()

  // ── 1. 운동 히트맵 (84일) ─────────────────────────────────────────────────
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 83)

  const { data: workoutDays } = await supabase
    .from('workouts')
    .select('started_at')
    .eq('user_id', user.id)
    .gte('started_at', startDate.toISOString())
    .not('finished_at', 'is', null)

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

  // ── 2. 칼로리 (7일) ───────────────────────────────────────────────────────
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const { data: mealsData } = await supabase
    .from('meals')
    .select('eaten_at, meal_items(calories)')
    .eq('user_id', user.id)
    .gte('eaten_at', sevenDaysAgo.toISOString().split('T')[0] + 'T00:00:00')

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

  // ── 3. 체중 기록 ──────────────────────────────────────────────────────────
  const { data: bodyStats } = await supabase
    .from('body_stats')
    .select('weight_kg, body_fat_pct, recorded_at')
    .eq('user_id', user.id)
    .order('recorded_at', { ascending: true })
    .limit(30)

  const weightData: WeightEntry[] = (bodyStats ?? [])
    .filter(s => s.weight_kg != null)
    .map(s => ({ date: toDateStr(new Date(s.recorded_at as string)), weight: s.weight_kg as number }))

  // ── 3-b. 주간 칼로리 + 운동 횟수 복합 데이터 (4주) ─────────────────────
  const fourWeeksAgo = new Date(today)
  fourWeeksAgo.setDate(today.getDate() - 27)

  interface WeeklyEntry { week: string; calories: number; workouts: number }
  const weeklyMap = new Map<string, WeeklyEntry>()

  for (let i = 27; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const weekNum = Math.floor(i / 7)
    const weekLabel = weekNum === 0 ? '이번 주' : `${weekNum}주 전`
    if (!weeklyMap.has(weekLabel)) {
      weeklyMap.set(weekLabel, { week: weekLabel, calories: 0, workouts: 0 })
    }
  }

  for (const meal of mealsData ?? []) {
    const d = new Date(meal.eaten_at as string)
    const diff = Math.floor((today.getTime() - d.getTime()) / (7 * 24 * 3600 * 1000))
    const weekLabel = diff === 0 ? '이번 주' : `${diff}주 전`
    const entry = weeklyMap.get(weekLabel)
    if (entry) {
      const items = (meal.meal_items as { calories: number }[] | null) ?? []
      entry.calories += items.reduce((s, i) => s + (i.calories ?? 0), 0)
    }
  }

  for (const w of workoutDays ?? []) {
    const d = new Date(w.started_at as string)
    const diff = Math.floor((today.getTime() - d.getTime()) / (7 * 24 * 3600 * 1000))
    const weekLabel = diff === 0 ? '이번 주' : `${diff}주 전`
    const entry = weeklyMap.get(weekLabel)
    if (entry) entry.workouts += 1
  }

  const weeklyData = ['3주 전', '2주 전', '1주 전', '이번 주'].map(label => {
    const entry = weeklyMap.get(label)
    return { week: label, calories: Math.round((entry?.calories ?? 0) / 7), workouts: entry?.workouts ?? 0 }
  })

  // ── 4. 유저 프로필 (BMR/TDEE 계산용) ─────────────────────────────────────
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('gender, age, height_cm, current_weight_kg, activity_level, goal')
    .eq('user_id', user.id)
    .maybeSingle()

  // 최근 체중 (body_stats 우선, 없으면 profile)
  const latestWeight =
    weightData.length > 0
      ? weightData[weightData.length - 1].weight
      : (profile?.current_weight_kg ?? null)

  // BMR/TDEE 계산
  let bmrData: ReturnType<typeof calcTDEE> | null = null
  const canCalcBMR =
    profile?.height_cm && latestWeight && profile?.age &&
    (profile?.gender === '남성' || profile?.gender === '여성')

  if (canCalcBMR) {
    const activityMap: Record<string, ActivityLevel> = {
      sedentary: 'sedentary', moderate: 'moderate',
      active: 'active', very_active: 'very_active',
    }
    const actLevel: ActivityLevel = activityMap[profile!.activity_level ?? 'moderate'] ?? 'moderate'
    bmrData = calcTDEE(
      profile!.gender as Gender,
      latestWeight!,
      profile!.height_cm!,
      profile!.age!,
      actLevel,
    )
  }

  // ── 5. 통계 집계 ──────────────────────────────────────────────────────────
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const workoutsThisMonth = (workoutDays ?? []).filter(w =>
    new Date(w.started_at as string) >= monthStart
  ).length

  const dayOfWeek = today.getDay()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - ((dayOfWeek + 6) % 7))
  weekStart.setHours(0, 0, 0, 0)

  const workoutDaysThisWeek = new Set(
    (workoutDays ?? [])
      .filter(w => new Date(w.started_at as string) >= weekStart)
      .map(w => toDateStr(new Date(w.started_at as string)))
  ).size

  const todayCalories = calMap.get(toDateStr(today)) ?? 0

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      backgroundColor: 'var(--bg-primary)', minHeight: '100vh',
      maxWidth: '430px', margin: '0 auto',
      paddingBottom: '96px', color: 'var(--text-primary)',
      fontFamily: 'Pretendard Variable, Pretendard, sans-serif',
    }}>
      {/* 헤더 */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border)',
        padding: '16px 20px',
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>통계</h1>
      </header>

      <div style={{ padding: '20px 20px 0' }}>

        {/* ── Stat Pills ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          <StatPill label="이번 달 운동" value={`${workoutsThisMonth}회`} />
          <StatPill label="이번 주 운동일" value={`${workoutDaysThisWeek}일`} />
          <StatPill label="오늘 칼로리" value={`${todayCalories.toLocaleString()} kcal`} />
          <StatPill label="현재 체중" value={latestWeight != null ? `${latestWeight} kg` : '—'} />
        </div>

        {/* ── BMR / TDEE 카드 ───────────────────────────────────────────────── */}
        <Section title="🔥 기초대사량 / 활동대사량">
          {bmrData ? (
            <BMRCard bmr={bmrData} goal={profile?.goal ?? null} />
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                정확한 계산을 위해 프로필을 완성해주세요<br />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  필요: 성별, 나이, 키, 체중, 활동량
                </span>
              </p>
              <Link
                href="/settings"
                style={{
                  display: 'inline-block',
                  backgroundColor: 'var(--accent)', color: 'var(--bg-primary)',
                  fontWeight: 700, fontSize: '13px',
                  padding: '8px 20px', borderRadius: '10px',
                  textDecoration: 'none',
                }}
              >
                프로필 설정하기
              </Link>
            </div>
          )}
        </Section>

        {/* ── 운동 히트맵 ───────────────────────────────────────────────────── */}
        <Section title="운동 기록">
          <WorkoutHeatmap data={heatmapData} />
        </Section>

        {/* ── 칼로리 바차트 ─────────────────────────────────────────────────── */}
        <Section title="최근 7일 칼로리">
          <CalorieBarChart data={calorieData} />
        </Section>

        {/* ── 주간 복합 차트 ────────────────────────────────────────────────── */}
        <Section title="주간 칼로리 + 운동 현황 (4주)">
          <WeeklyComboChart data={weeklyData} />
        </Section>

        {/* ── 체중 차트 ─────────────────────────────────────────────────────── */}
        {weightData.length > 0 && (
          <Section title="체중 변화">
            <WeightChart data={weightData} />
          </Section>
        )}
      </div>
    </div>
  )
}

// ─── BMR Card ─────────────────────────────────────────────────────────────────

function BMRCard({ bmr, goal }: { bmr: ReturnType<typeof calcTDEE>; goal: string | null }) {
  const goalCalories: Record<string, number> = {
    '다이어트':  bmr.tdee - 400,
    '벌크업':    bmr.tdee + 250,
    '유지':      bmr.tdee,
    '체력향상':  bmr.tdee + 100,
  }
  const targetCal = goal ? goalCalories[goal] : null

  const activityRows = Object.entries(ACTIVITY_INFO).map(([key, info]) => ({
    key,
    ...info,
    tdee: Math.round(bmr.bmr * info.multiplier),
    isCurrent: info.label === bmr.activityLabel,
  }))

  return (
    <div>
      {/* 메인 수치 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div style={{
          backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', padding: '14px',
          border: '1px solid var(--border)', textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 4px' }}>기초대사량 (BMR)</p>
          <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px' }}>
            {bmr.bmr.toLocaleString()}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>kcal/일</p>
        </div>
        <div style={{
          backgroundColor: 'rgba(200,255,0,0.08)', borderRadius: '12px', padding: '14px',
          border: '1.5px solid rgba(200,255,0,0.3)', textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: 'var(--accent)', margin: '0 0 4px' }}>
            활동대사량 (TDEE)
          </p>
          <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent)', margin: '0 0 2px' }}>
            {bmr.tdee.toLocaleString()}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{bmr.activityLabel}</p>
        </div>
      </div>

      {/* 목표 칼로리 */}
      {targetCal && (
        <div style={{
          backgroundColor: 'var(--bg-tertiary)', borderRadius: '10px', padding: '10px 14px',
          border: '1px solid var(--border)', marginBottom: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 2px' }}>
              목표 칼로리 ({goal})
            </p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--success)', margin: 0 }}>
              {targetCal.toLocaleString()} kcal
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 2px' }}>TDEE 대비</p>
            <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: targetCal > bmr.tdee ? '#FFB74D' : '#60A5FA' }}>
              {targetCal > bmr.tdee ? '+' : ''}{(targetCal - bmr.tdee).toLocaleString()} kcal
            </p>
          </div>
        </div>
      )}

      {/* 활동량별 TDEE 표 */}
      <div style={{ marginBottom: '10px' }}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 8px' }}>활동량별 예상 소비 칼로리</p>
        {activityRows.map(row => (
          <div key={row.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 10px', borderRadius: '8px', marginBottom: '4px',
            backgroundColor: row.isCurrent ? 'rgba(200,255,0,0.08)' : 'transparent',
            border: row.isCurrent ? '1px solid rgba(200,255,0,0.25)' : '1px solid transparent',
          }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: row.isCurrent ? 700 : 400, color: row.isCurrent ? 'var(--accent)' : 'var(--text-primary)' }}>
                {row.label}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px' }}>{row.desc}</span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: row.isCurrent ? 'var(--accent)' : 'var(--text-secondary)' }}>
              {row.tdee.toLocaleString()} kcal
            </span>
          </div>
        ))}
      </div>

      {/* 계산식 */}
      <div style={{
        backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', padding: '8px 12px',
        border: '1px solid var(--border)',
      }}>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '0 0 3px' }}>
          Mifflin-St Jeor 공식
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, fontFamily: 'monospace' }}>
          BMR = {bmr.breakdown.weightComponent} + {bmr.breakdown.heightComponent} − {bmr.breakdown.ageComponent} {bmr.breakdown.genderConstant >= 0 ? '+' : '−'} {Math.abs(bmr.breakdown.genderConstant)} = {bmr.bmr} kcal
        </p>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
          TDEE = {bmr.bmr} × {bmr.activityMultiplier} = {bmr.tdee} kcal
        </p>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '14px 16px',
    }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '0 0 4px' }}>{label}</p>
      <p style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700, margin: 0 }}>{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '24px' }}>
      <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 10px' }}>
        {title}
      </h2>
      <div style={{
        backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '16px',
      }}>
        {children}
      </div>
    </section>
  )
}
