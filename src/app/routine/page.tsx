'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, ChevronRight, Dumbbell, Check } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface RoutineData {
  summary: {
    goal: string
    tdee: number
    target_calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }
  schedule: RoutineDay[]
  rest_days: number[]
  notes?: string
}

interface WizardProfile {
  goal: string
  gender: string
  age: string
  heightCm: string
  currentWeight: string
  targetWeight: string
  activityLevel: string
  workoutDays: number
  equipment: string[]
}

const GOAL_OPTIONS = [
  { id: '다이어트', label: '다이어트', emoji: '🔥', desc: '체지방 감소' },
  { id: '벌크업', label: '벌크업', emoji: '💪', desc: '근육량 증가' },
  { id: '유지', label: '유지', emoji: '⚖️', desc: '현재 몸 유지' },
  { id: '체력향상', label: '체력향상', emoji: '🏃', desc: '기초체력 강화' },
]

const ACTIVITY_OPTIONS = [
  { id: 'sedentary', label: '저활동', desc: '주로 앉아서 생활' },
  { id: 'moderate', label: '보통', desc: '가벼운 운동 1-3회/주' },
  { id: 'active', label: '활동적', desc: '중간 강도 3-5회/주' },
  { id: 'very_active', label: '매우 활동적', desc: '강도 높은 6-7회/주' },
]

const EQUIPMENT_OPTIONS = [
  { id: '바벨', emoji: '🏋️' },
  { id: '덤벨', emoji: '💪' },
  { id: '케이블', emoji: '🔗' },
  { id: '머신', emoji: '⚙️' },
  { id: '맨몸', emoji: '🙆' },
  { id: '저항밴드', emoji: '🎗️' },
]

const DAY_NAMES = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']

// ─── Wizard Component ─────────────────────────────────────────────────────────

