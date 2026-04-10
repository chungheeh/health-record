'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Bot, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// ─── Markdown 렌더러 (lightweight) ────────────────────────────────────────────

function MdText({ text }: { text: string }) {
  // 줄 단위로 처리
  const lines = text.split('\n')
  return (
    <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />

        // 굵게: **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2, -2)}</strong>
          }
          return part
        })

        // 헤딩
        if (line.startsWith('### ')) return <p key={i} style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '2px' }}>{line.slice(4)}</p>
        if (line.startsWith('## '))  return <p key={i} style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{line.slice(3)}</p>
        if (line.startsWith('# '))   return <p key={i} style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px' }}>{line.slice(2)}</p>

        // 리스트
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>•</span>
              <span>{parts.slice(1)}</span>
            </div>
          )
        }

        return <p key={i} style={{ marginBottom: '2px' }}>{parts}</p>
      })}
    </div>
  )
}

// ─── Coach Sheet ──────────────────────────────────────────────────────────────

export default function CoachSheet() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      // 첫 오픈 시 인사 메시지
      setMessages([{
        role: 'assistant',
        content: '안녕하세요! W.E 코치입니다 💪\n\n오늘의 운동·식단에 대해 뭐든 물어보세요. 현재 데이터를 기반으로 맞춤 조언을 드리겠습니다.',
      }])
    }
  }, [open, messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '오류가 발생했습니다')
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ ${err instanceof Error ? err.message : '응답을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.'}`,
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* FAB 버튼 */}
      <button
        onClick={() => setOpen(true)}
        aria-label="AI 코치 열기"
        style={{
          position: 'fixed',
          bottom: '80px',   // 하단 네비 위
          right: '20px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent)',
          color: 'var(--bg-primary)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          zIndex: 45,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.92)')}
        onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Bot size={24} strokeWidth={2} />
      </button>

      {/* 오버레이 */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 50,
          }}
        />
      )}

      {/* 바텀 시트 */}
      <div
        style={{
          position: 'fixed',
          left: '50%',
          transform: `translateX(-50%) translateY(${open ? '0' : '100%'})`,
          bottom: 0,
          width: '100%',
          maxWidth: '430px',
          height: '75dvh',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '20px 20px 0 0',
          zIndex: 51,
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
          overflow: 'hidden',
        }}
      >
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: 'var(--accent)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={17} color="var(--bg-primary)" strokeWidth={2.2} />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>W.E 코치</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>내 데이터 기반 맞춤 코칭</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 메시지 영역 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%',
                  backgroundColor: 'var(--accent)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginRight: '8px', marginTop: '2px',
                }}>
                  <Bot size={13} color="var(--bg-primary)" strokeWidth={2.5} />
                </div>
              )}
              <div style={{
                maxWidth: '82%',
                backgroundColor: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-tertiary)',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                padding: '10px 14px',
              }}>
                {msg.role === 'user' ? (
                  <p style={{ fontSize: '13px', color: 'var(--bg-primary)', margin: 0, lineHeight: '1.5' }}>
                    {msg.content}
                  </p>
                ) : (
                  <MdText text={msg.content} />
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                backgroundColor: 'var(--accent)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Bot size={13} color="var(--bg-primary)" strokeWidth={2.5} />
              </div>
              <div style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '4px 16px 16px 16px',
                padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>분석 중...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* 입력 영역 */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-end',
          flexShrink: 0,
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="코치에게 물어보세요..."
            rows={1}
            style={{
              flex: 1,
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '10px 14px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              resize: 'none',
              outline: 'none',
              lineHeight: '1.5',
              maxHeight: '100px',
              overflowY: 'auto',
              fontFamily: 'inherit',
            }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 100) + 'px'
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: input.trim() && !loading ? 'var(--accent)' : 'var(--bg-tertiary)',
              border: 'none',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background-color 0.15s',
            }}
          >
            <Send
              size={17}
              color={input.trim() && !loading ? 'var(--bg-primary)' : 'var(--text-muted)'}
              strokeWidth={2.2}
            />
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
