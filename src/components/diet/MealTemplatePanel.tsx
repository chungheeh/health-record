'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookmarkPlus, BookOpen, X, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface MealItem {
  food_name: string
  amount_g: number | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

interface TemplateItem {
  id: string
  food_name: string
  amount_g: number
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

interface Template {
  id: string
  name: string
  meal_type: string | null
  created_at: string
  meal_template_items: TemplateItem[]
}

interface MealTemplatePanelProps {
  mealType: string
  date: string
  currentItems: MealItem[]
}

export default function MealTemplatePanel({ mealType, date, currentItems }: MealTemplatePanelProps) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [savingName, setSavingName] = useState('')
  const [saveMode, setSaveMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('meal_templates')
      .select('*, meal_template_items(*)')
      .order('created_at', { ascending: false })
    setTemplates((data as Template[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) fetchTemplates()
  }, [open, fetchTemplates])

  const handleSaveTemplate = async () => {
    if (!savingName.trim() || saving) return
    if (currentItems.length === 0) {
      setSuccessMsg('저장할 음식이 없습니다')
      setTimeout(() => setSuccessMsg(''), 2000)
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data: tmpl, error } = await supabase
      .from('meal_templates')
      .insert({ user_id: user.id, name: savingName.trim(), meal_type: mealType })
      .select('id')
      .single()

    if (error || !tmpl) { setSaving(false); return }

    await supabase.from('meal_template_items').insert(
      currentItems.map((item, i) => ({
        template_id: tmpl.id,
        food_name: item.food_name,
        amount_g: item.amount_g ?? 100,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        sort_order: i,
      }))
    )

    setSaving(false)
    setSavingName('')
    setSaveMode(false)
    setSuccessMsg(`"${savingName.trim()}" 저장 완료!`)
    setTimeout(() => setSuccessMsg(''), 2500)
    fetchTemplates()
  }

  const handleLoadTemplate = async (template: Template) => {
    setLoadingId(template.id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoadingId(null); return }

    const eatenAt = `${date}T12:00:00`
    // 해당 날짜/식사 유형의 meal 찾기 또는 생성
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
      const { data: newMeal, error } = await supabase
        .from('meals')
        .insert({ user_id: user.id, meal_type: mealType, eaten_at: eatenAt })
        .select('id')
        .single()
      if (error || !newMeal) { setLoadingId(null); return }
      mealId = newMeal.id
    }

    await supabase.from('meal_items').insert(
      template.meal_template_items.map(item => ({
        meal_id: mealId,
        food_name: item.food_name,
        amount_g: item.amount_g,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
      }))
    )

    setLoadingId(null)
    setOpen(false)
    // 페이지 리로드로 새 항목 반영
    window.location.reload()
  }

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`"${name}" 템플릿을 삭제할까요?`)) return
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('meal_templates').delete().eq('id', id)
    setDeletingId(null)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  return (
    <>
      {/* 템플릿 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-[#888888] hover:text-[#C8FF00] transition-colors px-2 py-1 rounded-[8px] hover:bg-[#C8FF00]/10"
        title="템플릿 저장/불러오기"
      >
        <BookOpen size={14} />
        <span>템플릿</span>
      </button>

      {/* 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 바텀 시트 */}
      {open && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-[#1a1a1a] rounded-t-[24px] max-h-[80vh] flex flex-col max-w-[430px] mx-auto">
          {/* 핸들 */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-[#3a3a3a] rounded-full" />
          </div>

          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
            <div>
              <h3 className="font-semibold text-[#f0f0f0]">{mealType} 템플릿</h3>
              <p className="text-xs text-[#555555] mt-0.5">자주 먹는 식사 조합을 저장하세요</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-[#555555] hover:text-[#f0f0f0] p-1">
              <X size={18} />
            </button>
          </div>

          {/* 성공 메시지 */}
          {successMsg && (
            <div className="mx-5 mt-3 bg-[#C8FF00]/10 border border-[#C8FF00]/30 rounded-[10px] px-3 py-2 flex items-center gap-2">
              <Check size={14} className="text-[#C8FF00] shrink-0" />
              <p className="text-xs text-[#C8FF00]">{successMsg}</p>
            </div>
          )}

          {/* 현재 식사 저장 영역 */}
          <div className="px-5 py-3 border-b border-[#2a2a2a]">
            {!saveMode ? (
              <button
                onClick={() => setSaveMode(true)}
                disabled={currentItems.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-[#242424] border border-dashed border-[#3a3a3a] rounded-[12px] py-3 text-sm text-[#888888] hover:border-[#C8FF00]/50 hover:text-[#C8FF00] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <BookmarkPlus size={16} />
                현재 {mealType} 식사를 템플릿으로 저장
                {currentItems.length > 0 && (
                  <span className="text-[10px] bg-[#3a3a3a] px-1.5 py-0.5 rounded-full">
                    {currentItems.length}개
                  </span>
                )}
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={savingName}
                  onChange={e => setSavingName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()}
                  placeholder="템플릿 이름 (예: 다이어트 아침)"
                  className="flex-1 bg-[#242424] border border-[#2a2a2a] rounded-[10px] px-3 py-2.5 text-sm text-[#f0f0f0] outline-none focus:border-[#C8FF00] placeholder:text-[#444]"
                  autoFocus
                />
                <button
                  onClick={handleSaveTemplate}
                  disabled={!savingName.trim() || saving}
                  className="px-4 py-2.5 bg-[#C8FF00] text-[#0f0f0f] rounded-[10px] text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={() => { setSaveMode(false); setSavingName('') }}
                  className="px-3 py-2.5 bg-[#242424] text-[#888888] rounded-[10px] text-sm"
                >
                  취소
                </button>
              </div>
            )}
          </div>

          {/* 템플릿 목록 */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 pb-8">
            <p className="text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-2">
              저장된 템플릿
            </p>

            {loading && (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-[#C8FF00] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && templates.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-[#555555]">저장된 템플릿이 없습니다</p>
                <p className="text-xs text-[#444] mt-1">식사를 추가한 후 템플릿으로 저장해보세요</p>
              </div>
            )}

            {!loading && templates.map(tmpl => {
              const totalCal = tmpl.meal_template_items.reduce((s, i) => s + (i.calories ?? 0), 0)
              const isExpanded = expandedId === tmpl.id
              return (
                <div key={tmpl.id} className="bg-[#242424] rounded-[14px] overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#f0f0f0] truncate">{tmpl.name}</p>
                      <p className="text-[11px] text-[#555555] mt-0.5">
                        {tmpl.meal_template_items.length}개 음식 · {Math.round(totalCal)}kcal
                      </p>
                    </div>

                    {/* 펼치기 */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : tmpl.id)}
                      className="p-1.5 text-[#555555] hover:text-[#888888]"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {/* 불러오기 */}
                    <button
                      onClick={() => handleLoadTemplate(tmpl)}
                      disabled={loadingId === tmpl.id}
                      className="px-3 py-1.5 bg-[#C8FF00]/10 text-[#C8FF00] rounded-[8px] text-xs font-semibold hover:bg-[#C8FF00]/20 transition-colors disabled:opacity-50"
                    >
                      {loadingId === tmpl.id ? '추가 중...' : '불러오기'}
                    </button>

                    {/* 삭제 */}
                    <button
                      onClick={() => handleDeleteTemplate(tmpl.id, tmpl.name)}
                      disabled={deletingId === tmpl.id}
                      className="p-1.5 text-[#444] hover:text-[#FF4B4B] transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* 항목 펼치기 */}
                  {isExpanded && (
                    <div className="border-t border-[#2a2a2a] px-4 py-2 space-y-1.5">
                      {tmpl.meal_template_items.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-xs">
                          <span className="text-[#888888] truncate flex-1">{item.food_name}</span>
                          <span className="text-[#555555] ml-2 shrink-0 tabular-nums">
                            {item.amount_g}g · {Math.round(item.calories ?? 0)}kcal
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
