'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X, ChevronLeft, Check, Plus, ChevronRight, Camera, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FoodItem {
  id: string
  name: string
  brand: string | null
  category: string | null
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  serving_size_g: number | null
  serving_unit: string | null
}

interface HistoryItem {
  food_name: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
}

type SearchResult =
  | { type: 'db'; data: FoodItem }
  | { type: 'history'; data: HistoryItem }

function scale(per100: number, amount: number): number {
  return Math.round(((per100 * amount) / 100) * 10) / 10
}

/* ──── 메인 컨텐츠 ──── */
function DietAddContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const mealType = searchParams.get('meal') ?? '아침'
  const editId = searchParams.get('editId') // 수정 모드

  /* ── 상태 ── */
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<{ name: string; per100: { cal: number; protein: number; carbs: number; fat: number }; servingG: number } | null>(null)
  const [amountG, setAmountG] = useState(100)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualPer100, setManualPer100] = useState({ cal: 0, protein: 0, carbs: 0, fat: 0 })
  const [isSearching, setIsSearching] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  /* ── 수정 모드 초기값 로드 ── */
  useEffect(() => {
    if (!editId) return
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('meal_items')
        .select('food_name, amount_g, calories, protein_g, carbs_g, fat_g')
        .eq('id', editId)
        .single()
      if (!data) return
      const baseG = data.amount_g || 100
      const per100 = {
        cal: Math.round((data.calories / baseG) * 100 * 10) / 10,
        protein: Math.round((data.protein_g / baseG) * 100 * 10) / 10,
        carbs: Math.round((data.carbs_g / baseG) * 100 * 10) / 10,
        fat: Math.round((data.fat_g / baseG) * 100 * 10) / 10,
      }
      setSelected({ name: data.food_name, per100, servingG: baseG })
      setAmountG(data.amount_g)
    }
    load()
  }, [editId])

  /* ── DB + 히스토리 동시 검색 ── */
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setIsSearching(true)
    const supabase = createClient()

    const [foodRes, histResult] = await Promise.all([
      fetch(`/api/search-foods?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => ({ results: [] })),
      supabase
        .from('meal_items')
        .select('food_name,calories,protein_g,carbs_g,fat_g,amount_g')
        .ilike('food_name', `%${q}%`)
        .not('calories', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const combined: SearchResult[] = []

    // DB + API 결과 (서버에서 병합됨)
    for (const f of (foodRes.results ?? []) as FoodItem[]) {
      combined.push({ type: 'db', data: f })
    }

    // 히스토리 (중복 제거)
    const dbNames = new Set(combined.map(r => r.type === 'db' ? (r.data as FoodItem).name : ''))
    const seenHistory = new Set<string>()
    for (const h of histResult.data ?? []) {
      if (dbNames.has(h.food_name) || seenHistory.has(h.food_name)) continue
      seenHistory.add(h.food_name)
      const base = h.amount_g || 100
      combined.push({
        type: 'history',
        data: {
          food_name: h.food_name,
          calories_per_100g: (h.calories / base) * 100,
          protein_per_100g: (h.protein_g / base) * 100,
          carbs_per_100g: (h.carbs_g / base) * 100,
          fat_per_100g: (h.fat_g / base) * 100,
        },
      })
    }

    setResults(combined)
    setIsSearching(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 250)
    return () => clearTimeout(t)
  }, [query, doSearch])

  /* ── 음식 선택 ── */
  const selectFood = (result: SearchResult) => {
    if (result.type === 'db') {
      const f = result.data
      setSelected({
        name: f.brand ? `${f.brand} ${f.name}` : f.name,
        per100: { cal: f.calories_per_100g, protein: f.protein_per_100g, carbs: f.carbs_per_100g, fat: f.fat_per_100g },
        servingG: f.serving_size_g ?? 100,
      })
      setAmountG(f.serving_size_g ?? 100)
    } else {
      const h = result.data
      setSelected({
        name: h.food_name,
        per100: { cal: h.calories_per_100g, protein: h.protein_per_100g, carbs: h.carbs_per_100g, fat: h.fat_per_100g },
        servingG: 100,
      })
      setAmountG(100)
    }
    setQuery('')
    setResults([])
  }

  /* ── 계산값 ── */
  const activePer100 = selected?.per100 ?? { cal: manualPer100.cal, protein: manualPer100.protein, carbs: manualPer100.carbs, fat: manualPer100.fat }
  const computed = {
    cal: scale(activePer100.cal, amountG),
    protein: scale(activePer100.protein, amountG),
    carbs: scale(activePer100.carbs, amountG),
    fat: scale(activePer100.fat, amountG),
  }
  const foodName = selected?.name ?? query

  /* ── 저장 ── */
  const handleSave = async () => {
    if (!foodName.trim() || saving) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 수정 모드
      if (editId) {
        await supabase.from('meal_items').update({
          food_name: foodName.trim(),
          amount_g: amountG,
          calories: computed.cal,
          protein_g: computed.protein,
          carbs_g: computed.carbs,
          fat_g: computed.fat,
        }).eq('id', editId)
        setSaved(true)
        setTimeout(() => router.push(`/diet?date=${date}`), 600)
        return
      }

      // 신규 저장
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

      await supabase.from('meal_items').insert({
        meal_id: mealId,
        food_name: foodName.trim(),
        amount_g: amountG,
        calories: computed.cal,
        protein_g: computed.protein,
        carbs_g: computed.carbs,
        fat_g: computed.fat,
      })

      setSaved(true)
      setTimeout(() => router.push(`/diet?date=${date}`), 600)
    } catch (err) {
      console.error(err)
      setSaving(false)
    }
  }

  /* ── 사진 AI 분석 ── */
  const handlePhotoAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsAnalyzing(true)
    setAnalyzeError('')
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await fetch('/api/analyze-food-photo', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? '분석 실패')
      setSelected({
        name: data.food_name ?? '분석된 음식',
        per100: {
          cal: data.calories_per_100g ?? 0,
          protein: data.protein_per_100g ?? 0,
          carbs: data.carbs_per_100g ?? 0,
          fat: data.fat_per_100g ?? 0,
        },
        servingG: data.amount_g ?? 100,
      })
      setAmountG(data.amount_g ?? 100)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : '분석에 실패했습니다')
    } finally {
      setIsAnalyzing(false)
      // input 초기화 (같은 파일 재선택 가능하게)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  const canSave = foodName.trim().length > 0 && amountG > 0

  /* ── 서빙 빠른 선택 ── */
  const servingOptions = selected?.servingG
    ? [selected.servingG / 2, selected.servingG, selected.servingG * 2].map(Math.round)
    : [50, 100, 150, 200]

  return (
    <main className="min-h-screen bg-bg-primary flex flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-bg-primary border-b border-we-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-text-secondary">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold text-text-primary flex-1">
          {editId ? '음식 수정' : '음식 추가'}
        </h1>
        <span className="text-xs bg-bg-tertiary text-accent px-2 py-1 rounded-full">
          {mealType}
        </span>
        {/* 숨긴 사진 input */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoAnalyze}
        />
        {/* 카메라 버튼 */}
        {!editId && (
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={isAnalyzing}
            className="ml-1 p-2 rounded-[10px] bg-bg-secondary border border-we-border text-text-secondary active:bg-bg-tertiary transition-colors disabled:opacity-50"
            title="사진으로 분석"
          >
            {isAnalyzing
              ? <Loader2 size={18} className="animate-spin text-accent" />
              : <Camera size={18} />
            }
          </button>
        )}
      </header>

      <div className="flex-1 flex flex-col">

        {/* ── 검색창 ── */}
        {!selected && (
          <div className="px-4 pt-4">
            <div className="flex items-center gap-2 bg-bg-secondary rounded-[14px] px-4 border border-we-border focus-within:border-accent transition-colors">
              <Search size={18} className="text-text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="음식 이름 또는 브랜드 검색..."
                className="flex-1 bg-transparent py-4 text-sm text-text-primary outline-none placeholder:text-text-muted"
                autoFocus
              />
              {query ? (
                <button onClick={() => { setQuery(''); setResults([]) }}>
                  <X size={16} className="text-text-muted" />
                </button>
              ) : (
                <span className="text-[10px] text-text-muted">검색</span>
              )}
            </div>

            {/* 검색 결과 없음 */}
            {query.length > 0 && results.length === 0 && !isSearching && (
              <p className="mt-3 px-1 text-xs text-text-muted">
                &quot;{query}&quot;에 대한 검색 결과가 없습니다
              </p>
            )}

            {/* 직접 입력 버튼 */}
            {query.length > 0 && results.length === 0 && !isSearching && (
              <button
                onClick={() => {
                  setSelected({ name: query, per100: { cal: 0, protein: 0, carbs: 0, fat: 0 }, servingG: 100 })
                  setManualOpen(true)
                }}
                className="mt-3 w-full flex items-center gap-3 bg-bg-secondary border border-dashed border-we-border rounded-[12px] px-4 py-3.5"
              >
                <Plus size={16} className="text-accent shrink-0" />
                <div className="text-left">
                  <p className="text-sm text-text-primary">&quot;{query}&quot; 직접 입력</p>
                  <p className="text-[10px] text-text-muted mt-0.5">DB에 없는 음식 — 영양소 직접 입력</p>
                </div>
              </button>
            )}
          </div>
        )}

        {/* ── 검색 결과 ── */}
        {!selected && (
          <div className="flex-1 overflow-y-auto mt-2 pb-4">
            {isSearching && (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!isSearching && results.length > 0 && (
              <div>
                {/* DB 결과 */}
                {results.filter(r => r.type === 'db').length > 0 && (
                  <>
                    <p className="px-4 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                      식품 DB
                    </p>
                    {results.filter(r => r.type === 'db').map((r, i) => {
                      const f = r.data as FoodItem
                      return (
                        <button
                          key={i}
                          onClick={() => selectFood(r)}
                          className="w-full flex items-center justify-between px-4 py-3.5 border-b border-we-border hover:bg-bg-secondary active:bg-bg-secondary transition-colors text-left"
                        >
                          <div className="flex-1 min-w-0 mr-3">
                            <p className="text-sm text-text-primary truncate">
                              {f.brand && <span className="text-accent mr-1">{f.brand}</span>}
                              {f.name}
                            </p>
                            <p className="text-[11px] text-text-muted mt-0.5">
                              {f.category} · {f.serving_size_g ?? 100}{f.serving_unit ?? 'g'} 기준
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-text-primary tabular-nums">
                              {Math.round(f.calories_per_100g * (f.serving_size_g ?? 100) / 100)}
                              <span className="text-xs font-normal text-text-muted">kcal</span>
                            </p>
                            <p className="text-[10px] text-text-muted tabular-nums">
                              P{Math.round(f.protein_per_100g * (f.serving_size_g ?? 100) / 100)}
                              {' '}C{Math.round(f.carbs_per_100g * (f.serving_size_g ?? 100) / 100)}
                              {' '}F{Math.round(f.fat_per_100g * (f.serving_size_g ?? 100) / 100)}
                            </p>
                          </div>
                          <ChevronRight size={14} className="text-text-muted ml-2 shrink-0" />
                        </button>
                      )
                    })}
                  </>
                )}

                {/* 최근 기록 */}
                {results.filter(r => r.type === 'history').length > 0 && (
                  <>
                    <p className="px-4 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-2">
                      최근 기록
                    </p>
                    {results.filter(r => r.type === 'history').map((r, i) => {
                      const h = r.data as HistoryItem
                      return (
                        <button
                          key={i}
                          onClick={() => selectFood(r)}
                          className="w-full flex items-center justify-between px-4 py-3.5 border-b border-we-border hover:bg-bg-secondary active:bg-bg-secondary transition-colors text-left"
                        >
                          <div className="flex-1 min-w-0 mr-3">
                            <p className="text-sm text-text-primary truncate">{h.food_name}</p>
                            <p className="text-[11px] text-text-muted mt-0.5">최근 기록</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-text-primary tabular-nums">
                              {Math.round(h.calories_per_100g)}
                              <span className="text-xs font-normal text-text-muted">kcal/100g</span>
                            </p>
                          </div>
                          <ChevronRight size={14} className="text-text-muted ml-2 shrink-0" />
                        </button>
                      )
                    })}
                  </>
                )}
              </div>
            )}

            {/* AI 분석 로딩 */}
            {isAnalyzing && (
              <div className="flex flex-col items-center py-12 gap-3">
                <Loader2 size={32} className="animate-spin text-accent" />
                <p className="text-sm text-text-secondary">AI가 음식을 분석하고 있어요...</p>
                <p className="text-xs text-text-muted">잠시만 기다려주세요</p>
              </div>
            )}

            {/* 분석 에러 */}
            {analyzeError && !isAnalyzing && (
              <div className="mx-4 mt-3 bg-we-danger/10 border border-we-danger/30 rounded-[12px] px-4 py-3">
                <p className="text-sm text-we-danger">⚠️ {analyzeError}</p>
              </div>
            )}

            {/* 빈 상태 */}
            {!isSearching && !isAnalyzing && query.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-3xl mb-3">🔍</p>
                <p className="text-sm text-text-muted">음식 이름 또는 브랜드를 검색하세요</p>
                <p className="text-xs text-text-muted mt-1">예: 하림, 닭가슴살, 현미밥, 아메리카노...</p>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="mt-5 flex items-center gap-2 mx-auto bg-bg-secondary border border-we-border rounded-[12px] px-5 py-3 text-sm text-text-secondary active:bg-bg-tertiary"
                >
                  <Camera size={16} className="text-accent" />
                  사진으로 AI 분석하기
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 선택 후: 상세 입력 ── */}
        {selected && (
          <div className="flex-1 px-4 pt-4 pb-32 space-y-4 overflow-y-auto">
            {/* 선택된 음식 헤더 */}
            <div className="bg-bg-secondary rounded-[16px] p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-text-primary truncate">{selected.name}</p>
                <p className="text-xs text-text-muted mt-0.5">100g당 {Math.round(selected.per100.cal)}kcal</p>
              </div>
              <button
                onClick={() => { setSelected(null); setQuery(''); setTimeout(() => inputRef.current?.focus(), 100) }}
                className="text-text-muted hover:text-text-primary p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* 섭취량 */}
            <div className="bg-bg-secondary rounded-[16px] p-4 space-y-3">
              <p className="text-xs text-text-secondary font-medium">섭취량</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-bg-tertiary border border-we-border rounded-[12px] flex items-center px-4 focus-within:border-accent">
                  <input
                    type="number"
                    min={1}
                    value={amountG || ''}
                    onChange={e => setAmountG(Number(e.target.value) || 0)}
                    inputMode="decimal"
                    className="flex-1 bg-transparent py-3 text-lg font-bold text-text-primary outline-none tabular-nums text-right"
                  />
                  <span className="text-sm text-text-muted ml-1.5">g</span>
                </div>
              </div>
              {/* 빠른 선택 */}
              <div className="flex gap-2">
                {servingOptions.map(g => (
                  <button
                    key={g}
                    onClick={() => setAmountG(g)}
                    className={`flex-1 py-2.5 rounded-[10px] text-xs font-semibold transition-colors ${
                      amountG === g ? 'bg-accent text-bg-primary' : 'bg-bg-tertiary text-text-secondary'
                    }`}
                  >
                    {g}g
                  </button>
                ))}
              </div>
            </div>

            {/* 영양소 미리보기 */}
            <div className="bg-bg-secondary rounded-[16px] p-4">
              <p className="text-xs text-text-secondary mb-3">{amountG}g 섭취 시 영양소</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '칼로리', value: computed.cal, unit: 'kcal', color: 'var(--accent)' },
                  { label: '단백질', value: computed.protein, unit: 'g', color: '#4FC3F7' },
                  { label: '탄수화물', value: computed.carbs, unit: 'g', color: '#81C784' },
                  { label: '지방', value: computed.fat, unit: 'g', color: '#FFB74D' },
                ].map(({ label, value, unit, color }) => (
                  <div key={label} className="bg-bg-tertiary rounded-[10px] p-3 text-center">
                    <p className="text-[10px] text-text-secondary">{label}</p>
                    <p className="text-sm font-bold mt-1 tabular-nums" style={{ color }}>{value}</p>
                    <p className="text-[9px] text-text-muted">{unit}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 직접 입력 토글 */}
            {(manualOpen || selected.per100.cal === 0) && (
              <div className="bg-bg-secondary rounded-[16px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-secondary font-medium">100g 기준 영양소 수정</p>
                  <button onClick={() => setManualOpen(false)} className="text-xs text-text-muted">접기</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: 'cal', label: '칼로리', unit: 'kcal', color: 'var(--accent)' },
                    { key: 'protein', label: '단백질', unit: 'g', color: '#4FC3F7' },
                    { key: 'carbs', label: '탄수화물', unit: 'g', color: '#81C784' },
                    { key: 'fat', label: '지방', unit: 'g', color: '#FFB74D' },
                  ] as const).map(({ key, label, unit, color }) => (
                    <div key={key} className="bg-bg-tertiary rounded-[10px] p-3">
                      <label className="text-[10px] font-medium" style={{ color }}>{label}</label>
                      <div className="flex items-center mt-1.5 gap-1">
                        <input
                          type="number"
                          min={0}
                          value={selected.per100[key] || ''}
                          onChange={e => setSelected(prev => prev ? {
                            ...prev,
                            per100: { ...prev.per100, [key]: Number(e.target.value) || 0 }
                          } : null)}
                          inputMode="decimal"
                          placeholder="0"
                          className="flex-1 bg-transparent text-sm text-text-primary outline-none tabular-nums"
                        />
                        <span className="text-[10px] text-text-muted">{unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!manualOpen && selected.per100.cal > 0 && (
              <button
                onClick={() => setManualOpen(true)}
                className="text-xs text-text-muted hover:text-text-secondary underline"
              >
                영양소 직접 수정
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 저장 버튼 (음식 선택 후에만) ── */}
      {selected && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-gradient-to-t from-bg-primary via-bg-primary/95 to-transparent z-40">
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className={`w-full py-4 rounded-[16px] font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
              saved ? 'bg-we-success text-bg-primary'
              : canSave ? 'bg-accent text-bg-primary'
              : 'bg-bg-tertiary text-text-muted'
            } disabled:opacity-60`}
          >
            {saved ? (
              <><Check size={18} strokeWidth={3} />{editId ? '수정 완료!' : '저장 완료!'}</>
            ) : saving ? '저장 중...'
            : editId ? '수정하기'
            : `${mealType}에 추가`}
          </button>
        </div>
      )}
    </main>
  )
}

export default function DietAddPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DietAddContent />
    </Suspense>
  )
}
