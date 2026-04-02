'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Send, MessageSquare, CheckCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Suggestion {
  id: string
  title: string
  content: string
  status: 'pending' | 'answered' | 'closed'
  admin_reply: string | null
  created_at: string
}

export default function SuggestionsPage() {
  const router = useRouter()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('suggestions')
        .select('*')
        .order('created_at', { ascending: false })
      setSuggestions((data as Suggestion[]) ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || submitting) return
    setSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    const { data, error } = await supabase
      .from('suggestions')
      .insert({ user_id: user.id, title: title.trim(), content: content.trim() })
      .select()
      .single()

    if (!error && data) {
      setSuggestions(prev => [data as Suggestion, ...prev])
      setTitle('')
      setContent('')
      setShowForm(false)
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
    }
    setSubmitting(false)
  }

  const statusInfo = {
    pending: { label: '검토 중', color: '#888888', icon: Clock },
    answered: { label: '답변 완료', color: '#C8FF00', icon: CheckCircle },
    closed: { label: '완료', color: '#555555', icon: CheckCircle },
  }

  return (
    <main className="min-h-screen bg-[#0f0f0f]">
      <header className="sticky top-0 z-50 bg-[#0f0f0f] border-b border-[#2a2a2a] px-4 h-14 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[#888888]">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold text-[#f0f0f0] flex-1">건의사항</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-[#C8FF00] text-[#0f0f0f] rounded-[10px] text-xs font-bold active:scale-95 transition-transform"
        >
          + 건의하기
        </button>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-4">

        {/* 성공 메시지 */}
        {submitted && (
          <div className="bg-[#C8FF00]/10 border border-[#C8FF00]/30 rounded-[14px] px-4 py-3 flex items-center gap-2">
            <CheckCircle size={16} className="text-[#C8FF00] shrink-0" />
            <p className="text-sm text-[#C8FF00]">건의사항이 등록되었습니다. 검토 후 답변드리겠습니다.</p>
          </div>
        )}

        {/* 작성 폼 */}
        {showForm && (
          <div className="bg-[#1a1a1a] rounded-[16px] p-4 space-y-3">
            <p className="text-sm font-semibold text-[#f0f0f0]">새 건의사항 작성</p>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="제목 (예: 운동 종목 추가 요청)"
              className="w-full bg-[#242424] border border-[#2a2a2a] rounded-[10px] px-3 py-3 text-sm text-[#f0f0f0] outline-none focus:border-[#C8FF00] placeholder:text-[#444]"
            />
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="내용을 자유롭게 작성해주세요..."
              rows={4}
              className="w-full bg-[#242424] border border-[#2a2a2a] rounded-[10px] px-3 py-3 text-sm text-[#f0f0f0] outline-none focus:border-[#C8FF00] placeholder:text-[#444] resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || !content.trim() || submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-[#C8FF00] text-[#0f0f0f] font-bold py-3 rounded-[12px] text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                <Send size={15} />
                {submitting ? '제출 중...' : '제출하기'}
              </button>
              <button
                onClick={() => { setShowForm(false); setTitle(''); setContent('') }}
                className="px-4 py-3 bg-[#242424] text-[#888888] rounded-[12px] text-sm"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 안내 */}
        <div className="bg-[#1a1a1a] rounded-[14px] px-4 py-3">
          <p className="text-xs text-[#555555]">
            앱 개선 아이디어, 버그 제보, 기능 요청 등 자유롭게 남겨주세요.
            관리자가 검토 후 답변드립니다.
          </p>
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-[#C8FF00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={40} className="text-[#2a2a2a] mx-auto mb-3" />
            <p className="text-sm text-[#555555]">아직 건의사항이 없습니다</p>
            <p className="text-xs text-[#444] mt-1">첫 번째 건의사항을 남겨보세요!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map(s => {
              const info = statusInfo[s.status] ?? statusInfo.pending
              const Icon = info.icon
              const dateStr = new Date(s.created_at).toLocaleDateString('ko-KR', {
                month: 'short', day: 'numeric'
              })
              return (
                <div key={s.id} className="bg-[#1a1a1a] rounded-[16px] p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-[#f0f0f0] flex-1">{s.title}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <Icon size={12} style={{ color: info.color }} />
                      <span className="text-[10px] font-medium" style={{ color: info.color }}>
                        {info.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#888888] leading-relaxed">{s.content}</p>
                  {s.admin_reply && (
                    <div className="mt-3 bg-[#C8FF00]/5 border border-[#C8FF00]/20 rounded-[10px] px-3 py-2.5">
                      <p className="text-[10px] text-[#C8FF00] font-semibold mb-1">관리자 답변</p>
                      <p className="text-xs text-[#888888]">{s.admin_reply}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-[#444] mt-2">{dateStr}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
