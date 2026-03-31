'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface OnboardingData {
  goal: string
  gender: string
  age: number
  heightCm: number
  currentWeight: number
  targetWeight: number
  activityLevel: string
  workoutDays: number
  equipment: string[]
  dietaryRestrictions: string[]
}

const INITIAL_DATA: OnboardingData = {
  goal: '',
  gender: '',
  age: 0,
  heightCm: 0,
  currentWeight: 0,
  targetWeight: 0,
  activityLevel: '',
  workoutDays: 3,
  equipment: [],
  dietaryRestrictions: [],
}

const GOALS = [
  { id: 'diet', label: '다이어트', emoji: '🔥' },
  { id: 'bulk', label: '벌크업', emoji: '💪' },
  { id: 'maintain', label: '유지', emoji: '⚖️' },
  { id: 'endurance', label: '체력향상', emoji: '🏃' },
]

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: '저활동', emoji: '🛋️', desc: '주 1-2회 운동 또는 거의 안 함' },
  { id: 'moderate', label: '보통', emoji: '🚶', desc: '주 3-4회 운동' },
  { id: 'active', label: '활동적', emoji: '🏋️', desc: '주 5-6회 운동' },
  { id: 'very_active', label: '매우 활동적', emoji: '🔥', desc: '매일 고강도 운동' },
]

const EQUIPMENT_OPTIONS = ['바벨', '덤벨', '머신', '케이블', '맨몸']

const DIETARY_OPTIONS = [
  '유제품 제외',
  '채식',
  '비건',
  '글루텐 프리',
  '견과류 제외',
]

