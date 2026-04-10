import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateText } from '@/lib/utils/ai-client'
import { getDailyMacroTarget, calcDaysLeft, calcMacrosFromTarget } from '@/lib/utils/periodization'

interface RequestBody {
  title: string
  target_date: string        // YYYY-MM-DD
  start_date?: string        // 기본: 오늘
  weight_kg?: number
}

function buildPlanPrompt(params: {
  title: string
  daysLeft: number
  phaseName: string
  targetCalories: number
  carbMultiplier: number
  weight: number
  tdee: number
}): string {
  return `당신은 20년 경력의 보디빌딩 코치입니다.
아래 정보를 바탕으로 D-Day 플랜의 초기 매크로 목표를 JSON으로 산출해주세요.

## 사용자 정보
- 목표 이벤트: ${params.title}
- D-Day까지: ${params.daysLeft}일
- 현재 페이즈: ${params.phaseName}
- 체중: ${params.weight}kg
- TDEE: ${params.tdee}kcal
- 페이즈 권장 칼로리: ${params.targetCalories}kcal
- 탄수화물 멀티플라이어: ${params.carbMultiplier}

## 응답 형식 (순수 JSON만, 마크다운 금지)
{
  "goal": "다이어트",
  "target_calories": ${params.targetCalories},
  "protein_g": ${Math.round(params.weight * 2.2)},
  "carbs_g": 150,
  "fat_g": 55,
  "phase_advice": "현재 페이즈에 맞는 핵심 조언 2문장 이내"
}`
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body: RequestBody = await req.json()
    const { title, target_date, weight_kg } = body
    if (!title || !target_date) {
      return NextResponse.json({ error: 'title, target_date 필수' }, { status: 400 })
    }

    const start_date = body.start_date ?? new Date().toISOString().split('T')[0]

    // ── 프로필 조회 (TDEE 계산용) ─────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('current_weight_kg, target_calories, activity_level, gender, age, height_cm')
      .eq('user_id', user.id)
      .maybeSingle()

    const weight = weight_kg ?? profile?.current_weight_kg ?? 70
    const tdee = profile?.target_calories ?? 2200

    // ── 페이즈 산출 ───────────────────────────────────────────────────────────
    const daysLeft = calcDaysLeft(target_date)
    const phase = getDailyMacroTarget(tdee, daysLeft)

    // ── AI 매크로 생성 ────────────────────────────────────────────────────────
    let aiMacros: {
      goal: string
      target_calories: number
      protein_g: number
      carbs_g: number
      fat_g: number
      phase_advice: string
    }

    try {
      const { text } = await generateText(buildPlanPrompt({
        title, daysLeft,
        phaseName: phase.phaseName,
        targetCalories: phase.targetCalories,
        carbMultiplier: phase.currentCarbMultiplier,
        weight, tdee,
      }))
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON 없음')
      aiMacros = JSON.parse(jsonMatch[0])
    } catch {
      // AI 실패 시 periodization 계산값 사용
      const fallback = calcMacrosFromTarget(phase.targetCalories, weight, phase.currentCarbMultiplier)
      aiMacros = {
        goal: '다이어트',
        target_calories: phase.targetCalories,
        ...fallback,
        phase_advice: phase.phaseHint,
      }
    }

    // ── 기존 활성 이벤트 비활성화 ─────────────────────────────────────────────
    await supabase
      .from('target_events')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true)

    // ── target_events INSERT ──────────────────────────────────────────────────
    const { data: event, error: eventErr } = await supabase
      .from('target_events')
      .insert({
        user_id: user.id,
        title,
        start_date,
        target_date,
        is_active: true,
      })
      .select()
      .single()

    if (eventErr) {
      console.error('[generate-dday-plan] event insert 오류:', eventErr)
      return NextResponse.json({ error: '이벤트 저장 실패' }, { status: 500 })
    }

    // ── user_profiles UPDATE (칼로리·매크로 목표 덮어쓰기) ────────────────────
    await supabase
      .from('user_profiles')
      .update({
        goal: aiMacros.goal,
        target_calories: aiMacros.target_calories,
        target_protein_g: aiMacros.protein_g,
        target_carbs_g: aiMacros.carbs_g,
        target_fat_g: aiMacros.fat_g,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    return NextResponse.json({
      event,
      macros: aiMacros,
      phase: {
        name: phase.phaseName,
        key: phase.phaseKey,
        daysLeft,
        carbMultiplier: phase.currentCarbMultiplier,
        color: phase.phaseColor,
        hint: phase.phaseHint,
      },
    })
  } catch (err) {
    console.error('[generate-dday-plan]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '서버 오류' },
      { status: 500 },
    )
  }
}
