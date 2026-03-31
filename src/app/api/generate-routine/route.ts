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
- 성별: ${profile.gender}, 나이: ${profile.age}세
- 키: ${profile.heightCm}cm, 현재 체중: ${profile.currentWeight}kg
- 목표 체중: ${profile.targetWeight}kg
- 활동량: ${profile.activityLevel}
- 주 운동 횟수: ${profile.workoutDays}일
- 사용 가능 기구: ${profile.equipment?.join(', ') || '맨몸'}
- 식이 제한: ${profile.dietaryRestrictions?.join(', ') || '없음'}

## 생성 기준 (반드시 준수)

### 운동
- 목표에 맞는 분할법 선택 (다이어트 → 상하체 + 유산소 병행)
- 세트수/반복수/강도(RPE) 구체적으로 명시
- 점진적 과부하 원칙 적용
- 근피로 회복 고려한 요일 배치

### 식단
- Harris-Benedict + 활동계수로 TDEE 계산
- 다이어트: TDEE - 300~500kcal / 벌크업: TDEE + 200~300kcal
- 단백질: 체중 1kg당 1.6~2.2g
- 탄수화물: 운동 전후 집중 배치
- 지방: 총 칼로리 20~30%
- 한국인 식단 기반 현실적 식품 사용

## 응답 형식 (순수 JSON만 출력, 마크다운 코드블록 금지)

{
  "tdee": 2300,
  "daily_calories": 1800,
  "macros": { "protein_g": 160, "carbs_g": 180, "fat_g": 50 },
  "macro_rationale": "계산 근거 설명",
  "weekly_schedule": [
    {
      "day": 1,
      "day_name": "월요일",
      "workout_type": "상체 (가슴/삼두)",
      "exercises": [
        {
          "name": "벤치프레스",
          "muscle_group": "가슴",
          "sets": 4,
          "reps": "8-10",
          "intensity": "RPE 7-8",
          "rest_seconds": 120,
          "notes": "가슴 중앙 집중"
        }
      ],
      "cardio": {
        "type": "LISS",
        "duration_minutes": 20,
        "notes": "심박수 120-130bpm 유지"
      },
      "meal_plan": {
        "breakfast": { "foods": ["닭가슴살 100g", "현미밥 150g"], "calories": 450 },
        "lunch": { "foods": ["돼지 안심 150g", "고구마 200g"], "calories": 520 },
        "pre_workout": { "foods": ["바나나 1개", "단백질 쉐이크"], "calories": 250 },
        "dinner": { "foods": ["연어 150g", "현미밥 100g"], "calories": 480 }
      }
    }
  ],
  "weekly_progression": "매주 볼륨 5-10% 증가. 3주 후 디로드.",
  "important_notes": ["충분한 수면(7-9시간)", "운동 전후 30분 내 단백질 섭취"]
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
