import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { calcTDEE, type ActivityLevel, type Gender } from '@/lib/utils/tdee'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ─── 시스템 프롬프트 빌더 ───────────────────────────────────────────────────

function buildSystemPrompt(ctx: {
  name: string
  goal: string
  gender: string
  age: number | null
  height: number | null
  weight: number | null
  fat: number | null
  tdee: number | null
  carbStatus: string
  gKcal: number | null
  gP: number | null
  gC: number | null
  gF: number | null
  cKcal: number
  cP: number
  cC: number
  cF: number
  recentWorkouts: string
}): string {
  return `[Role]
W.E app AI Coach. 20-yr elite bodybuilder & sports nutritionist.
Tone: Strict but warm PT, professional Korean(합쇼체/해요체). Never sound robotic.

[Context]
User: ${ctx.name}
Goal: ${ctx.goal || '미설정'}
Body: ${ctx.gender}, ${ctx.age ?? '?'}세, ${ctx.height ?? '?'}cm, ${ctx.weight ?? '?'}kg, Fat ${ctx.fat ?? '?'}%
TDEE: ${ctx.tdee != null ? ctx.tdee + 'kcal' : '계산 불가 (프로필 미완성)'}
CarbCycle: ${ctx.carbStatus}
Target: ${ctx.gKcal ?? '?'}kcal / P:${ctx.gP ?? '?'}g / C:${ctx.gC ?? '?'}g / F:${ctx.gF ?? '?'}g
Consumed: ${ctx.cKcal}kcal / P:${ctx.cP}g / C:${ctx.cC}g / F:${ctx.cF}g
RecentWorkouts(3d): ${ctx.recentWorkouts || '없음'}

[Rules]
1. Data-Driven: Use exact numbers from Context (e.g., "P:40g left, recommend 1.5 pack of chicken breast").
2. No Overtraining: Suggest workouts avoiding RecentWorkouts muscles.
3. Guide Only: You CANNOT modify data. Instruct users to use app UI (+ button, timer, etc.).
4. Expertise: Use science-based facts (macros, overload, fasting).
5. Safety: Tell users to see a doctor for injuries.

[Format]
- Use concise Markdown (mobile-friendly).
- No long paragraphs.
- End with 1 short motivational sentence.`
}

// ─── AI 호출 (Anthropic → Gemini 폴백) ──────────────────────────────────────

async function callAI(system: string, messages: ChatMessage[]): Promise<string> {
  // 1) Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      })
      return msg.content[0].type === 'text' ? msg.content[0].text : ''
    } catch (err) {
      const isCredit =
        err instanceof Anthropic.APIError &&
        (err.status === 402 || err.status === 401 ||
          (err.status === 400 && err.message?.includes('credit balance')))
      if (!isCredit) throw err
      console.warn('[coach] Anthropic 크레딧 부족 → Gemini 폴백')
    }
  }

  // 2) Gemini 폴백
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('AI 서비스를 사용할 수 없습니다. API 키를 확인해주세요.')
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: system,
    generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
  })

  // Gemini multi-turn
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const chat = model.startChat({ history })
  const lastMsg = messages[messages.length - 1].content
  const result = await chat.sendMessage(lastMsg)
  return result.response.text()
}

