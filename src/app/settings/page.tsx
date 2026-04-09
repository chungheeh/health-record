'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, RefreshCw, ShieldCheck, Zap } from 'lucide-react'
import { calcTDEE, adjustCaloriesForGoal, type ActivityLevel, type Gender, type Goal } from '@/lib/utils/tdee'
import ThemeToggle from '@/components/ui/ThemeToggle'

interface ProfileForm {
  goal: string
  gender: string
  age: string
  height_cm: string
  current_weight_kg: string
  target_weight_kg: string
  activity_level: string
  workout_days_per_week: string
  target_calories: string
  target_protein_g: string
  target_carbs_g: string
  target_fat_g: string
}

const GOAL_OPTIONS = [
  { id: 'diet', label: '다이어트', emoji: '🔥' },
  { id: 'bulk', label: '벌크업', emoji: '💪' },
  { id: 'maintain', label: '유지', emoji: '⚖️' },
  { id: 'endurance', label: '체력향상', emoji: '🏃' },
]

const ACTIVITY_OPTIONS = [
  { id: 'sedentary', label: '저활동' },
  { id: 'moderate', label: '보통' },
  { id: 'active', label: '활동적' },
  { id: 'very_active', label: '매우 활동적' },
]

export default function SettingsPage() {
  const router = useRouter()
  const [form, setForm] = useState<ProfileForm>({
    goal: '', gender: '', age: '', height_cm: '', current_weight_kg: '', target_weight_kg: '',
    activity_level: '', workout_days_per_week: '3',
    target_calories: '', target_protein_g: '', target_carbs_g: '', target_fat_g: '',
  })
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile) {
        setForm({
          goal: profile.goal ?? '',
          gender: profile.gender ?? '',
          age: profile.age?.toString() ?? '',
          height_cm: profile.height_cm?.toString() ?? '',
          current_weight_kg: profile.current_weight_kg?.toString() ?? '',
          target_weight_kg: profile.target_weight_kg?.toString() ?? '',
          activity_level: profile.activity_level ?? '',
          workout_days_per_week: profile.workout_days_per_week?.toString() ?? '3',
          target_calories: profile.target_calories?.toString() ?? '',
          target_protein_g: profile.target_protein_g?.toString() ?? '',
          target_carbs_g: profile.target_carbs_g?.toString() ?? '',
          target_fat_g: profile.target_fat_g?.toString() ?? '',
        })
        setIsAdmin((profile as { is_admin?: boolean }).is_admin === true)
      }
      setLoading(false)
    }
    load()
  }, [router])

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('user_profiles').upsert({
        user_id: user.id,
        goal: form.goal || null,
        gender: form.gender || null,
        age: form.age ? Number(form.age) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        current_weight_kg: form.current_weight_kg ? Number(form.current_weight_kg) : null,
        target_weight_kg: form.target_weight_kg ? Number(form.target_weight_kg) : null,
        activity_level: form.activity_level || null,
        workout_days_per_week: form.workout_days_per_week ? Number(form.workout_days_per_week) : null,
        target_calories: form.target_calories ? Number(form.target_calories) : null,
        target_protein_g: form.target_protein_g ? Number(form.target_protein_g) : null,
        target_carbs_g: form.target_carbs_g ? Number(form.target_carbs_g) : null,
        target_fat_g: form.target_fat_g ? Number(form.target_fat_g) : null,
      }, { onConflict: 'user_id' })
      setSavedMsg('저장되었습니다!')
      setTimeout(() => setSavedMsg(''), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerate = async () => {
    // 먼저 저장
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setRegenerating(true)
    try {
      // 최신 프로필 먼저 저장
      await supabase.from('user_profiles').upsert({
        user_id: user.id,
        goal: form.goal || null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        current_weight_kg: form.current_weight_kg ? Number(form.current_weight_kg) : null,
        target_weight_kg: form.target_weight_kg ? Number(form.target_weight_kg) : null,
        activity_level: form.activity_level || null,
        workout_days_per_week: form.workout_days_per_week ? Number(form.workout_days_per_week) : null,
      }, { onConflict: 'user_id' })

      // 프로필 데이터를 API에 전송
      const profile = {
        goal: form.goal || '유지',
        gender: null,
        age: null,
        heightCm: form.height_cm ? Number(form.height_cm) : null,
        currentWeight: form.current_weight_kg ? Number(form.current_weight_kg) : null,
        targetWeight: form.target_weight_kg ? Number(form.target_weight_kg) : null,
        activityLevel: form.activity_level || 'moderate',
        workoutDays: form.workout_days_per_week ? Number(form.workout_days_per_week) : 3,
        equipment: ['바벨', '덤벨', '머신'],
        dietaryRestrictions: [],
      }

      const res = await fetch('/api/generate-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '루틴 생성 실패')
      }

      setSavedMsg('✅ 루틴이 생성되었습니다! 루틴 탭에서 확인하세요.')
      setTimeout(() => setSavedMsg(''), 3000)
    } catch (e) {
      setSavedMsg(`❌ ${e instanceof Error ? e.message : '루틴 생성 실패'}`)
      setTimeout(() => setSavedMsg(''), 3000)
    } finally {
      setRegenerating(false)
    }
  }

  const set = (key: keyof ProfileForm) => (val: string) =>
    setForm(p => ({ ...p, [key]: val }))

  const handleAutoCalc = () => {
    const weight = Number(form.current_weight_kg)
    const height = Number(form.height_cm)
    const age = Number(form.age)
    const gender = form.gender as Gender
    const activity = form.activity_level as ActivityLevel
    const goal = form.goal as Goal

    if (!weight || !height || !age || !gender || !activity) {
      setSavedMsg('❌ 성별, 나이, 키, 체중, 활동량을 먼저 입력해주세요')
      setTimeout(() => setSavedMsg(''), 3000)
      return
    }

    const result = calcTDEE(gender, weight, height, age, activity)
    const targetCal = goal ? adjustCaloriesForGoal(result.tdee, goal) : result.tdee
    const protein = Math.round(weight * 2)
    const fat = Math.round(weight * 0.8)
    const carbsCal = targetCal - (protein * 4) - (fat * 9)
    const carbs = Math.max(0, Math.round(carbsCal / 4))

    setForm(p => ({
      ...p,
      target_calories: String(targetCal),
      target_protein_g: String(protein),
      target_carbs_g: String(carbs),
      target_fat_g: String(fat),
    }))
    setSavedMsg(`✅ TDEE ${result.tdee} kcal 기준으로 목표를 설정했습니다`)
    setTimeout(() => setSavedMsg(''), 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-bg-primary">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-bg-primary border-b border-we-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-text-secondary">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold text-text-primary flex-1">설정</h1>
      </header>

      <div className="px-4 pt-4 pb-44 space-y-4">
        {/* 테마 */}
        <div className="bg-bg-secondary rounded-[16px] p-4 space-y-3">
          <p className="text-sm font-semibold text-text-primary">테마</p>
          <ThemeToggle />
        </div>

        {/* 목표 */}
        <div className="bg-bg-secondary rounded-[16px] p-4 space-y-3">
          <p className="text-sm font-semibold text-text-primary">운동 목표</p>
          <div className="grid grid-cols-2 gap-2">
            {GOAL_OPTIONS.map(g => (
              <button
                key={g.id}
                onClick={() => set('goal')(g.id)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] text-sm transition-all"
                style={{
                  backgroundColor: form.goal === g.id ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
                  border: `1.5px solid ${form.goal === g.id ? 'var(--accent)' : 'transparent'}`,
                  color: form.goal === g.id ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                <span>{g.emoji}</span>
                <span className="font-medium">{g.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 신체 정보 */}
        <div className="bg-bg-secondary rounded-[16px] p-4 space-y-3">
          <p className="text-sm font-semibold text-text-primary">신체 정보</p>

          {/* 성별 */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary w-20 shrink-0">성별</span>
            <div className="flex gap-2 flex-1">
              {(['남성', '여성'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => set('gender')(g)}
                  className="flex-1 py-2 rounded-[10px] text-sm font-medium transition-all"
                  style={{
                    backgroundColor: form.gender === g ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: form.gender === g ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  }}
                >{g}</button>
              ))}
            </div>
          </div>

          {([
            { key: 'age', label: '나이', unit: '세', placeholder: '25', min: '1', max: '120' },
            { key: 'height_cm', label: '키', unit: 'cm', placeholder: '170', min: '100', max: '250' },
            { key: 'current_weight_kg', label: '현재 체중', unit: 'kg', placeholder: '70', min: '20', max: '300' },
            { key: 'target_weight_kg', label: '목표 체중', unit: 'kg', placeholder: '65', min: '20', max: '300' },
          ] as const).map(({ key, label, unit, placeholder, min, max }) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs text-text-secondary w-20 shrink-0">{label}</span>
              <div className="flex-1 bg-bg-tertiary border border-we-border rounded-[10px] flex items-center px-3 focus-within:border-accent">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={placeholder}
                  min={min}
                  max={max}
                  value={form[key]}
                  onChange={e => set(key)(e.target.value)}
                  className="flex-1 bg-transparent py-2.5 text-sm text-text-primary outline-none"
                />
                <span className="text-xs text-text-muted">{unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* 활동량 */}
        <div className="bg-bg-secondary rounded-[16px] p-4 space-y-3">
          <p className="text-sm font-semibold text-text-primary">활동량</p>
          <div className="grid grid-cols-2 gap-2">
            {ACTIVITY_OPTIONS.map(a => (
              <button
                key={a.id}
                onClick={() => set('activity_level')(a.id)}
                className="py-2.5 rounded-[10px] text-sm font-medium transition-all"
                style={{
                  backgroundColor: form.activity_level === a.id ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: form.activity_level === a.id ? 'var(--bg-primary)' : 'var(--text-secondary)',
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* 주 운동 횟수 */}
        <div className="bg-bg-secondary rounded-[16px] p-4 space-y-3">
          <p className="text-sm font-semibold text-text-primary">
            주 운동 횟수&nbsp;
            <span className="text-accent">{form.workout_days_per_week}일</span>
          </p>
          <div className="flex gap-2">
            {[1,2,3,4,5,6,7].map(d => (
              <button
                key={d}
                onClick={() => set('workout_days_per_week')(String(d))}
                className="flex-1 py-2.5 rounded-[8px] text-xs font-bold transition-all"
                style={{
                  backgroundColor: Number(form.workout_days_per_week) === d ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: Number(form.workout_days_per_week) === d ? 'var(--bg-primary)' : 'var(--text-secondary)',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* 영양 목표 */}
        <div className="bg-bg-secondary rounded-[16px] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-primary">영양 목표 (선택)</p>
            <button
              onClick={handleAutoCalc}
              className="flex items-center gap-1 text-xs font-medium text-bg-primary bg-accent px-3 py-1.5 rounded-[8px] active:scale-95 transition-transform"
            >
              <Zap size={11} />
              TDEE 자동 계산
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'target_calories', label: '목표 칼로리', unit: 'kcal', color: 'var(--accent)' },
              { key: 'target_protein_g', label: '단백질', unit: 'g', color: '#4FC3F7' },
              { key: 'target_carbs_g', label: '탄수화물', unit: 'g', color: '#81C784' },
              { key: 'target_fat_g', label: '지방', unit: 'g', color: '#FFB74D' },
            ] as const).map(({ key, label, unit, color }) => (
              <div key={key} className="bg-bg-tertiary rounded-[10px] p-3">
                <label className="text-[10px] font-medium" style={{ color }}>{label}</label>
                <div className="flex items-center mt-1.5 gap-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="—"
                    min="0"
                    value={form[key]}
                    onChange={e => set(key)(e.target.value)}
                    className="flex-1 bg-transparent text-sm text-text-primary outline-none tabular-nums w-full"
                  />
                  <span className="text-[10px] text-text-muted shrink-0">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 루틴 재생성 */}
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-bg-secondary border border-we-border rounded-[16px] text-sm text-text-secondary disabled:opacity-60"
        >
          <RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? '루틴 생성 중...' : 'AI 루틴 재생성'}
        </button>

        {savedMsg && (
          <p className="text-center text-sm text-accent">{savedMsg}</p>
        )}

        {/* 관리자 버튼 — is_admin인 경우만 표시 */}
        {isAdmin && (
          <button
            onClick={() => router.push('/admin')}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-bg-secondary border border-accent/30 rounded-[16px] text-sm text-accent hover:bg-accent/10 transition-colors"
          >
            <ShieldCheck size={16} />
            관리자 페이지
          </button>
        )}
      </div>

      {/* 저장 버튼 — bottom-16 으로 BottomNav(h-16) 위에 위치 */}
      <div className="fixed bottom-16 left-0 right-0 max-w-[430px] mx-auto px-4 pb-3 pt-3 bg-gradient-to-t from-bg-primary via-bg-primary/90 to-transparent z-40">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-accent text-bg-primary font-bold rounded-[16px] text-sm disabled:opacity-60 active:scale-[0.98] transition-transform shadow-lg"
        >
          {saving ? '저장 중...' : '변경사항 저장'}
        </button>
      </div>
    </main>
  )
}
