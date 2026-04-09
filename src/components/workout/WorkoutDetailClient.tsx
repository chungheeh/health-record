'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pencil, X, Plus, Check, Trash2, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/* ── 타입 ── */
export type SetType = 'normal' | 'warmup' | 'dropset'

export interface EditableSet {
  id?: string
  set_number: number
  set_type: SetType
  weight_kg: number | null
  reps: number | null
  one_rm?: number | null
  isNew?: boolean
  deleted?: boolean
}

export interface EditableExercise {
  id: string
  exercise_id: string
  name: string
  muscle_group: string
  sets: EditableSet[]
  deleted?: boolean
}

interface WorkoutMeta {
  id: string
  total_seconds: number | null
  started_at: string
}

interface Props {
  workout: WorkoutMeta
  exercises: EditableExercise[]
  totalVolume: number
  totalSets: number
  workoutDate: string
}

const SET_TYPE_OPTIONS: { value: SetType; label: string }[] = [
  { value: 'normal', label: '기본' },
  { value: 'warmup', label: '웜업' },
  { value: 'dropset', label: '드랍' },
]

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}시간 ${m}분`
  if (m > 0) return `${m}분 ${s}초`
  return `${s}초`
}

export default function WorkoutDetailClient({
  workout, exercises: initExercises, totalVolume, totalSets, workoutDate
}: Props) {
  const router = useRouter()
  const [editMode, setEditMode] = useState(false)
  const [exercises, setExercises] = useState<EditableExercise[]>(initExercises)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  /* ── 편집 헬퍼 ── */
  const updateSet = (exIdx: number, realIdx: number, updates: Partial<EditableSet>) => {
    setExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) => si !== realIdx ? s : { ...s, ...updates }),
      }
    ))
  }

  const deleteSet = (exIdx: number, realIdx: number) => {
    setExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) => si !== realIdx ? s : { ...s, deleted: true }),
      }
    ))
  }

  const addSet = (exIdx: number) => {
    setExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex
      const activeSets = ex.sets.filter(s => !s.deleted)
      const lastSet = activeSets[activeSets.length - 1]
      const newSet: EditableSet = {
        set_number: activeSets.length + 1,
        set_type: 'normal',
        weight_kg: lastSet?.weight_kg ?? null,
        reps: lastSet?.reps ?? null,
        isNew: true,
      }
      return { ...ex, sets: [...ex.sets, newSet] }
    }))
  }

  const deleteExercise = (exIdx: number) => {
    if (!confirm('이 종목을 삭제하시겠습니까?')) return
    setExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx ? ex : { ...ex, deleted: true }
    ))
  }

  const cancelEdit = () => {
    setExercises(initExercises)
    setEditMode(false)
  }

  /* ── 저장 ── */
  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()

      for (const ex of exercises) {
        if (ex.deleted) {
          await supabase.from('workout_exercises').delete().eq('id', ex.id)
          continue
        }

        let setNumber = 0
        for (const s of ex.sets) {
          if (s.deleted && s.id) {
            await supabase.from('sets').delete().eq('id', s.id)
            continue
          }
          if (s.deleted) continue
          setNumber++

          const oneRm = (s.weight_kg && s.reps)
            ? Math.round(s.weight_kg * (1 + s.reps / 30))
            : null

          if (s.isNew) {
            await supabase.from('sets').insert({
              workout_exercise_id: ex.id,
              set_number: setNumber,
              set_type: s.set_type,
              weight_kg: s.weight_kg,
              reps: s.reps,
              one_rm: oneRm,
            })
          } else if (s.id) {
            await supabase.from('sets').update({
              set_number: setNumber,
              set_type: s.set_type,
              weight_kg: s.weight_kg,
              reps: s.reps,
              one_rm: oneRm,
            }).eq('id', s.id)
          }
        }
      }

      setSavedMsg('저장되었습니다!')
      setTimeout(() => setSavedMsg(''), 2000)
      setEditMode(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      setSavedMsg('저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  /* ── 요약 재계산 ── */
  const liveAllSets = exercises.filter(ex => !ex.deleted).flatMap(ex => ex.sets.filter(s => !s.deleted))
  const liveVolume = liveAllSets
    .filter(s => (!s.set_type || s.set_type === 'normal') && s.weight_kg && s.reps)
    .reduce((sum, s) => sum + (s.weight_kg! * s.reps!), 0)
  const liveSets = liveAllSets.filter(s => s.weight_kg && s.reps).length
  const liveExCount = exercises.filter(ex => !ex.deleted).length

  return (
    <main className="min-h-screen bg-bg-primary">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-bg-primary border-b border-we-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-text-secondary shrink-0">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold text-text-primary flex-1 truncate">
          {editMode ? '✏️ 운동 수정' : '🎉 운동 완료'}
        </h1>
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 border border-accent/40 px-3 py-1.5 rounded-[8px] active:scale-95 transition-all"
          >
            <Pencil size={12} />
            수정
          </button>
        ) : (
          <button
            onClick={cancelEdit}
            className="shrink-0 flex items-center gap-1 text-xs font-medium text-text-secondary border border-we-border px-3 py-1.5 rounded-[8px] active:scale-95"
          >
            <X size={13} />
            취소
          </button>
        )}
      </header>

      {/* 편집 모드 안내 배너 */}
      {editMode && (
        <div className="bg-accent/8 border-b border-accent/20 px-4 py-2 text-center">
          <p className="text-xs text-accent">무게와 횟수를 수정하고 저장하세요</p>
        </div>
      )}

      <div className="px-4 pt-4 pb-36 space-y-4">
        {/* 요약 카드 */}
        <div className="bg-bg-secondary rounded-[16px] p-5">
          <p className="text-xs text-text-secondary mb-3">{workoutDate}</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-bg-tertiary rounded-[12px] p-3 text-center">
              <p className="text-2xl font-bold text-accent tabular-nums">
                {formatDuration(workout.total_seconds)}
              </p>
              <p className="text-xs text-text-secondary mt-1">운동 시간</p>
            </div>
            <div className="bg-bg-tertiary rounded-[12px] p-3 text-center">
              <p className="text-2xl font-bold text-text-primary tabular-nums">{liveExCount}</p>
              <p className="text-xs text-text-secondary mt-1">종목 수</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-tertiary rounded-[12px] p-3 text-center">
              <p className="text-2xl font-bold text-text-primary tabular-nums">
                {editMode ? liveSets : totalSets}
              </p>
              <p className="text-xs text-text-secondary mt-1">총 세트</p>
            </div>
            <div className="bg-bg-tertiary rounded-[12px] p-3 text-center">
              <p className="text-2xl font-bold text-text-primary tabular-nums">
                {Math.round(editMode ? liveVolume : totalVolume).toLocaleString()}
              </p>
              <p className="text-xs text-text-secondary mt-1">총 볼륨(kg)</p>
            </div>
          </div>
        </div>

        {/* 종목별 기록 */}
        {exercises.map((ex, exIdx) => {
          if (ex.deleted) return null
          const activeSetsEx = ex.sets.filter(s => !s.deleted)

          return (
            <div key={ex.id} className="bg-bg-secondary rounded-[16px] overflow-hidden">
              {/* 종목 헤더 */}
              <div className="px-4 py-3 border-b border-we-border flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-text-primary truncate">{ex.name}</span>
                  <span className="shrink-0 text-xs text-text-secondary">{ex.muscle_group}</span>
                </div>
                {editMode && (
                  <button
                    onClick={() => deleteExercise(exIdx)}
                    className="shrink-0 ml-2 p-1.5 text-text-muted hover:text-we-danger transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {/* 세트 목록 */}
              <div className="px-3 py-3">

                {/* ── 뷰 모드: 컴팩트 테이블 ── */}
                {!editMode && (
                  <>
                    <div className="grid grid-cols-[32px_60px_1fr_1fr] gap-x-2 text-xs text-text-muted mb-2 px-1">
                      <span className="text-center">세트</span>
                      <span className="text-center">종류</span>
                      <span className="text-center">무게</span>
                      <span className="text-center">횟수</span>
                    </div>
                    {activeSetsEx.map((set, si) => (
                      <div key={si} className="grid grid-cols-[32px_60px_1fr_1fr] gap-x-2 py-1.5 px-1 text-sm">
                        <span className="text-center text-text-secondary tabular-nums">{si + 1}</span>
                        <span className="text-center text-xs text-text-secondary">
                          {set.set_type === 'warmup' ? '🌡️' : set.set_type === 'dropset' ? '🔻' : '기본'}
                        </span>
                        <span className="text-center text-text-primary tabular-nums">
                          {set.weight_kg != null ? `${set.weight_kg}kg` : '-'}
                        </span>
                        <span className="text-center text-text-primary tabular-nums">
                          {set.reps != null ? `${set.reps}회` : '-'}
                        </span>
                      </div>
                    ))}
                    {(() => {
                      const best = activeSetsEx
                        .filter(s => s.one_rm)
                        .reduce<EditableSet | null>((b, s) => !b || (s.one_rm ?? 0) > (b.one_rm ?? 0) ? s : b, null)
                      return best?.one_rm ? (
                        <p className="text-xs text-accent mt-2 px-1">추정 1RM: {Math.round(best.one_rm)}kg</p>
                      ) : null
                    })()}
                  </>
                )}

                {/* ── 편집 모드: 입력 폼 ── */}
                {editMode && (
                  <>
                    {/* 컬럼 헤더 */}
                    <div className="grid grid-cols-[24px_1fr_1fr_1fr_24px] gap-2 text-[10px] text-text-muted mb-2 px-1">
                      <span className="text-center">#</span>
                      <span className="text-center">종류</span>
                      <span className="text-center">무게(kg)</span>
                      <span className="text-center">횟수(회)</span>
                      <span />
                    </div>

                    {activeSetsEx.map((set, si) => {
                      const realIdx = ex.sets.indexOf(set)
                      return (
                        <div key={realIdx} className="grid grid-cols-[24px_1fr_1fr_1fr_24px] gap-2 mb-2 items-center px-1">
                          {/* 번호 */}
                          <span className="text-center text-xs text-text-secondary tabular-nums">{si + 1}</span>

                          {/* 종류 select */}
                          <select
                            value={set.set_type}
                            onChange={e => updateSet(exIdx, realIdx, { set_type: e.target.value as SetType })}
                            className="w-full text-xs bg-bg-tertiary text-text-primary border border-we-border rounded-[8px] py-2 px-1 outline-none appearance-none text-center"
                          >
                            {SET_TYPE_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>

                          {/* 무게 */}
                          <input
                            type="number"
                            inputMode="decimal"
                            value={set.weight_kg ?? ''}
                            onChange={e => updateSet(exIdx, realIdx, { weight_kg: e.target.value ? Number(e.target.value) : null })}
                            placeholder="0"
                            className="w-full bg-bg-tertiary border border-we-border rounded-[8px] py-2 text-sm text-text-primary outline-none tabular-nums text-center focus:border-accent"
                          />

                          {/* 횟수 */}
                          <input
                            type="number"
                            inputMode="numeric"
                            value={set.reps ?? ''}
                            onChange={e => updateSet(exIdx, realIdx, { reps: e.target.value ? Number(e.target.value) : null })}
                            placeholder="0"
                            className="w-full bg-bg-tertiary border border-we-border rounded-[8px] py-2 text-sm text-text-primary outline-none tabular-nums text-center focus:border-accent"
                          />

                          {/* 삭제 */}
                          <button
                            onClick={() => deleteSet(exIdx, realIdx)}
                            className="flex items-center justify-center text-text-muted active:text-we-danger transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )
                    })}

                    {/* 세트 추가 */}
                    <button
                      onClick={() => addSet(exIdx)}
                      className="mt-1 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-xs font-medium text-accent border border-dashed border-accent/40 active:bg-accent/10 transition-colors"
                    >
                      <Plus size={13} />
                      세트 추가
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {savedMsg && (
          <p className="text-center text-sm text-accent font-medium">{savedMsg}</p>
        )}
      </div>

      {/* ── 하단 고정 버튼 — BottomNav(h-16) 위 ── */}
      <div className="fixed bottom-16 left-0 right-0 max-w-[430px] mx-auto px-4 pb-3 pt-4 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent z-40">
        {editMode ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-accent text-bg-primary font-bold rounded-[16px] py-4 text-base flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform shadow-lg shadow-accent/20"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-bg-primary border-t-transparent rounded-full animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Check size={18} strokeWidth={3} />
                저장하기
              </>
            )}
          </button>
        ) : (
          <Link
            href="/"
            className="block w-full bg-accent text-bg-primary font-bold rounded-[16px] py-4 text-base text-center active:scale-[0.98] transition-transform"
          >
            홈으로
          </Link>
        )}
      </div>
    </main>
  )
}
