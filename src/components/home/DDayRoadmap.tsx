'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Trophy, Target, ChevronRight, Plus } from 'lucide-react'
import { getDailyMacroTarget, calcDaysLeft, calcProgressPct } from '@/lib/utils/periodization'

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface TargetEvent {
  id: string
  title: string
  start_date: string
  target_date: string
  is_active: boolean
}

interface DDayRoadmapProps {
  event: TargetEvent | null
  tdee: number | null
  todayCalories: number      // 오늘 실제 섭취 kcal
  isWorkoutDay?: boolean
}

// ─── 페이즈 뱃지 ──────────────────────────────────────────────────────────────

function PhaseBadge({ phaseName, color, emoji }: { phaseName: string; color: string; emoji: string }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '3px 10px', borderRadius: '999px',
        backgroundColor: color + '22',
        border: `1px solid ${color}55`,
        fontSize: '11px', fontWeight: 700, color,
      }}
    >
      {emoji} {phaseName}
    </span>
  )
}

// ─── 프로그레스 바 ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{
      height: '6px', borderRadius: '999px',
      backgroundColor: 'var(--bg-tertiary)',
      overflow: 'hidden', position: 'relative',
    }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{
          height: '100%', borderRadius: '999px',
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}88`,
        }}
      />
    </div>
  )
}

// ─── 매크로 행 ─────────────────────────────────────────────────────────────────

function MacroRow({ label, value, unit, color }: { label: string; value: number; unit: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 700, color: color ?? 'var(--text-primary)' }}>
        {Math.round(value).toLocaleString()}
        <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '2px' }}>
          {unit}
        </span>
      </span>
    </div>
  )
}

// ─── D-Day 설정 모달 ───────────────────────────────────────────────────────────

function DDaySetupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 오늘 이후 날짜만 허용
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  async function handleSubmit() {
    if (!title.trim() || !targetDate) { setError('이벤트명과 날짜를 입력해주세요'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/generate-dday-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), target_date: targetDate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '오류')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 60 }}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        style={{
          position: 'fixed', bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '100%', maxWidth: '430px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '20px 20px 0 0',
          padding: '24px 20px 40px',
          zIndex: 61,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Trophy size={20} color="var(--accent)" />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            D-Day 목표 설정
          </h3>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            이벤트명 *
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="예) 2025 서울 피지크 대회"
            style={{
              width: '100%', boxSizing: 'border-box',
              backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '11px 14px',
              color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            목표일 *
          </label>
          <input
            type="date"
            value={targetDate}
            min={minDateStr}
            onChange={e => setTargetDate(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '11px 14px',
              color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
            }}
          />
        </div>

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: '12px', marginBottom: '12px' }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !title.trim() || !targetDate}
          style={{
            width: '100%', padding: '14px',
            backgroundColor: loading || !title.trim() || !targetDate ? 'var(--bg-tertiary)' : 'var(--accent)',
            color: loading || !title.trim() || !targetDate ? 'var(--text-muted)' : 'var(--bg-primary)',
            border: 'none', borderRadius: '12px',
            fontSize: '15px', fontWeight: 700, cursor: 'pointer',
          }}
        >
          {loading ? '🤖 AI 플랜 생성 중...' : '🏆 D-Day 플랜 시작하기'}
        </button>
      </motion.div>
    </>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function DDayRoadmap({ event, tdee, todayCalories, isWorkoutDay = true }: DDayRoadmapProps) {
  const router = useRouter()
  const [showSetup, setShowSetup] = useState(false)

  // ── 이벤트 없음 ─────────────────────────────────────────────────────────────
  if (!event) {
    return (
      <>
        <button
          onClick={() => setShowSetup(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: 'var(--bg-secondary)', border: '1.5px dashed var(--border)',
            borderRadius: '16px', padding: '16px 20px', cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              backgroundColor: 'rgba(var(--accent-rgb)/0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Trophy size={18} color="var(--accent)" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                D-Day 목표를 설정해보세요
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                대회·촬영·여행 등 목표일 기반 AI 플랜
              </p>
            </div>
          </div>
          <Plus size={18} color="var(--accent)" />
        </button>

        {showSetup && (
          <DDaySetupModal
            onClose={() => setShowSetup(false)}
            onCreated={() => { setShowSetup(false); router.refresh() }}
          />
        )}
      </>
    )
  }

  // ── 이벤트 있음: 데이터 계산 ─────────────────────────────────────────────────
  const daysLeft = calcDaysLeft(event.target_date)
  const progressPct = calcProgressPct(event.start_date, event.target_date)
  const phase = getDailyMacroTarget(tdee ?? 2200, daysLeft, isWorkoutDay)
  const calRemaining = phase.targetCalories - todayCalories

  return (
    <>
      <div style={{
        backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '18px 20px',
        overflow: 'hidden',
      }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Trophy size={15} color="var(--accent)" />
              <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700 }}>D-DAY 로드맵</span>
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {event.title}
            </h3>
          </div>
          {/* D-숫자 */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '28px', fontWeight: 900, color: 'var(--accent)', margin: 0, lineHeight: 1 }}>
              D-{daysLeft}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {new Date(event.target_date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* 페이즈 뱃지 */}
        <div style={{ marginBottom: '12px' }}>
          <PhaseBadge
            phaseName={phase.phaseName}
            color={phase.phaseColor}
            emoji={phase.phaseEmoji}
          />
        </div>

        {/* 프로그레스 바 */}
        <div style={{ marginBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              시작 {new Date(event.start_date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{progressPct}% 완료</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              목표 {new Date(event.target_date + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
            </span>
          </div>
          <ProgressBar pct={progressPct} color={phase.phaseColor} />
        </div>

        {/* 구분선 */}
        <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '14px 0' }} />

        {/* 오늘 미션 카드 */}
        <div style={{
          backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', padding: '14px',
          border: `1px solid ${phase.phaseColor}33`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Target size={13} color={phase.phaseColor} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: phase.phaseColor }}>오늘의 미션</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              탄수×{phase.currentCarbMultiplier.toFixed(1)}
            </span>
          </div>

          <MacroRow
            label="오늘 목표 칼로리"
            value={phase.targetCalories}
            unit="kcal"
            color={phase.phaseColor}
          />
          <MacroRow
            label="현재 섭취"
            value={todayCalories}
            unit="kcal"
          />
          <MacroRow
            label={calRemaining >= 0 ? '남은 칼로리' : '초과 칼로리'}
            value={Math.abs(calRemaining)}
            unit="kcal"
            color={calRemaining >= 0 ? 'var(--success)' : 'var(--danger)'}
          />
        </div>

        {/* 페이즈 힌트 */}
        <p style={{
          fontSize: '11px', color: 'var(--text-secondary)',
          marginTop: '10px', marginBottom: '0',
          lineHeight: '1.6',
        }}>
          {phase.phaseHint}
        </p>

        {/* 새 목표 설정 링크 */}
        <button
          onClick={() => setShowSetup(true)}
          style={{
            marginTop: '12px', width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '11px', color: 'var(--text-muted)',
            padding: '6px 0',
          }}
        >
          <Plus size={11} />
          새 D-Day 목표 설정
          <ChevronRight size={11} />
        </button>
      </div>

      {showSetup && (
        <DDaySetupModal
          onClose={() => setShowSetup(false)}
          onCreated={() => { setShowSetup(false); router.refresh() }}
        />
      )}
    </>
  )
}
