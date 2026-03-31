'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface BodyStat {
  id: string
  recorded_at: string
  weight_kg: number | null
  body_fat_pct: number | null
  skeletal_muscle_kg: number | null
}

interface FormState {
  weight: string
  bodyFat: string
  muscleMass: string
}

export default function BodyPage() {
  const [stats, setStats] = useState<BodyStat[]>([])
  const [form, setForm] = useState<FormState>({ weight: '', bodyFat: '', muscleMass: '' })
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('body_stats')
      .select('id, recorded_at, weight_kg, body_fat_pct, skeletal_muscle_kg')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: true })
      .limit(60)
    setStats(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const handleSave = async () => {
    if (!form.weight && !form.bodyFat && !form.muscleMass) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('body_stats').insert({
        user_id: user.id,
        recorded_at: new Date().toISOString(),
        weight_kg: form.weight ? Number(form.weight) : null,
        body_fat_pct: form.bodyFat ? Number(form.bodyFat) : null,
        skeletal_muscle_kg: form.muscleMass ? Number(form.muscleMass) : null,
      })
      setForm({ weight: '', bodyFat: '', muscleMass: '' })
      setShowForm(false)
      await fetchStats()
    } finally {
      setSaving(false)
    }
  }

  const weightData = stats
    .filter(s => s.weight_kg != null)
    .map(s => ({
      date: new Date(s.recorded_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      weight: s.weight_kg,
    }))

  const fatData = stats
    .filter(s => s.body_fat_pct != null)
    .map(s => ({
      date: new Date(s.recorded_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      fat: s.body_fat_pct,
    }))

  const latest = stats.length > 0 ? stats[stats.length - 1] : null

  const chartTooltipStyle = {
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 8,
    color: '#f0f0f0',
    fontSize: 12,
  }

  return (
    <main className="min-h-screen bg-[#0f0f0f]">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f] border-b border-[#2a2a2a] px-4 h-14 flex items-center gap-3">
        <Link href="/" className="text-[#888888]">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="font-semibold text-[#f0f0f0] flex-1">신체 기록</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#C8FF00] text-[#0f0f0f] rounded-full p-1.5"
        >
          <Plus size={16} />
        </button>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* 최신 수치 */}
        {latest && (
          <div className="bg-[#1a1a1a] rounded-[16px] p-5">
            <p className="text-xs text-[#888888] mb-3">최근 측정</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '체중', value: latest.weight_kg, unit: 'kg', color: '#C8FF00' },
                { label: '체지방률', value: latest.body_fat_pct, unit: '%', color: '#FF6B6B' },
                { label: '골격근량', value: latest.skeletal_muscle_kg, unit: 'kg', color: '#4FC3F7' },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="bg-[#242424] rounded-[12px] p-3 text-center">
                  <p className="text-[10px] text-[#888888] mb-1">{label}</p>
                  <p className="text-xl font-bold tabular-nums" style={{ color }}>
                    {value != null ? value : '—'}
                  </p>
                  <p className="text-[10px] text-[#555555]">{unit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 입력 폼 */}
        {showForm && (
          <div className="bg-[#1a1a1a] rounded-[16px] p-4 space-y-3">
            <p className="text-sm font-semibold text-[#f0f0f0]">오늘 측정값 입력</p>
            {([
              { key: 'weight', label: '체중', unit: 'kg', placeholder: '70.5' },
              { key: 'bodyFat', label: '체지방률', unit: '%', placeholder: '18.5' },
              { key: 'muscleMass', label: '골격근량', unit: 'kg', placeholder: '32.0' },
            ] as const).map(({ key, label, unit, placeholder }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs text-[#888888] w-16 shrink-0">{label}</span>
                <div className="flex-1 bg-[#242424] border border-[#2a2a2a] rounded-[10px] flex items-center px-3 focus-within:border-[#C8FF00]">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="flex-1 bg-transparent py-2.5 text-sm text-[#f0f0f0] outline-none tabular-nums"
                  />
                  <span className="text-xs text-[#555555]">{unit}</span>
                </div>
              </div>
            ))}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-[#C8FF00] text-[#0f0f0f] font-bold rounded-[12px] text-sm disabled:opacity-60 mt-2"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}

        {/* 체중 차트 */}
        {weightData.length > 1 && (
          <div className="bg-[#1a1a1a] rounded-[16px] p-4">
            <p className="text-sm font-semibold text-[#f0f0f0] mb-4">체중 변화</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={weightData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#888888', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#2a2a2a' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#888888', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#C8FF00"
                  strokeWidth={2}
                  dot={{ fill: '#C8FF00', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 체지방률 차트 */}
        {fatData.length > 1 && (
          <div className="bg-[#1a1a1a] rounded-[16px] p-4">
            <p className="text-sm font-semibold text-[#f0f0f0] mb-4">체지방률 변화</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={fatData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#888888', fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: '#2a2a2a' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#888888', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="fat"
                  stroke="#FF6B6B"
                  strokeWidth={2}
                  dot={{ fill: '#FF6B6B', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 비어있는 상태 */}
        {!loading && stats.length === 0 && (
          <div className="text-center py-16 text-[#555555]">
            <p className="text-4xl mb-3">⚖️</p>
            <p className="text-sm">측정 기록이 없습니다</p>
            <p className="text-xs mt-1 text-[#444444]">+ 버튼으로 오늘의 신체 수치를 기록해보세요</p>
          </div>
        )}
      </div>
    </main>
  )
}