// ─── POST /api/coach ─────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { messages } = await req.json() as { messages: ChatMessage[] }
    if (!messages?.length) {
      return NextResponse.json({ error: '메시지가 없습니다' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    // ── 유저 컨텍스트 병렬 조회 ──────────────────────────────────────────────
    const [profileRes, bodyRes, mealsRes, workoutsRes, routineRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('display_name, gender, age, height_cm, current_weight_kg, activity_level, goal, target_calories, target_protein_g, target_carbs_g, target_fat_g')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('body_stats')
        .select('weight_kg, body_fat_pct')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('meals')
        .select('meal_items(calories, protein_g, carbs_g, fat_g)')
        .eq('user_id', user.id)
        .gte('eaten_at', `${today}T00:00:00`)
        .lte('eaten_at', `${today}T23:59:59`),
      supabase
        .from('workouts')
        .select('started_at, workout_exercises(exercises(name, muscle_group))')
        .eq('user_id', user.id)
        .gte('started_at', threeDaysAgo.toISOString())
        .not('finished_at', 'is', null),
      supabase
        .from('ai_routines')
        .select('routine_data')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(),
    ])

    const profile = profileRes.data
    const body = bodyRes.data
    const meals = mealsRes.data ?? []

    // ── 오늘 섭취 매크로 집계 ────────────────────────────────────────────────
    let cKcal = 0, cP = 0, cC = 0, cF = 0
    for (const meal of meals) {
      const items = (meal.meal_items as { calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }[]) ?? []
      for (const item of items) {
        cKcal += item.calories ?? 0
        cP    += item.protein_g ?? 0
        cC    += item.carbs_g ?? 0
        cF    += item.fat_g ?? 0
      }
    }

    // ── 최근 3일 운동 요약 ────────────────────────────────────────────────────
    type WEx = { exercises: { name: string; muscle_group: string } | null }
    type WRaw = { started_at: string; workout_exercises: WEx[] }
    const workouts = (workoutsRes.data ?? []) as unknown as WRaw[]

    const workoutSummary = workouts
      .map(w => {
        const date = new Date(w.started_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })
        const exercises = w.workout_exercises
          .map(ex => ex.exercises?.name)
          .filter(Boolean)
          .join(', ') || '기록 없음'
        return `${date}: ${exercises}`
      })
      .join(' | ')

    // ── TDEE 계산 ─────────────────────────────────────────────────────────────
    const weight = body?.weight_kg ?? profile?.current_weight_kg ?? null
    const fat = body?.body_fat_pct ?? null
    let tdee: number | null = null

    if (profile?.height_cm && weight && profile?.age &&
        (profile?.gender === '남성' || profile?.gender === '여성')) {
      const actMap: Record<string, ActivityLevel> = {
        sedentary: 'sedentary', moderate: 'moderate',
        active: 'active', very_active: 'very_active',
      }
      const act: ActivityLevel = actMap[profile.activity_level ?? 'moderate'] ?? 'moderate'
      tdee = calcTDEE(profile.gender as Gender, weight, profile.height_cm, profile.age, act).tdee
    }

    // ── 목표 매크로 (루틴 > 프로필) ──────────────────────────────────────────
    const routine = routineRes.data?.routine_data as { summary?: { target_calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number } } | null
    const gKcal = routine?.summary?.target_calories ?? profile?.target_calories ?? null
    const gP    = routine?.summary?.protein_g ?? profile?.target_protein_g ?? null
    const gC    = routine?.summary?.carbs_g   ?? profile?.target_carbs_g   ?? null
    const gF    = routine?.summary?.fat_g     ?? profile?.target_fat_g     ?? null

    // ── 시스템 프롬프트 빌드 ─────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt({
      name: profile?.display_name ?? '회원',
      goal: profile?.goal ?? '미설정',
      gender: profile?.gender ?? '미입력',
      age: profile?.age ?? null,
      height: profile?.height_cm ?? null,
      weight,
      fat,
      tdee,
      carbStatus: '미설정',
      gKcal, gP, gC, gF,
      cKcal: Math.round(cKcal),
      cP: Math.round(cP),
      cC: Math.round(cC),
      cF: Math.round(cF),
      recentWorkouts: workoutSummary,
    })

    // ── AI 호출 ──────────────────────────────────────────────────────────────
    const reply = await callAI(systemPrompt, messages)
    return NextResponse.json({ reply })

  } catch (error) {
    console.error('[coach] 오류:', error)
    const msg = error instanceof Error ? error.message : '서버 오류가 발생했습니다'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
