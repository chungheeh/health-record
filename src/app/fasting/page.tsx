'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Play, Square, Bell } from 'lucide-react'

const FASTING_MODES = [
  { label: '16:8', fastHours: 16, eatHours: 8, desc: '가장 일반적인 간헐적 단식' },
  { label: '18:6', fastHours: 18, eatHours: 6, desc: '고급 단식, 체지방 감소 효과 높음' },
  { label: '20:4', fastHours: 20, eatHours: 4, desc: '전사 다이어트' },
  { label: 'OMAD', fastHours: 23, eatHours: 1, desc: '하루 한 끼 (One Meal A Day)' },
]

const STORAGE_KEY = 'we_fasting_session'

interface FastingSession {
  startMs: number
  fastHours: number
  mode: string
}

function loadSession(): FastingSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FastingPage() {
  const [selectedMode, setSelectedMode] = useState(FASTING_MODES[0])
  const [session, setSession] = useState<FastingSession | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const saved = loadSession()
    if (saved) setSession(saved)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const startFasting = useCallback(() => {
    const s: FastingSession = {
      startMs: Date.now(),
      fastHours: selectedMode.fastHours,
      mode: selectedMode.label,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    setSession(s)
  }, [selectedMode])

  const stopFasting = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }, [])

  const elapsedMs = session ? now - session.startMs : 0
  const targetMs = session ? session.fastHours * 3600 * 1000 : 0
  const progress = session ? Math.min(elapsedMs / targetMs, 1) : 0
  const isComplete = session ? elapsedMs >= targetMs : false
  const remainingMs = session ? Math.max(0, targetMs - elapsedMs) : 0

  const eatWindowEnd = session
    ? new Date(session.startMs + session.fastHours * 3600 * 1000)
    : null
  const activeMode = FASTING_MODES.find(m => m.label === session?.mode) ?? selectedMode

  const circumference = 2 * Math.PI * 100
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <main className="min-h-screen bg-bg-primary">
      <header className="sticky top-0 z-50 bg-bg-primary border-b border-we-border px-4 h-14 flex items-center gap-3">
        <Link href="/diet" className="text-text-secondary">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="font-semibold text-text-primary flex-1">간헐적 단식</h1>
      </header>

      <div className="px-4 pt-6 pb-32 space-y-6">

        {/* 모드 선택 (단식 중 아닐 때만) */}
        {!session && (
          <div className="space-y-2">
            <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">단식 모드 선택</p>
            {FASTING_MODES.map(mode => (
              <button
                key={mode.label}
                onClick={() => setSelectedMode(mode)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-[14px] transition-all text-left"
                style={{
                  backgroundColor: selectedMode.label === mode.label ? 'rgba(200,255,0,0.08)' : 'var(--bg-secondary)',
                  border: `1.5px solid ${selectedMode.label === mode.label ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                <div>
                  <p className="font-bold text-text-primary">{mode.label}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{mode.desc}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: selectedMode.label === mode.label ? 'var(--accent)' : 'var(--text-muted)' }}>
                    단식 {mode.fastHours}h
                  </p>
                  <p className="text-xs text-text-muted">식사 {mode.eatHours}h</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 진행 원형 타이머 */}
        {session && (
          <div className="flex flex-col items-center py-4">
            <div className="relative w-56 h-56">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 220 220">
                <circle cx="110" cy="110" r="100" fill="none" stroke="var(--bg-tertiary)" strokeWidth="12" />
                <circle
                  cx="110" cy="110" r="100"
                  fill="none"
                  stroke={isComplete ? 'var(--success)' : 'var(--accent)'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xs text-text-secondary mb-1">{activeMode.label} 단식</p>
                {isComplete ? (
                  <>
                    <p className="text-2xl font-bold text-we-success">완료! 🎉</p>
                    <p className="text-xs text-text-secondary mt-1">식사 시간입니다</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold tabular-nums text-text-primary">
                      {formatDuration(elapsedMs)}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">경과</p>
                    <p className="text-sm font-semibold tabular-nums mt-2" style={{ color: 'var(--accent)' }}>
                      -{formatDuration(remainingMs)} 남음
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* 시작/종료 시각 */}
            <div className="flex gap-6 mt-6">
              <div className="text-center">
                <p className="text-[10px] text-text-muted">단식 시작</p>
                <p className="text-sm font-semibold text-text-primary">
                  {new Date(session.startMs).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {eatWindowEnd && (
                <div className="text-center">
                  <p className="text-[10px] text-text-muted">식사 시작</p>
                  <p className="text-sm font-semibold" style={{ color: isComplete ? 'var(--success)' : 'var(--accent)' }}>
                    {eatWindowEnd.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>

            {/* 진행률 */}
            <div className="w-full mt-6 bg-bg-secondary rounded-[16px] p-4">
              <div className="flex justify-between text-xs text-text-secondary mb-2">
                <span>진행률</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress * 100}%`,
                    backgroundColor: isComplete ? 'var(--success)' : 'var(--accent)',
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mt-1.5">
                <span>0h</span>
                <span>{session.fastHours}h</span>
              </div>
            </div>
          </div>
        )}

        {/* 단식 효과 정보 */}
        {session && (
          <div className="bg-bg-secondary rounded-[16px] p-4 space-y-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">단식 효과 타임라인</p>
            {[
              { h: 4, label: '혈당 안정화', icon: '📉', active: elapsedMs >= 4 * 3600000 },
              { h: 8, label: '케톤 생성 시작', icon: '🔥', active: elapsedMs >= 8 * 3600000 },
              { h: 12, label: '자가포식 시작', icon: '♻️', active: elapsedMs >= 12 * 3600000 },
              { h: 16, label: '성장호르몬 증가', icon: '💪', active: elapsedMs >= 16 * 3600000 },
              { h: 18, label: '지방 연소 최대화', icon: '⚡', active: elapsedMs >= 18 * 3600000 },
            ].map(item => (
              <div key={item.h} className="flex items-center gap-3">
                <span className={`text-lg ${item.active ? '' : 'grayscale opacity-30'}`}>{item.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${item.active ? 'text-text-primary' : 'text-text-muted'}`}>
                    {item.h}시간: {item.label}
                  </p>
                </div>
                {item.active && (
                  <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full">달성</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 시작/종료 버튼 */}
        <div className="fixed bottom-20 left-0 right-0 max-w-[430px] mx-auto px-4">
          {!session ? (
            <button
              onClick={startFasting}
              className="w-full py-4 bg-accent text-bg-primary font-bold rounded-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Play size={18} fill="currentColor" />
              {selectedMode.label} 단식 시작
            </button>
          ) : (
            <div className="space-y-2">
              {isComplete && (
                <div className="flex items-center gap-2 bg-we-success/10 border border-we-success/30 rounded-[12px] px-4 py-3">
                  <Bell size={16} className="text-we-success" />
                  <p className="text-sm text-we-success font-medium">단식 완료! 이제 식사해도 됩니다 🎉</p>
                </div>
              )}
              <button
                onClick={stopFasting}
                className="w-full py-4 bg-bg-secondary border border-we-danger/30 text-we-danger font-bold rounded-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Square size={16} fill="currentColor" />
                단식 종료
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