const slideVariants = {
  enter: { x: 50, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -50, opacity: 0 },
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<number>(1)
  const [formData, setFormData] = useState<OnboardingData>(INITIAL_DATA)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [direction, setDirection] = useState<number>(1)

  const goNext = () => {
    setDirection(1)
    setStep((prev) => prev + 1)
  }

  const toggleEquipment = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter((e) => e !== item)
        : [...prev.equipment, item],
    }))
  }

  const toggleDietary = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(item)
        ? prev.dietaryRestrictions.filter((d) => d !== item)
        : [...prev.dietaryRestrictions, item],
    }))
  }

  const handleComplete = async (skipDietary = false) => {
    setIsLoading(true)
    setError('')

    const finalData: OnboardingData = skipDietary
      ? { ...formData, dietaryRestrictions: [] }
      : formData

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('로그인이 필요합니다.')
        setIsLoading(false)
        return
      }

      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          goal: finalData.goal,
          gender: finalData.gender,
          age: finalData.age,
          height_cm: finalData.heightCm,
          current_weight_kg: finalData.currentWeight,
          target_weight_kg: finalData.targetWeight,
          activity_level: finalData.activityLevel,
          workout_days_per_week: finalData.workoutDays,
          available_equipment: finalData.equipment,
          dietary_restrictions: finalData.dietaryRestrictions,
        })

      if (insertError) {
        setError('프로필 저장 중 오류가 발생했습니다.')
        setIsLoading(false)
        return
      }

      await fetch('/api/generate-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: finalData }),
      })

      router.push('/')
    } catch {
      setError('오류가 발생했습니다. 다시 시도해주세요.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ backgroundColor: '#0f0f0f' }}>
      {/* 진행 바 */}
      <div className="flex gap-2 mb-10">
        {[1, 2, 3, 4, 5].map((dot) => (
          <div
            key={dot}
            className="w-2.5 h-2.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor: dot <= step ? '#C8FF00' : 'transparent',
              border: dot <= step ? 'none' : '1.5px solid #444',
            }}
          />
        ))}
      </div>

      {/* 카드 컨테이너 */}
      <div className="w-full max-w-md relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {/* Step 1 — 목표 선택 */}
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1a1a' }}>
                <h1 className="text-white text-2xl font-bold mb-2">목표를 선택하세요</h1>
                <p className="text-sm mb-6" style={{ color: '#888' }}>나의 운동 목표를 선택해주세요</p>
                <div className="grid grid-cols-2 gap-3">
                  {GOALS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, goal: g.id }))
                        setTimeout(goNext, 180)
                      }}
                      className="flex flex-col items-center justify-center py-6 rounded-xl transition-all duration-200 active:scale-95"
                      style={{
                        backgroundColor:
                          formData.goal === g.id
                            ? 'rgba(200,255,0,0.12)'
                            : '#242424',
                        border: formData.goal === g.id
                          ? '2px solid #C8FF00'
                          : '2px solid transparent',
                      }}
                    >
                      <span className="text-3xl mb-2">{g.emoji}</span>
                      <span className="text-white font-semibold text-sm">{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2 — 기본 정보 */}
          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1a1a' }}>
                <h1 className="text-white text-2xl font-bold mb-2">기본 정보</h1>
                <p className="text-sm mb-6" style={{ color: '#888' }}>정확한 루틴 생성을 위해 필요해요</p>

                {/* 성별 */}
                <div className="mb-5">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#aaa' }}>성별</label>
                  <div className="flex gap-3">
                    {['남성', '여성'].map((g) => (
                      <button
                        key={g}
                        onClick={() => setFormData((prev) => ({ ...prev, gender: g }))}
                        className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                        style={{
                          backgroundColor: formData.gender === g ? '#C8FF00' : '#242424',
                          color: formData.gender === g ? '#000' : '#fff',
                          border: 'none',
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 나이 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#aaa' }}>나이</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={formData.age || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, age: Number(e.target.value) }))
                      }
                      placeholder="25"
                      className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none focus:ring-2 appearance-none"
                      style={{
                        backgroundColor: '#242424',
                        border: '1.5px solid #333',
                        // @ts-expect-error - custom focus ring color via style
                        '--tw-ring-color': '#C8FF00',
                      }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#666' }}>세</span>
                  </div>
                </div>

                {/* 키 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#aaa' }}>키</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={100}
                      max={250}
                      value={formData.heightCm || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, heightCm: Number(e.target.value) }))
                      }
                      placeholder="170"
                      className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none"
                      style={{ backgroundColor: '#242424', border: '1.5px solid #333' }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#666' }}>cm</span>
                  </div>
                </div>

                {/* 현재 체중 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#aaa' }}>현재 체중</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={30}
                      max={300}
                      value={formData.currentWeight || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, currentWeight: Number(e.target.value) }))
                      }
                      placeholder="70"
                      className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none"
                      style={{ backgroundColor: '#242424', border: '1.5px solid #333' }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#666' }}>kg</span>
                  </div>
                </div>

                {/* 목표 체중 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2" style={{ color: '#aaa' }}>목표 체중</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={30}
                      max={300}
                      value={formData.targetWeight || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, targetWeight: Number(e.target.value) }))
                      }
                      placeholder="65"
                      className="w-full rounded-lg px-4 py-3 text-white text-sm outline-none"
                      style={{ backgroundColor: '#242424', border: '1.5px solid #333' }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#666' }}>kg</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!formData.gender || !formData.age || !formData.heightCm || !formData.currentWeight || !formData.targetWeight) {
                      setError('모든 항목을 입력해주세요.')
                      return
                    }
                    setError('')
                    goNext()
                  }}
                  className="w-full py-3.5 rounded-xl font-bold text-black text-sm transition-opacity hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: '#C8FF00' }}
                >
                  다음
                </button>
                {error && (
                  <p className="mt-3 text-sm text-center" style={{ color: '#ff6b6b' }}>{error}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 3 — 활동량 */}
          {step === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1a1a' }}>
                <h1 className="text-white text-2xl font-bold mb-2">활동량</h1>
                <p className="text-sm mb-6" style={{ color: '#888' }}>평소 운동 빈도를 선택해주세요</p>
                <div className="flex flex-col gap-3">
                  {ACTIVITY_LEVELS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, activityLevel: a.id }))
                        setTimeout(goNext, 180)
                      }}
                      className="flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all duration-200 active:scale-[0.98]"
                      style={{
                        backgroundColor:
                          formData.activityLevel === a.id
                            ? 'rgba(200,255,0,0.12)'
                            : '#242424',
                        border: formData.activityLevel === a.id
                          ? '2px solid #C8FF00'
                          : '2px solid transparent',
                      }}
                    >
                      <span className="text-2xl">{a.emoji}</span>
                      <div>
                        <p className="text-white font-semibold text-sm">{a.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#888' }}>{a.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4 — 운동 환경 */}
          {step === 4 && (
            <motion.div
              key="step4"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1a1a' }}>
                <h1 className="text-white text-2xl font-bold mb-2">운동 환경</h1>
                <p className="text-sm mb-6" style={{ color: '#888' }}>주 운동 횟수와 사용 가능한 기구를 알려주세요</p>

                {/* 주 운동 횟수 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-3" style={{ color: '#aaa' }}>
                    주 운동 횟수 &nbsp;
                    <span style={{ color: '#C8FF00' }}>{formData.workoutDays}일</span>
                  </label>
                  <div className="flex gap-2 justify-between">
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <button
                        key={d}
                        onClick={() => setFormData((prev) => ({ ...prev, workoutDays: d }))}
                        className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-150 active:scale-90"
                        style={{
                          backgroundColor: formData.workoutDays === d ? '#C8FF00' : '#242424',
                          color: formData.workoutDays === d ? '#000' : '#fff',
                          border: 'none',
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 사용 가능 기구 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-3" style={{ color: '#aaa' }}>사용 가능 기구</label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_OPTIONS.map((eq) => (
                      <button
                        key={eq}
                        onClick={() => toggleEquipment(eq)}
                        className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 active:scale-95"
                        style={{
                          backgroundColor: formData.equipment.includes(eq) ? '#C8FF00' : '#242424',
                          color: formData.equipment.includes(eq) ? '#000' : '#fff',
                          border: formData.equipment.includes(eq)
                            ? '1.5px solid #C8FF00'
                            : '1.5px solid #444',
                        }}
                      >
                        {eq}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (formData.equipment.length === 0) {
                      setError('사용 가능한 기구를 하나 이상 선택해주세요.')
                      return
                    }
                    setError('')
                    goNext()
                  }}
                  className="w-full py-3.5 rounded-xl font-bold text-black text-sm transition-opacity hover:opacity-90 active:scale-95"
                  style={{ backgroundColor: '#C8FF00' }}
                >
                  다음
                </button>
                {error && (
                  <p className="mt-3 text-sm text-center" style={{ color: '#ff6b6b' }}>{error}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 5 — 식이 제한 */}
          {step === 5 && (
            <motion.div
              key="step5"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <div className="rounded-2xl p-6" style={{ backgroundColor: '#1a1a1a' }}>
                <h1 className="text-white text-2xl font-bold mb-2">식이 제한</h1>
                <p className="text-sm mb-6" style={{ color: '#888' }}>해당하는 항목을 선택해주세요 (선택 사항)</p>

                <div className="flex flex-wrap gap-2 mb-8">
                  {DIETARY_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => toggleDietary(d)}
                      className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 active:scale-95"
                      style={{
                        backgroundColor: formData.dietaryRestrictions.includes(d) ? '#C8FF00' : '#242424',
                        color: formData.dietaryRestrictions.includes(d) ? '#000' : '#fff',
                        border: formData.dietaryRestrictions.includes(d)
                          ? '1.5px solid #C8FF00'
                          : '1.5px solid #444',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>

                {error && (
                  <p className="mb-4 text-sm text-center" style={{ color: '#ff6b6b' }}>{error}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => !isLoading && handleComplete(true)}
                    disabled={isLoading}
                    className="flex-1 py-3.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-70 disabled:opacity-40"
                    style={{
                      backgroundColor: 'transparent',
                      color: '#aaa',
                      border: '1.5px solid #444',
                    }}
                  >
                    건너뛰기
                  </button>
                  <button
                    onClick={() => !isLoading && handleComplete(false)}
                    disabled={isLoading}
                    className="flex-1 py-3.5 rounded-xl font-bold text-black text-sm transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#C8FF00' }}
                  >
                    {isLoading ? (
                      <span
                        className="w-5 h-5 rounded-full border-2 border-black/30 border-t-black animate-spin inline-block"
                      />
                    ) : (
                      '완료'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
