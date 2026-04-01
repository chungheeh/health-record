import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeImageWithText } from '@/lib/utils/ai-client'

const FOOD_ANALYSIS_PROMPT = `이 음식 사진을 분석해서 영양소 정보를 JSON으로 알려주세요.

여러 음식이 있으면 전체를 하나의 식사로 합산하거나, 가장 주된 음식 기준으로 답해주세요.

반드시 아래 JSON 형식으로만 응답하고, 다른 텍스트는 절대 포함하지 마세요:

{
  "food_name": "음식 이름 (한국어, 구체적으로)",
  "amount_g": 예상 양(그램, 숫자만),
  "calories_per_100g": 100g당 칼로리(숫자만),
  "protein_per_100g": 100g당 단백질g(숫자만),
  "carbs_per_100g": 100g당 탄수화물g(숫자만),
  "fat_per_100g": 100g당 지방g(숫자만),
  "confidence": "high" 또는 "medium" 또는 "low"
}

음식을 정확히 인식하기 어려우면 confidence를 "low"로 하고 최대한 추정해주세요.`

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('image') as File | null
    if (!file) return NextResponse.json({ error: '이미지 없음' }, { status: 400 })

    // 파일을 base64로 변환
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    // AI 분석 (Anthropic → Gemini 자동 폴백)
    const { text, provider } = await analyzeImageWithText(base64, mimeType, FOOD_ANALYSIS_PROMPT)
    console.log(`[analyze-food-photo] provider: ${provider}`)

    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI 응답 파싱 실패')

    const result = JSON.parse(match[0])
    return NextResponse.json({ ...result, provider })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[analyze-food-photo]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
