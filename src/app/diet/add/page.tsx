'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X, ChevronLeft, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FoodSuggestion {
  food_name: string
  calories_per_100g: number | null
  protein_per_100g: number | null
  carbs_per_100g: number | null
  fat_per_100g: number | null
}

interface NutritionPer100 {
  calories: number
  protein: number
  carbs: number
  fat: number
}

const DEFAULT_NUTRITION: NutritionPer100 = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
}

function scale(per100: number, amount: number): number {
  return (per100 * amount) / 100
}

function DietAddContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const mealType = searchParams.get('meal') ?? '아침'

  const [foodName, setFoodName] = useState('')
  const [amountG, setAmountG] = useState<number>(100)
  const [per100, setPer100] = useState<NutritionPer100>(DEFAULT_NUTRITION)
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [manualMode, setManualMode] = useState(false)

  // 이전에 입력한 음식 검색 (meal_items 히스토리 기반)
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) { setSuggestions([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('meal_items')
      .select('food_name, calories, protein_g, carbs_g, fat_g, amount_g')
      .ilike('food_name', `%${query}%`)
      .not('calories', 'is', null)
      .limit(6)

    if (data && data.length > 0) {
      // 같은 이름의 음식은 최신 것 1개만 (100g 기준으로 역산)
      const seen = new Set<string>()
      const unique: FoodSuggestion[] = []
      for (const item of data) {
        if (seen.has(item.food_name)) continue
        seen.add(item.food_name)
        const baseG = item.amount_g || 100
        unique.push({
          food_name: item.food_name,
          calories_per_100g: item.calories != null ? (item.calories / baseG) * 100 : null,
          protein_per_100g: item.protein_g != null ? (item.protein_g / baseG) * 100 : null,
          carbs_per_100g: item.carbs_g != null ? (item.carbs_g / baseG) * 100 : null,
          fat_per_100g: item.fat_g != null ? (item.fat_g / baseG) * 100 : null,
        })
      }
      setSuggestions(unique)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(foodName), 300)
    return () => clearTimeout(timer)
  }, [foodName, fetchSuggestions])

  const selectSuggestion = (s: FoodSuggestion) => {
    setFoodName(s.food_name)
    setPer100({
      calories: s.calories_per_100g ?? 0,
      protein: s.protein_per_100g ?? 0,
      carbs: s.carbs_per_100g ?? 0,
      fat: s.fat_per_100g ?? 0,
    })
    setShowSuggestions(false)
    setManualMode(false)
  }

  // 현재 섭취량 기준 영양소
  const computed = {
    calories: scale(per100.calories, amountG),
    protein: scale(per100.protein, amountG),
    carbs: scale(per100.carbs, amountG),
    fat: scale(per100.fat, amountG),
  }

  const handleSave = async () => {
    if (!foodName.trim() || saving) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // meal 레코드 가져오거나 생성
      const eatenAt = `${date}T12:00:00`
      let mealId: string

      const { data: existingMeal } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', user.id)
        .eq('meal_type', mealType)
        .gte('eaten_at', `${date}T00:00:00`)
        .lte('eaten_at', `${date}T23:59:59`)
        .maybeSingle()

      if (existingMeal) {
        mealId = existingMeal.id
      } else {
        const { data: newMeal, error: mealError } = await supabase
          .from('meals')
          .insert({ user_id: user.id, meal_type: mealType, eaten_at: eatenAt })
          .select('id')
          .single()
        if (mealError || !newMeal) throw mealError
        mealId = newMeal.id
      }

      // meal_item 삽입
      const { error: itemError } = await supabase
        .from('meal_items')
        .insert({
          meal_id: mealId,
          food_name: foodName.trim(),
          amount_g: amountG,
          calories: Math.round(computed.calories),
          protein_g: Math.round(computed.protein * 10) / 10,
          carbs_g: Math.round(computed.carbs * 10) / 10,
          fat_g: Math.round(computed.fat * 10) / 10,
        })

      if (itemError) throw itemError

      setSaved(true)
      setTimeout(() => router.push(`/diet?date=${date}`), 700)
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  const canSave = foodName.trim().length > 0 && amountG > 0

  return (
    <main className="min-h-screen bg-[#0f0f0f]">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f] border-b border-[#2a2a2a] px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[#888888]">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold text-[#f0f0f0] flex-1">음식 추가</h1>
        <span className="text-xs text-[#888888]">
          {mealType} · {date}
        </span>
      </header>

      <div className="px-4 pt-4 pb-32 space-y-4">
        {/* 음식 이름 검색 */}
        <div className="bg-[#1a1a1a] rounded-[16px] p-4 space-y-3">
          <label className="text-xs text-[#888888] font-medium">음식 이름</label>
          <div className="relative">
            <div className="flex items-center gap-2 bg-[#242424] rounded-[12px] px-3 border border-[#2a2a2a] focus-within:border-[#C8FF00]">
              <Search size={16} className="text-[#555555] shrink-0" />
              <input
                type="text"
                value={foodName}
                onChange={e => {
                  setFoodName(e.target.value)
                  setManualMode(true)
                }}
                placeholder="예: 닭가슴살, 현미밥, 바나나..."
                className="flex-1 bg-transparent py-3 text-sm text-[#f0f0f0] outline-none placeholder:text-[#555555]"
                autoFocus
              />
              {foodName && (
                <button onClick={() => { setFoodName(''); setSuggestions([]); setShowSuggestions(false) }}>
                  <X size={14} className="text-[#555555]" />
                </button>
              )}
            </div>

            {/* 검색 제안 */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e1e] border border-[#2a2a2a] rounded-[12px] overflow-hidden z-10">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectSuggestion(s)}
                    className="w-full flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] last:border-0 hover:bg-[#242424] transition-colors"
                  >
                    <span className="text-sm text-[#f0f0f0]">{s.food_name}</span>
                    <span className="text-xs text-[#555555]">
                      {s.calories_per_100g ? `${Math.round(s.calories_per_100g)}kcal/100g` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 섭취량 */}
        <div className="bg-[#1a1a1a] rounded-[16px] p-4 space-y-3">
          <label className="text-xs text-[#888888] font-medium">섭취량</label>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-[#242424] border border-[#2a2a2a] rounded-[12px] flex items-center px-3 focus-within:border-[#C8FF00]">
              <input
                type="number"
                min={1}
                max={9999}
                value={amountG || ''}
                onChange={e => setAmountG(Number(e.target.value) || 0)}
                inputMode="decimal"
                className="flex-1 bg-transparent py-3 text-sm text-[#f0f0f0] outline-none tabular-nums text-right"
              />
              <span className="text-sm text-[#555555] ml-1">g</span>
            </div>
            {/* 빠른 선택 버튼 */}
            {[50, 100, 150, 200].map(g => (
              <button
                key={g}
                onClick={() => setAmountG(g)}
                className={`px-3 py-2.5 rounded-[10px] text-xs font-medium transition-colors ${
                  amountG === g
                    ? 'bg-[#C8FF00] text-[#0f0f0f]'
                    : 'bg-[#242424] text-[#888888]'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* 100g 기준 영양소 (직접 입력 모드) */}
        <div className="bg-[#1a1a1a] rounded-[16px] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#888888] font-medium">100g 기준 영양소</span>
            <button
              onClick={() => setManualMode(!manualMode)}
              className="text-xs text-[#C8FF00]"
            >
              {manualMode ? '접기' : '직접 입력'}
            </button>
          </div>

          {manualMode && (
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: 'calories', label: '칼로리', unit: 'kcal', color: '#C8FF00' },
                { key: 'protein', label: '단백질', unit: 'g', color: '#4FC3F7' },
                { key: 'carbs', label: '탄수화물', unit: 'g', color: '#81C784' },
                { key: 'fat', label: '지방', unit: 'g', color: '#FFB74D' },
              ] as const).map(({ key, label, unit, color }) => (
                <div key={key} className="bg-[#242424] rounded-[10px] p-3">
                  <label className="text-[10px]" style={{ color }}>{label}</label>
                  <div className="flex items-center mt-1">
                    <input
                      type="number"
                      min={0}
                      value={per100[key] || ''}
                      onChange={e => setPer100(prev => ({ ...prev, [key]: Number(e.target.value) || 0 }))}
                      inputMode="decimal"
                      placeholder="0"
                      className="flex-1 bg-transparent text-sm text-[#f0f0f0] outline-none tabular-nums w-full"
                    />
                    <span className="text-[10px] text-[#555555]">{unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 계산된 영양소 미리보기 */}
        {(per100.calories > 0 || per100.protein > 0) && (
          <div className="bg-[#1a1a1a] rounded-[16px] p-4">
            <p className="text-xs text-[#888888] font-medium mb-3">
              {amountG}g 섭취 시
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '칼로리', value: computed.calories, unit: 'kcal', color: '#C8FF00' },
                { label: '단백질', value: computed.protein, unit: 'g', color: '#4FC3F7' },
                { label: '탄수화물', value: computed.carbs, unit: 'g', color: '#81C784' },
                { label: '지방', value: computed.fat, unit: 'g', color: '#FFB74D' },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="bg-[#242424] rounded-[10px] p-2.5 text-center">
                  <p className="text-[10px] text-[#888888]">{label}</p>
                  <p className="text-sm font-bold mt-0.5 tabular-nums" style={{ color }}>
                    {Math.round(value * 10) / 10}
                  </p>
                  <p className="text-[9px] text-[#555555]">{unit}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 저장 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-gradient-to-t from-[#0f0f0f] to-transparent">
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className={`w-full py-4 rounded-[16px] font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
            saved
              ? 'bg-[#00D67C] text-[#0f0f0f]'
              : canSave
              ? 'bg-[#C8FF00] text-[#0f0f0f]'
              : 'bg-[#242424] text-[#555555]'
          } disabled:opacity-60`}
        >
          {saved ? (
            <>
              <Check size={18} strokeWidth={3} />
              저장 완료!
            </>
          ) : saving ? (
            '저장 중...'
          ) : (
            `${mealType}에 추가`
          )}
        </button>
      </div>
    </main>
  )
}

export default function DietAddPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#C8FF00] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DietAddContent />
    </Suspense>
  )
}
