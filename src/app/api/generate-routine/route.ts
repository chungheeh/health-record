import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface UserProfile {
  goal: string
  gender: string
  age: number
  heightCm: number
  currentWeight: number
  targetWeight: number
  activityLevel: string
  workoutDays: number
  equipment: string[]
  dietaryRestrictions: string[]
}

function buildPrompt(profile: UserProfile): string {
  return `당신은 스포츠과학, 영양학, 운동생리학 전문가입니다.
아래 사용자 프로필을 바탕으로 과학적 근거에 기반한 맞춤 운동 + 식단 플랜을 JSON으로 생성해주세요.

## 사용자 프로필
- 목표: ${profile.goal}
- 성별: ${profile.gender ?? '미입력'}, 나이: ${profile.age ?? '미입력'}세
- 키: ${profile.heightCm ?? '미입력'}cm, 현재 체중: ${profile.currentWeight ?? '미입력'}kg
- 목표 체중: ${profile.targetWeight ?? '미입력'}kg
- 활동량: ${profile.activityLevel ?? '보통'}
- 주 운동 횟수: ${profile.workoutDays ?? 3}일
- 사용 가능 기구: ${profile.equipment?.join(', ') || '맨몸'}
- 식이 제한: ${profile.dietaryRestrictions?.join(', ') || '없음'}

## 생성 기준 (반드시 준수)
- 목표에 맞는 분할법 선택 (다이어트 → 상하체 + 유산소 병행)
- 세트수/반복수 구체적으로 명시, 점진적 과부하 원칙 적용
- Harris-Benedict + 활동계수로 TDEE 계산
- 다이어트: TDEE - 400kcal / 벌크업: TDEE + 250kcal / 유지: TDEE
- 단백질: 체중 1kg당 1.8~2.2g, 한국인 식단 기반

## 응답 형식 (순수 JSON만 출력, 마크다운 코드블록 금지)
아래 스키마를 정확히 따르세요:

{
  "summary": {
    "goal": "다이어트",
    "tdee": 2300,
    "target_calories": 1800,
    "protein_g": 160,
    "carbs_g": 180,
    "fat_g": 50
  },
  "schedule": [
    {
      "day": 1,
      "day_name": "월요일",
      "focus": "상체 (가슴/삼두)",
      "exercises": [
        {
          "name": "벤치프레스",
          "sets": 4,
          "reps": "8-10",
          "rest_sec": 120,
          "notes": "가슴 중앙 집중"
        }
      ]
    }
  ],
  "rest_days": [3, 6, 7],
  "notes": "매주 볼륨 5-10% 증가. 충분한 수면(7-9시간) 권장."
}`
}

export async function POST(req: Request) {
  try {
    // 1. 인증 확인
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 2. 프로필 파싱
    const { profile } = await req.json() as { profile: UserProfile }
    if (!profile) {
      return NextResponse.json({ error: '프로필 데이터가 없습니다' }, { status: 400 })
    }

    // 3. Claude API 호출
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: buildPrompt(profile),
      }],
    })

    // 4. JSON 추출 (마크다운 펜스 방어)
    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 응답 파싱 실패' }, { status: 500 })
    }
    const routine = JSON.parse(jsonMatch[0])

    // 5. 기존 활성 루틴 비활성화
    await supabase
      .from('ai_routines')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true)

    // 6. 새 루틴 저장
    const { data: savedRoutine, error: saveError } = await supabase
      .from('ai_routines')
      .insert({
        user_id: user.id,
        goal: profile.goal,
        routine_data: routine,
        is_active: true,
      })
      .select()
      .single()

    if (saveError) {
      console.error('루틴 저장 오류:', saveError)
      return NextResponse.json({ error: '루틴 저장 실패' }, { status: 500 })
    }

    return NextResponse.json({ routine, id: savedRoutine.id })
  } catch (error) {
    console.error('루틴 생성 오류:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '서버 오류' },
      { status: 500 }
    )
  }
}
