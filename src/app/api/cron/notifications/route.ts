/**
 * POST /api/cron/notifications
 * Vercel Cron Job 전용 알림 라우트
 * vercel.json → cron schedule 설정 필요
 *
 * AM 09:00 KST → 운동 알림
 * PM 20:00 KST → 식단 미기록 알림
 */
import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Service Role 클라이언트 (RLS 우회, 서버 전용)
function getServiceClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createServiceClient(url, key, { auth: { persistSession: false } })
}

const CRON_SECRET = process.env.CRON_SECRET ?? ''

export async function GET(req: Request) {
  // 보안: Vercel Cron이 Authorization 헤더로 시크릿 전달
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const todayStr = new Date().toISOString().split('T')[0]
  const hour = new Date().getUTCHours() + 9 // KST (UTC+9)

  // AM(9-11시) → 운동 알림 / PM(20-22시) → 식단 알림
  const triggerType: 'workout' | 'diet' | null =
    hour >= 9 && hour < 12  ? 'workout' :
    hour >= 20 && hour < 23 ? 'diet'    : null

  if (!triggerType) {
    return NextResponse.json({ message: '알림 시간대 아님', hour })
  }

  // 모든 유저 조회
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('user_id')

  if (error || !profiles?.length) {
    return NextResponse.json({ message: '유저 없음', error })
  }

  const results: { user_id: string; sent: boolean; reason?: string }[] = []

  for (const { user_id } of profiles) {
    try {
      if (triggerType === 'workout') {
        // ── AM: 오늘 운동 기록 없으면 알림 ──────────────────────────────────
        const { data: workouts } = await supabase
          .from('workouts')
          .select('id')
          .eq('user_id', user_id)
          .gte('started_at', `${todayStr}T00:00:00`)
          .limit(1)

        if (!workouts?.length) {
          // 활성 루틴에서 오늘 운동 부위 확인
          const { data: routine } = await supabase
            .from('ai_routines')
            .select('routine_data')
            .eq('user_id', user_id)
            .eq('is_active', true)
            .maybeSingle()

          const todayDow = new Date().getDay() // 0=일, 1=월 ...
          let focus = '운동'
          if (routine?.routine_data) {
            const rd = routine.routine_data as { schedule?: { day: number; focus: string }[] }
            const todaySchedule = rd.schedule?.find(s => s.day === todayDow)
            if (todaySchedule) focus = todaySchedule.focus
          }

          await sendPushNotification(supabase, user_id, {
            title: '💪 오늘 운동 잊지 마세요!',
            body: `오늘 운동하셔야죠! 오늘은 ${focus} 날입니다.`,
            url: '/workout/new',
          })
          results.push({ user_id, sent: true })
        } else {
          results.push({ user_id, sent: false, reason: '이미 운동 기록 있음' })
        }

      } else {
        // ── PM: 오늘 식단 기록 없으면 알림 ──────────────────────────────────
        const { data: meals } = await supabase
          .from('meals')
          .select('id')
          .eq('user_id', user_id)
          .gte('eaten_at', `${todayStr}T00:00:00`)
          .limit(1)

        if (!meals?.length) {
          await sendPushNotification(supabase, user_id, {
            title: '🥗 오늘 식단을 기록해요!',
            body: '오늘 무엇을 드셨나요? 식단 기록이 목표 달성의 핵심입니다.',
            url: '/diet/add',
          })
          results.push({ user_id, sent: true })
        } else {
          results.push({ user_id, sent: false, reason: '이미 식단 기록 있음' })
        }
      }
    } catch (err) {
      results.push({ user_id, sent: false, reason: String(err) })
    }
  }

  const sentCount = results.filter(r => r.sent).length
  console.log(`[cron/notifications] ${triggerType} 알림 완료: ${sentCount}/${profiles.length}명`)

  return NextResponse.json({
    type: triggerType,
    total: profiles.length,
    sent: sentCount,
    results,
  })
}

// ─── Web Push 전송 헬퍼 ───────────────────────────────────────────────────────

async function sendPushNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  payload: { title: string; body: string; url: string },
) {
  // push_subscriptions에서 해당 유저 구독 조회
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .eq('user_id', userId)

  if (!subs?.length) {
    console.log(`[push] 유저 ${userId} 구독 없음`)
    return
  }

  // VAPID 키가 설정된 경우에만 실제 전송 (web-push 패키지 필요)
  // 현재는 console.log로 시뮬레이션
  for (const sub of subs) {
    console.log(`[push] → ${userId} | ${payload.title}`, {
      endpoint: sub.endpoint.slice(0, 50) + '...',
      payload,
    })
    // TODO: web-push 패키지 설치 후 아래 코드 활성화
    // await webpush.sendNotification(
    //   { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
    //   JSON.stringify(payload),
    // )
  }
}