function RoutineWizard({ onGenerated, initialProfile }: {
  onGenerated: () => void
  initialProfile: Partial<WizardProfile>
}) {
  const [step, setStep] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<WizardProfile>({
    goal: initialProfile.goal ?? '다이어트',
    gender: initialProfile.gender ?? '남성',
    age: initialProfile.age ?? '',
    heightCm: initialProfile.heightCm ?? '',
    currentWeight: initialProfile.currentWeight ?? '',
    targetWeight: initialProfile.targetWeight ?? '',
    activityLevel: initialProfile.activityLevel ?? 'moderate',
    workoutDays: initialProfile.workoutDays ?? 3,
    equipment: initialProfile.equipment ?? ['바벨', '덤벨'],
  })

  const set = <K extends keyof WizardProfile>(key: K, val: WizardProfile[K]) =>
    setProfile(p => ({ ...p, [key]: val }))

  const toggleEquipment = (id: string) => {
    setProfile(p => ({
      ...p,
      equipment: p.equipment.includes(id)
        ? p.equipment.filter(e => e !== id)
        : [...p.equipment, id],
    }))
  }

  const steps = [
    { title: '목표 설정', subtitle: '어떤 목표를 달성하고 싶으신가요?' },
    { title: '신체 정보', subtitle: 'AI가 맞춤 계산에 활용합니다' },
    { title: '운동 스타일', subtitle: '운동 빈도와 환경을 알려주세요' },
  ]

  const canNext = () => {
    if (step === 0) return !!profile.goal
    if (step === 1) return !!profile.currentWeight
    return profile.workoutDays > 0 && profile.equipment.length > 0
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setGenProgress(0)

    const interval = setInterval(() => {
      setGenProgress(p => Math.min(p + 2, 92))
    }, 200)

    try {
      const res = await fetch('/api/generate-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            goal: profile.goal,
            gender: profile.gender,
            age: profile.age ? Number(profile.age) : null,
            heightCm: profile.heightCm ? Number(profile.heightCm) : null,
            currentWeight: profile.currentWeight ? Number(profile.currentWeight) : null,
            targetWeight: profile.targetWeight ? Number(profile.targetWeight) : null,
            activityLevel: profile.activityLevel,
            workoutDays: profile.workoutDays,
            equipment: profile.equipment,
            dietaryRestrictions: [],
          },
        }),
      })

      clearInterval(interval)
      setGenProgress(100)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '생성 실패')
      }

      setTimeout(() => onGenerated(), 600)
    } catch (e) {
      clearInterval(interval)
      setError(e instanceof Error ? e.message : '루틴 생성에 실패했습니다')
      setGenerating(false)
      setGenProgress(0)
    }
  }

  // ── Generating screen
  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-full border-4 border-accent/20 border-t-accent mb-6"
        />
        <h2 className="text-lg font-bold text-text-primary mb-2">AI가 루틴을 설계하는 중...</h2>
        <p className="text-sm text-text-secondary mb-8">
          {profile.goal} 목표에 맞춘 과학적 운동 계획을 작성하고 있어요
        </p>
        {/* progress bar */}
        <div className="w-full max-w-xs bg-we-border rounded-full h-2 mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-accent rounded-full"
            animate={{ width: `${genProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <p className="text-xs text-text-muted">{genProgress}%</p>
        <div className="mt-8 space-y-2 text-left w-full max-w-xs">
          {[
            '운동 분할법 선택 중...',
            'TDEE 계산 중...',
            '주간 스케줄 설계 중...',
            '영양 목표 산출 중...',
          ].map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: genProgress > i * 25 ? 1 : 0.2, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2 text-xs text-text-secondary"
            >
              <motion.div
                animate={genProgress > (i + 1) * 25 ? { scale: [1, 1.2, 1] } : {}}
                className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  genProgress > (i + 1) * 25 ? 'bg-accent' : 'bg-we-border'
                }`}
              >
                {genProgress > (i + 1) * 25 && <Check size={9} className="text-bg-primary" strokeWidth={3} />}
              </motion.div>
              {msg}
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[60vh]">
      {/* Step indicator */}
      <div className="flex items-center gap-2 px-5 pt-5 pb-4">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < step ? 'bg-accent text-bg-primary'
              : i === step ? 'bg-accent/20 border-2 border-accent text-accent'
              : 'bg-we-border text-text-muted'
            }`}>
              {i < step ? <Check size={12} strokeWidth={3} /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 rounded ${i < step ? 'bg-accent' : 'bg-we-border'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="px-5 mb-5">
        <h2 className="text-lg font-bold text-text-primary">{steps[step].title}</h2>
        <p className="text-sm text-text-secondary">{steps[step].subtitle}</p>
      </div>

      <div className="flex-1 px-5 overflow-y-auto pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 0: 목표 */}
            {step === 0 && (
              <div className="space-y-3">
                {GOAL_OPTIONS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => set('goal', g.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-[14px] border-2 text-left transition-all active:scale-[0.98]"
                    style={{
                      backgroundColor: profile.goal === g.id ? 'rgba(200,255,0,0.08)' : 'var(--bg-secondary)',
                      borderColor: profile.goal === g.id ? 'var(--accent)' : 'var(--border)',
                    }}
                  >
                    <span className="text-2xl">{g.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-text-primary">{g.label}</p>
                      <p className="text-xs text-text-secondary">{g.desc}</p>
                    </div>
                    {profile.goal === g.id && (
                      <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                        <Check size={11} className="text-bg-primary" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Step 1: 신체 정보 */}
            {step === 1 && (
              <div className="space-y-4">
                {/* 성별 */}
                <div>
                  <label className="text-xs text-text-secondary mb-2 block">성별</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['남성', '여성'].map(g => (
                      <button
                        key={g}
                        onClick={() => set('gender', g)}
                        className="py-3 rounded-[10px] text-sm font-medium transition-all"
                        style={{
                          backgroundColor: profile.gender === g ? 'var(--accent)' : 'var(--bg-tertiary)',
                          color: profile.gender === g ? 'var(--bg-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        {g === '남성' ? '👨 남성' : '👩 여성'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 나이/키/체중 */}
                {[
                  { key: 'age' as const, label: '나이', unit: '세', placeholder: '25', inputMode: 'numeric' as const },
                  { key: 'heightCm' as const, label: '키', unit: 'cm', placeholder: '170', inputMode: 'decimal' as const },
                  { key: 'currentWeight' as const, label: '현재 체중 *', unit: 'kg', placeholder: '70', inputMode: 'decimal' as const },
                  { key: 'targetWeight' as const, label: '목표 체중', unit: 'kg', placeholder: '65', inputMode: 'decimal' as const },
                ].map(({ key, label, unit, placeholder, inputMode }) => (
                  <div key={key}>
                    <label className="text-xs text-text-secondary mb-1.5 block">{label}</label>
                    <div className="bg-bg-secondary border border-we-border rounded-[12px] flex items-center px-4 focus-within:border-accent transition-colors">
                      <input
                        type="number"
                        inputMode={inputMode}
                        placeholder={placeholder}
                        value={profile[key]}
                        onChange={e => set(key, e.target.value)}
                        className="flex-1 bg-transparent py-3 text-sm text-text-primary outline-none"
                      />
                      <span className="text-xs text-text-muted">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 2: 운동 스타일 */}
            {step === 2 && (
              <div className="space-y-5">
                {/* 활동량 */}
                <div>
                  <label className="text-xs text-text-secondary mb-2 block">평소 활동량</label>
                  <div className="space-y-2">
                    {ACTIVITY_OPTIONS.map(a => (
                      <button
                        key={a.id}
                        onClick={() => set('activityLevel', a.id)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-[12px] border-2 text-left transition-all"
                        style={{
                          backgroundColor: profile.activityLevel === a.id ? 'rgba(200,255,0,0.08)' : 'var(--bg-secondary)',
                          borderColor: profile.activityLevel === a.id ? 'var(--accent)' : 'var(--border)',
                        }}
                      >
                        <div>
                          <p className="text-sm font-medium text-text-primary">{a.label}</p>
                          <p className="text-xs text-text-secondary">{a.desc}</p>
                        </div>
                        {profile.activityLevel === a.id && (
                          <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                            <Check size={11} className="text-bg-primary" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 주 운동 횟수 */}
                <div>
                  <label className="text-xs text-text-secondary mb-2 block">
                    주 운동 횟수 <span className="text-accent font-semibold">{profile.workoutDays}일</span>
                  </label>
                  <div className="flex gap-2">
                    {[2,3,4,5,6].map(d => (
                      <button
                        key={d}
                        onClick={() => set('workoutDays', d)}
                        className="flex-1 py-3 rounded-[10px] text-sm font-bold transition-all"
                        style={{
                          backgroundColor: profile.workoutDays === d ? 'var(--accent)' : 'var(--bg-secondary)',
                          color: profile.workoutDays === d ? 'var(--bg-primary)' : 'var(--text-secondary)',
                          border: `2px solid ${profile.workoutDays === d ? 'var(--accent)' : 'var(--border)'}`,
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 사용 기구 */}
                <div>
                  <label className="text-xs text-text-secondary mb-2 block">사용 가능한 기구 (복수 선택)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {EQUIPMENT_OPTIONS.map(e => (
                      <button
                        key={e.id}
                        onClick={() => toggleEquipment(e.id)}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-[12px] border-2 text-xs font-medium transition-all active:scale-95"
                        style={{
                          backgroundColor: profile.equipment.includes(e.id) ? 'rgba(200,255,0,0.1)' : 'var(--bg-secondary)',
                          borderColor: profile.equipment.includes(e.id) ? 'var(--accent)' : 'var(--border)',
                          color: profile.equipment.includes(e.id) ? 'var(--accent)' : 'var(--text-secondary)',
                        }}
                      >
                        <span className="text-xl">{e.emoji}</span>
                        {e.id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 에러 */}
      {error && (
        <p className="px-5 py-2 text-xs text-red-400 text-center">{error}</p>
      )}

      {/* 버튼 */}
      <div className="px-5 pt-3 pb-5 flex gap-3 border-t border-we-border mt-2">
        {step > 0 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="px-5 py-3.5 rounded-[12px] bg-bg-secondary border border-we-border text-sm font-medium text-text-secondary"
          >
            이전
          </button>
        )}
        <button
          onClick={() => {
            if (step < steps.length - 1) setStep(s => s + 1)
            else handleGenerate()
          }}
          disabled={!canNext()}
          className="flex-1 py-3.5 rounded-[12px] text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--bg-primary)' }}
        >
          {step < steps.length - 1 ? (
            <>다음 <ChevronRight size={16} /></>
          ) : (
            <>🤖 AI 루틴 생성하기</>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Routine Display ──────────────────────────────────────────────────────────

function ExerciseRow({ ex, idx }: { ex: RoutineExercise; idx: number }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="min-w-[22px] h-[22px] rounded-md bg-bg-tertiary text-text-secondary text-xs flex items-center justify-center font-medium mt-0.5 shrink-0">
        {idx + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{ex.name}</p>
        {ex.notes && <p className="text-xs text-text-muted mt-0.5">{ex.notes}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs px-1.5 py-0.5 rounded bg-accent/15 text-accent font-medium">{ex.sets}세트</span>
        <span className="text-xs text-text-secondary">{ex.reps}회</span>
        <span className="text-xs text-text-muted">{ex.rest_sec}s</span>
      </div>
    </div>
  )
}

function DayCard({ day }: { day: RoutineDay }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-bg-secondary rounded-[16px] border border-we-border mb-3 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-we-border"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-accent text-bg-primary">
            {day.day_name}
          </span>
          <span className="text-sm font-semibold text-text-primary">{day.focus}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">{day.exercises.length}개</span>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight size={14} className="text-text-muted rotate-90" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 divide-y divide-we-border">
              {day.exercises.map((ex, i) => <ExerciseRow key={i} ex={ex} idx={i} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function RestDayCard({ name }: { name: string }) {
  return (
    <div className="bg-bg-secondary border border-we-border rounded-[16px] mb-3 px-4 py-3.5 flex items-center gap-3">
      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-bg-tertiary text-text-muted">{name}</span>
      <span className="text-sm text-text-muted">휴식</span>
      <span className="ml-auto text-base">😴</span>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RoutinePage() {
  const [routine, setRoutine] = useState<{ id: string; created_at: string; routine_data: RoutineData } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [initialProfile, setInitialProfile] = useState<Partial<WizardProfile>>({})

  const loadRoutine = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const [routineRes, profileRes] = await Promise.all([
      supabase
        .from('ai_routines')
        .select('id, created_at, routine_data')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .maybeSingle(),
      supabase
        .from('user_profiles')
        .select('goal, height_cm, current_weight_kg, target_weight_kg, activity_level, workout_days_per_week')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    if (routineRes.data) {
      setRoutine(routineRes.data as { id: string; created_at: string; routine_data: RoutineData })
    }

    if (profileRes.data) {
      const p = profileRes.data
      setInitialProfile({
        goal: p.goal ?? '다이어트',
        heightCm: p.height_cm?.toString() ?? '',
        currentWeight: p.current_weight_kg?.toString() ?? '',
        targetWeight: p.target_weight_kg?.toString() ?? '',
        activityLevel: p.activity_level ?? 'moderate',
        workoutDays: p.workout_days_per_week ?? 3,
      })
    }

    setLoading(false)
  }, [])

  useEffect(() => { loadRoutine() }, [loadRoutine])

  const handleGenerated = async () => {
    setShowWizard(false)
    setLoading(true)
    await loadRoutine()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const routineData = routine?.routine_data ?? null

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto w-full max-w-[430px]">

        {/* 헤더 */}
        <header className="sticky top-0 z-20 bg-bg-primary border-b border-we-border px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">나의 루틴</h1>
            {routine && (
              <p className="text-[11px] text-text-muted mt-0.5">
                {new Date(routine.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 생성
              </p>
            )}
          </div>
          {routine && (
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-bg-secondary border border-we-border text-xs font-medium text-text-secondary active:bg-bg-tertiary"
            >
              <RefreshCw size={13} />
              재생성
            </button>
          )}
        </header>

        {/* 빈 상태 or 루틴 */}
        <main className="px-4 pt-5 pb-28">
          {!routine && !showWizard && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-24 h-24 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center mb-6">
                <Dumbbell size={40} className="text-accent" />
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">AI 맞춤 루틴</h2>
              <p className="text-sm text-text-secondary mb-2 leading-relaxed">
                목표, 신체 정보, 운동 환경을 입력하면<br />
                AI가 과학적 맞춤 운동 계획을 설계해 드려요
              </p>
              <div className="flex flex-col gap-2 text-xs text-text-muted mb-8">
                <p>✅ Harris-Benedict TDEE 자동 계산</p>
                <p>✅ 목표별 분할법 (다이어트/벌크/유지)</p>
                <p>✅ 주간 스케줄 + 영양 목표 제시</p>
              </div>
              <button
                onClick={() => setShowWizard(true)}
                className="w-full max-w-xs bg-accent text-bg-primary font-bold py-4 rounded-[16px] text-base active:scale-[0.98] transition-transform shadow-lg shadow-accent/20"
              >
                🤖 AI 루틴 생성하기
              </button>
            </motion.div>
          )}

          {/* 위저드 */}
          {showWizard && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-secondary rounded-[20px] border border-we-border overflow-hidden"
            >
              <div className="px-5 pt-4 pb-2 border-b border-we-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-primary">🤖 AI 루틴 생성</p>
                  <p className="text-xs text-text-muted">3단계로 맞춤 루틴을 설계해요</p>
                </div>
                {routine && (
                  <button onClick={() => setShowWizard(false)} className="text-xs text-text-muted hover:text-text-secondary px-2 py-1 rounded bg-bg-tertiary">
                    취소
                  </button>
                )}
              </div>
              <RoutineWizard onGenerated={handleGenerated} initialProfile={initialProfile} />
            </motion.div>
          )}

          {/* 루틴 표시 */}
          {routine && routineData && !showWizard && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Summary card */}
              {routineData.summary && (
                <div className="bg-bg-secondary rounded-[16px] border border-we-border p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-text-primary">루틴 요약</p>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium">
                      {routineData.summary.goal}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-bg-tertiary rounded-[10px] p-3 text-center">
                      <p className="text-[10px] text-text-secondary mb-1">TDEE</p>
                      <p className="text-sm font-bold text-text-primary">
                        {routineData.summary.tdee?.toLocaleString() ?? '—'}
                        <span className="text-[10px] font-normal text-text-muted ml-0.5">kcal</span>
                      </p>
                    </div>
                    <div className="bg-bg-tertiary rounded-[10px] p-3 text-center">
                      <p className="text-[10px] text-text-secondary mb-1">목표 칼로리</p>
                      <p className="text-sm font-bold text-accent">
                        {routineData.summary.target_calories?.toLocaleString() ?? '—'}
                        <span className="text-[10px] font-normal text-text-muted ml-0.5">kcal</span>
                      </p>
                    </div>
                  </div>
                  <div className="bg-bg-tertiary rounded-[10px] p-3 flex justify-around">
                    {[
                      { label: '단백질', value: routineData.summary.protein_g, unit: 'g', color: '#4FC3F7' },
                      { label: '탄수화물', value: routineData.summary.carbs_g, unit: 'g', color: '#81C784' },
                      { label: '지방', value: routineData.summary.fat_g, unit: 'g', color: '#FFB74D' },
                    ].map(({ label, value, unit, color }) => (
                      <div key={label} className="text-center">
                        <p className="text-[10px] text-text-secondary mb-1">{label}</p>
                        <p className="text-sm font-bold" style={{ color }}>
                          {value ?? '—'}<span className="text-[10px] font-normal text-text-muted ml-0.5">{unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weekly schedule */}
              <h2 className="text-sm font-semibold text-text-primary mb-3">주간 스케줄</h2>
              {DAY_NAMES.map((name, idx) => {
                const dayNum = idx + 1
                const dayData = routineData.schedule?.find(d => d.day === dayNum)
                const isRest = routineData.rest_days?.includes(dayNum)

                if (dayData) return <DayCard key={dayNum} day={{ ...dayData, day_name: dayData.day_name || name }} />
                if (isRest) return <RestDayCard key={dayNum} name={name} />
                return <RestDayCard key={dayNum} name={name} />
              })}

              {/* Notes */}
              {routineData.notes && (
                <div className="bg-bg-secondary border border-we-border rounded-[14px] p-4 mt-1">
                  <p className="text-xs font-medium text-text-secondary mb-1.5">💡 AI 코멘트</p>
                  <p className="text-sm text-text-primary leading-relaxed">{routineData.notes}</p>
                </div>
              )}
            </motion.div>
          )}
        </main>
      </div>
    </div>
  )
}
