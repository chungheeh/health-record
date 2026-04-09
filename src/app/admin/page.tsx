'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Users, BarChart2, Utensils, Dumbbell,
  Trash2, Shield, ShieldOff, Check, Plus, X, MessageSquare,
  RefreshCw, Edit2, Ban, UserCheck, Download
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Tab = 'dashboard' | 'users' | 'suggestions' | 'foods' | 'exercises'

interface UserRow {
  id: string
  created_at: string
  goal: string | null
  is_admin: boolean | null
  is_blocked: boolean | null
}

interface Suggestion {
  id: string
  user_id: string
  title: string
  content: string
  status: string
  admin_reply: string | null
  created_at: string
}

interface FoodRow {
  id: string
  name: string
  brand: string | null
  category: string | null
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
}

interface ExerciseRow {
  id: string
  name: string
  muscle_group: string
  equipment: string | null
}

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Dashboard stats
  const [stats, setStats] = useState({
    totalUsers: 0, todayUsers: 0,
    totalWorkouts: 0, todayWorkouts: 0,
    totalMeals: 0, todayMeals: 0,
    totalSuggestions: 0, pendingSuggestions: 0,
  })

  // Users
  const [users, setUsers] = useState<UserRow[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  // Food API sync
  const [syncQuery, setSyncQuery] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState('')

  // Foods
  const [foods, setFoods] = useState<FoodRow[]>([])
  const [foodSearch, setFoodSearch] = useState('')
  const [newFood, setNewFood] = useState({ name: '', brand: '', category: '', cal: '', protein: '', carbs: '', fat: '', serving: '' })
  const [addingFood, setAddingFood] = useState(false)

  // Exercises
  const [exList, setExList] = useState<ExerciseRow[]>([])
  const [exSearch, setExSearch] = useState('')
  const [newEx, setNewEx] = useState({ name: '', muscle_group: '가슴', equipment: '바벨' })
  const [addingEx, setAddingEx] = useState(false)

  const MUSCLE_GROUPS = ['가슴', '등', '하체', '어깨', '팔', '복근', '유산소', '전신']

  // 관리자 권한 확인
  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
        router.push('/')
        return
      }
      setIsAdmin(true)
      setLoading(false)
    }
    check()
  }, [router])

  // 대시보드 통계
  const fetchStats = useCallback(async () => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const [
      { count: totalUsers },
      { count: todayUsers },
      { count: totalWorkouts },
      { count: todayWorkouts },
      { count: totalMeals },
      { count: todayMeals },
      { count: totalSuggestions },
      { count: pendingSuggestions },
    ] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', `${today}T00:00:00`),
      supabase.from('workouts').select('*', { count: 'exact', head: true }),
      supabase.from('workouts').select('*', { count: 'exact', head: true }).gte('started_at', `${today}T00:00:00`),
      supabase.from('meals').select('*', { count: 'exact', head: true }),
      supabase.from('meals').select('*', { count: 'exact', head: true }).gte('eaten_at', `${today}T00:00:00`),
      supabase.from('suggestions').select('*', { count: 'exact', head: true }),
      supabase.from('suggestions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ])

    setStats({
      totalUsers: totalUsers ?? 0, todayUsers: todayUsers ?? 0,
      totalWorkouts: totalWorkouts ?? 0, todayWorkouts: todayWorkouts ?? 0,
      totalMeals: totalMeals ?? 0, todayMeals: todayMeals ?? 0,
      totalSuggestions: totalSuggestions ?? 0, pendingSuggestions: pendingSuggestions ?? 0,
    })
  }, [])

  const fetchUsers = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('user_profiles')
      .select('user_id, goal, is_admin, is_blocked, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    setUsers((data ?? []).map(p => ({
      id: p.user_id,
      created_at: p.created_at,
      goal: p.goal,
      is_admin: p.is_admin,
      is_blocked: p.is_blocked,
    })))
  }, [])

  const fetchSuggestions = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false })
    setSuggestions((data as Suggestion[]) ?? [])
  }, [])

  const fetchFoods = useCallback(async () => {
    const supabase = createClient()
    let q = supabase.from('foods').select('id,name,brand,category,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g').order('name')
    if (foodSearch.trim()) q = q.ilike('name', `%${foodSearch}%`)
    const { data } = await q.limit(50)
    setFoods((data as FoodRow[]) ?? [])
  }, [foodSearch])

  const fetchExercises = useCallback(async () => {
    const supabase = createClient()
    let q = supabase.from('exercises').select('id,name,muscle_group,equipment').order('muscle_group').order('name')
    if (exSearch.trim()) q = q.ilike('name', `%${exSearch}%`)
    const { data } = await q.limit(200)
    setExList((data as ExerciseRow[]) ?? [])
  }, [exSearch])

  useEffect(() => {
    if (!isAdmin) return
    if (tab === 'dashboard') fetchStats()
    if (tab === 'users') fetchUsers()
    if (tab === 'suggestions') fetchSuggestions()
    if (tab === 'foods') fetchFoods()
    if (tab === 'exercises') fetchExercises()
  }, [tab, isAdmin, fetchStats, fetchUsers, fetchSuggestions, fetchFoods, fetchExercises])

  // 건의사항 답변
  const handleReply = async (id: string) => {
    if (!replyText.trim()) return
    const supabase = createClient()
    await supabase.from('suggestions').update({
      admin_reply: replyText.trim(), status: 'answered', updated_at: new Date().toISOString()
    }).eq('id', id)
    setReplyingId(null)
    setReplyText('')
    fetchSuggestions()
  }

  const handleDeleteSuggestion = async (id: string) => {
    if (!confirm('건의사항을 삭제할까요?')) return
    const supabase = createClient()
    await supabase.from('suggestions').delete().eq('id', id)
    setSuggestions(prev => prev.filter(s => s.id !== id))
  }

  // 관리자 권한 토글
  const toggleAdmin = async (userId: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('user_profiles').update({ is_admin: !current }).eq('user_id', userId)
    fetchUsers()
  }

  // 유저 차단/해제
  const toggleBlock = async (userId: string, current: boolean) => {
    if (!confirm(current ? '차단을 해제할까요?' : '이 유저를 차단할까요?')) return
    const supabase = createClient()
    await supabase.from('user_profiles').update({ is_blocked: !current }).eq('user_id', userId)
    fetchUsers()
  }

  // 식품 API 수동 갱신
  const handleSyncFoodApi = async () => {
    if (!syncQuery.trim() || syncing) return
    setSyncing(true)
    setSyncResult('')
    try {
      const res = await fetch(`/api/search-foods?q=${encodeURIComponent(syncQuery.trim())}`)
      const data = await res.json()
      const count = (data.results ?? []).filter((r: { source?: string }) => r.source === 'api').length
      setSyncResult(`완료: API에서 ${count}개 식품 가져와 DB에 저장했습니다.`)
      fetchFoods()
    } catch {
      setSyncResult('오류: API 호출에 실패했습니다.')
    }
    setSyncing(false)
  }

  // 음식 추가
  const handleAddFood = async () => {
    if (!newFood.name.trim()) return
    setAddingFood(true)
    const supabase = createClient()
    await supabase.from('foods').insert({
      name: newFood.name.trim(),
      brand: newFood.brand.trim() || null,
      category: newFood.category.trim() || null,
      calories_per_100g: Number(newFood.cal) || 0,
      protein_per_100g: Number(newFood.protein) || 0,
      carbs_per_100g: Number(newFood.carbs) || 0,
      fat_per_100g: Number(newFood.fat) || 0,
      serving_size_g: Number(newFood.serving) || 100,
      serving_unit: 'g',
    })
    setNewFood({ name: '', brand: '', category: '', cal: '', protein: '', carbs: '', fat: '', serving: '' })
    setAddingFood(false)
    fetchFoods()
  }

  const handleDeleteFood = async (id: string) => {
    if (!confirm('음식을 삭제할까요?')) return
    const supabase = createClient()
    await supabase.from('foods').delete().eq('id', id)
    setFoods(prev => prev.filter(f => f.id !== id))
  }

  // 운동 추가
  const handleAddExercise = async () => {
    if (!newEx.name.trim()) return
    setAddingEx(true)
    const supabase = createClient()
    await supabase.from('exercises').insert({
      name: newEx.name.trim(),
      muscle_group: newEx.muscle_group,
      equipment: newEx.equipment || null,
    })
    setNewEx({ name: '', muscle_group: '가슴', equipment: '바벨' })
    setAddingEx(false)
    fetchExercises()
  }

  const handleDeleteExercise = async (id: string) => {
    if (!confirm('운동을 삭제할까요?')) return
    const supabase = createClient()
    await supabase.from('exercises').delete().eq('id', id)
    setExList(prev => prev.filter(e => e.id !== id))
  }

  if (loading) return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!isAdmin) return null

  const tabItems: { id: Tab; label: string; Icon: typeof BarChart2 }[] = [
    { id: 'dashboard', label: '대시보드', Icon: BarChart2 },
    { id: 'users', label: '회원', Icon: Users },
    { id: 'suggestions', label: '건의', Icon: MessageSquare },
    { id: 'foods', label: '식품', Icon: Utensils },
    { id: 'exercises', label: '운동', Icon: Dumbbell },
  ]

  return (
    <main className="min-h-screen bg-bg-primary">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-bg-primary border-b border-we-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-text-secondary"><ChevronLeft size={24} /></button>
        <h1 className="font-semibold text-text-primary flex-1">관리자</h1>
        <span className="text-xs bg-accent/10 text-accent border border-accent/30 px-2 py-1 rounded-full">Admin</span>
      </header>

      {/* 탭 */}
      <div className="flex border-b border-we-border bg-bg-primary sticky top-14 z-40">
        {tabItems.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors ${
              tab === id ? 'text-accent border-b-2 border-accent' : 'text-text-muted'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 pb-24 space-y-4">

        {/* ── 대시보드 ── */}
        {tab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '총 회원', value: stats.totalUsers, sub: `오늘 +${stats.todayUsers}`, color: '#4FC3F7' },
                { label: '총 운동 기록', value: stats.totalWorkouts, sub: `오늘 +${stats.todayWorkouts}`, color: 'var(--accent)' },
                { label: '총 식단 기록', value: stats.totalMeals, sub: `오늘 +${stats.todayMeals}`, color: '#81C784' },
                { label: '건의사항', value: stats.totalSuggestions, sub: `미처리 ${stats.pendingSuggestions}건`, color: '#FFB74D' },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="bg-bg-secondary rounded-[14px] p-4">
                  <p className="text-xs text-text-muted">{label}</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color }}>{value.toLocaleString()}</p>
                  <p className="text-[10px] text-text-secondary mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
            <button
              onClick={fetchStats}
              className="w-full flex items-center justify-center gap-2 py-3 bg-bg-secondary rounded-[14px] text-sm text-text-secondary"
            >
              <RefreshCw size={14} />새로고침
            </button>
          </>
        )}

        {/* ── 회원 관리 ── */}
        {tab === 'users' && (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className={`bg-bg-secondary rounded-[14px] p-4 flex items-center gap-3 ${u.is_blocked ? 'opacity-60' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary font-mono truncate">{u.id.slice(0, 16)}...</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {u.goal ?? '목표 미설정'} · {new Date(u.created_at).toLocaleDateString('ko-KR')}
                  </p>
                  {u.is_blocked && (
                    <span className="text-[10px] text-we-danger">차단됨</span>
                  )}
                </div>
                {u.is_admin && (
                  <span className="text-[10px] bg-accent/10 text-accent border border-accent/30 px-1.5 py-0.5 rounded-full shrink-0">
                    Admin
                  </span>
                )}
                <button
                  onClick={() => toggleAdmin(u.id, u.is_admin ?? false)}
                  className="p-1.5 rounded-[8px] text-text-muted hover:text-accent transition-colors"
                  title={u.is_admin ? '관리자 해제' : '관리자 지정'}
                >
                  {u.is_admin ? <ShieldOff size={15} /> : <Shield size={15} />}
                </button>
                <button
                  onClick={() => toggleBlock(u.id, u.is_blocked ?? false)}
                  className={`p-1.5 rounded-[8px] transition-colors ${u.is_blocked ? 'text-we-danger hover:text-text-secondary' : 'text-text-muted hover:text-we-danger'}`}
                  title={u.is_blocked ? '차단 해제' : '차단'}
                >
                  {u.is_blocked ? <UserCheck size={15} /> : <Ban size={15} />}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── 건의사항 ── */}
        {tab === 'suggestions' && (
          <div className="space-y-3">
            {suggestions.length === 0 && (
              <p className="text-center text-sm text-text-muted py-8">건의사항이 없습니다</p>
            )}
            {suggestions.map(s => (
              <div key={s.id} className="bg-bg-secondary rounded-[14px] p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-semibold text-text-primary">{s.title}</p>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setReplyingId(s.id); setReplyText(s.admin_reply ?? '') }}
                      className="p-1.5 text-text-muted hover:text-accent"><Edit2 size={13} /></button>
                    <button onClick={() => handleDeleteSuggestion(s.id)}
                      className="p-1.5 text-text-muted hover:text-we-danger"><Trash2 size={13} /></button>
                  </div>
                </div>
                <p className="text-xs text-text-secondary">{s.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    s.status === 'answered' ? 'bg-accent/10 text-accent' : 'bg-bg-tertiary text-text-muted'
                  }`}>{s.status === 'answered' ? '답변 완료' : '검토 중'}</span>
                  <span className="text-[10px] text-text-muted">
                    {new Date(s.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                {s.admin_reply && (
                  <div className="mt-2 bg-accent/5 border border-accent/20 rounded-[8px] px-3 py-2">
                    <p className="text-[10px] text-accent mb-0.5">답변</p>
                    <p className="text-xs text-text-secondary">{s.admin_reply}</p>
                  </div>
                )}
                {replyingId === s.id && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="답변을 입력하세요..."
                      rows={3}
                      className="w-full bg-bg-tertiary border border-we-border rounded-[10px] px-3 py-2 text-xs text-text-primary outline-none focus:border-accent resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleReply(s.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-accent text-bg-primary rounded-[8px] text-xs font-bold">
                        <Check size={12} />저장
                      </button>
                      <button onClick={() => { setReplyingId(null); setReplyText('') }}
                        className="px-3 py-1.5 bg-bg-tertiary text-text-secondary rounded-[8px] text-xs">
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── 식품 관리 ── */}
        {tab === 'foods' && (
          <div className="space-y-3">
            {/* 음식 추가 폼 */}
            <div className="bg-bg-secondary rounded-[14px] p-4 space-y-3">
              <p className="text-sm font-semibold text-text-primary">음식 추가</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={newFood.name} onChange={e => setNewFood(p => ({...p, name: e.target.value}))}
                  placeholder="음식 이름*" className="col-span-2 bg-bg-tertiary border border-we-border rounded-[8px] px-3 py-2 text-xs text-text-primary outline-none focus:border-accent placeholder:text-text-muted" />
                <input value={newFood.brand} onChange={e => setNewFood(p => ({...p, brand: e.target.value}))}
                  placeholder="브랜드" className="bg-bg-tertiary border border-we-border rounded-[8px] px-3 py-2 text-xs text-text-primary outline-none focus:border-accent placeholder:text-text-muted" />
                <input value={newFood.category} onChange={e => setNewFood(p => ({...p, category: e.target.value}))}
                  placeholder="카테고리" className="bg-bg-tertiary border border-we-border rounded-[8px] px-3 py-2 text-xs text-text-primary outline-none focus:border-accent placeholder:text-text-muted" />
                {[
                  { key: 'cal' as const, ph: '칼로리(kcal/100g)' },
                  { key: 'protein' as const, ph: '단백질(g/100g)' },
                  { key: 'carbs' as const, ph: '탄수화물(g/100g)' },
                  { key: 'fat' as const, ph: '지방(g/100g)' },
                  { key: 'serving' as const, ph: '1회 제공량(g)' },
                ].map(({ key, ph }) => (
                  <input key={key} type="number" value={newFood[key]} onChange={e => setNewFood(p => ({...p, [key]: e.target.value}))}
                    placeholder={ph} className="bg-bg-tertiary border border-we-border rounded-[8px] px-3 py-2 text-xs text-text-primary outline-none focus:border-accent placeholder:text-text-muted" />
                ))}
              </div>
              <button onClick={handleAddFood} disabled={!newFood.name.trim() || addingFood}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-accent text-bg-primary rounded-[10px] text-sm font-bold disabled:opacity-50">
                <Plus size={14} />{addingFood ? '추가 중...' : '음식 추가'}
              </button>
            </div>

            {/* 정부 API 동기화 */}
            <div className="bg-bg-secondary rounded-[14px] p-4 space-y-2">
              <p className="text-sm font-semibold text-text-primary">정부 DB API 가져오기</p>
              <p className="text-[11px] text-text-muted">검색어를 입력하면 data.go.kr 식품영양성분 DB에서 가져와 저장합니다.</p>
              <div className="flex gap-2">
                <input
                  value={syncQuery}
                  onChange={e => setSyncQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSyncFoodApi()}
                  placeholder="예: 닭가슴살, 신라면, 계란..."
                  className="flex-1 bg-bg-tertiary border border-we-border rounded-[8px] px-3 py-2 text-xs text-text-primary outline-none focus:border-accent placeholder:text-text-muted"
                />
                <button
                  onClick={handleSyncFoodApi}
                  disabled={!syncQuery.trim() || syncing}
                  className="flex items-center gap-1.5 px-3 py-2 bg-accent text-bg-primary rounded-[8px] text-xs font-bold disabled:opacity-50 shrink-0"
                >
                  <Download size={13} />{syncing ? '...' : '가져오기'}
                </button>
              </div>
              {syncResult && (
                <p className={`text-xs ${syncResult.startsWith('오류') ? 'text-we-danger' : 'text-accent'}`}>
                  {syncResult}
                </p>
              )}
            </div>

            {/* 검색 */}
            <input value={foodSearch} onChange={e => setFoodSearch(e.target.value)}
              placeholder="음식 검색..."
              className="w-full bg-bg-secondary border border-we-border rounded-[10px] px-4 py-3 text-sm text-text-primary outline-none focus:border-accent placeholder:text-text-muted" />

            {/* 목록 */}
            <div className="space-y-1.5">
              {foods.map(f => (
                <div key={f.id} className="bg-bg-secondary rounded-[12px] px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      {f.brand && <span className="text-accent mr-1">{f.brand}</span>}{f.name}
                    </p>
                    <p className="text-[11px] text-text-muted tabular-nums">
                      {Math.round(f.calories_per_100g)}kcal · P{Math.round(f.protein_per_100g)} C{Math.round(f.carbs_per_100g)} F{Math.round(f.fat_per_100g)} /100g
                    </p>
                  </div>
                  <button onClick={() => handleDeleteFood(f.id)} className="p-1.5 text-text-muted hover:text-we-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 운동 관리 ── */}
        {tab === 'exercises' && (
          <div className="space-y-3">
            {/* 운동 추가 폼 */}
            <div className="bg-bg-secondary rounded-[14px] p-4 space-y-3">
              <p className="text-sm font-semibold text-text-primary">운동 추가</p>
              <input value={newEx.name} onChange={e => setNewEx(p => ({...p, name: e.target.value}))}
                placeholder="운동 이름*"
                className="w-full bg-bg-tertiary border border-we-border rounded-[8px] px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent placeholder:text-text-muted" />
              <div className="grid grid-cols-2 gap-2">
                <select value={newEx.muscle_group} onChange={e => setNewEx(p => ({...p, muscle_group: e.target.value}))}
                  className="bg-bg-tertiary border border-we-border rounded-[8px] px-3 py-2.5 text-sm text-text-primary outline-none">
                  {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <input value={newEx.equipment} onChange={e => setNewEx(p => ({...p, equipment: e.target.value}))}
                  placeholder="기구 (바벨, 덤벨...)"
                  className="bg-bg-tertiary border border-we-border rounded-[8px] px-3 py-2 text-sm text-text-primary outline-none focus:border-accent placeholder:text-text-muted" />
              </div>
              <button onClick={handleAddExercise} disabled={!newEx.name.trim() || addingEx}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-accent text-bg-primary rounded-[10px] text-sm font-bold disabled:opacity-50">
                <Plus size={14} />{addingEx ? '추가 중...' : '운동 추가'}
              </button>
            </div>

            {/* 검색 */}
            <input value={exSearch} onChange={e => setExSearch(e.target.value)}
              placeholder="운동 검색..."
              className="w-full bg-bg-secondary border border-we-border rounded-[10px] px-4 py-3 text-sm text-text-primary outline-none focus:border-accent placeholder:text-text-muted" />

            {/* 집계 */}
            <p className="text-xs text-text-muted">총 {exList.length}개 운동 종목</p>

            {/* 목록 (부위별 그룹) */}
            {MUSCLE_GROUPS.map(group => {
              const items = exList.filter(e => e.muscle_group === group)
              if (items.length === 0 && exSearch) return null
              return (
                <div key={group}>
                  <p className="text-xs font-semibold text-text-muted mb-1.5">{group} ({items.length})</p>
                  <div className="space-y-1">
                    {items.map(e => (
                      <div key={e.id} className="bg-bg-secondary rounded-[10px] px-4 py-2.5 flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-sm text-text-primary">{e.name}</p>
                          <p className="text-[10px] text-text-muted">{e.equipment ?? '맨몸'}</p>
                        </div>
                        <button onClick={() => handleDeleteExercise(e.id)} className="p-1.5 text-text-muted hover:text-we-danger">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
