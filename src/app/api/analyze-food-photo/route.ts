import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeImageWithText } from '@/lib/utils/ai-client'

/**
 * Step 1: 이미지에서 제품/음식명 추출 프롬프트
 * 제품명을 정확히 파악해서 DB 검색에 활용
 */
const IDENTIFY_PROMPT = `이 이미지를 보고 음식 또는 제품명을 파악해주세요.

반드시 아래 JSON 형식으로만 응답하고, 다른 텍스트는 절대 포함하지 마세요:

{
  "product_name": "정확한 제품명 또는 음식명 (한국어, 브랜드명 포함시 포함)",
  "search_keywords": ["검색어1", "검색어2", "검색어3"],
  "category": "음식 종류 (예: 라면, 음료, 과자, 한식, 패스트푸드 등)",
  "estimated_amount_g": 예상 섭취량(그램, 숫자만),
  "confidence": "high" 또는 "medium" 또는 "low"
}

예시:
- 신라면 봉지 사진 → product_name: "신라면", search_keywords: ["신라면", "라면", "농심"]
- 닭가슴살 사진 → product_name: "닭가슴살 (삶은것)", search_keywords: ["닭가슴살", "닭", "단백질"]
- 빅맥 사진 → product_name: "맥도날드 빅맥", search_keywords: ["빅맥", "맥도날드", "버거"]`

/**
 * Step 2: DB에서 못 찾았을 때 AI가 직접 영양정보 추정
 */
function buildNutritionEstimatePrompt(productName: string, amountG: number): string {
  return `"${productName}" (약 ${amountG}g)의 영양성분을 추정해주세요.

반드시 아래 JSON 형식으로만 응답하고, 다른 텍스트는 절대 포함하지 마세요:

{
  "food_name": "${productName}",
  "amount_g": ${amountG},
  "calories_per_100g": 100g당 칼로리(숫자만),
  "protein_per_100g": 100g당 단백질g(숫자만),
  "carbs_per_100g": 100g당 탄수화물g(숫자만),
  "fat_per_100g": 100g당 지방g(숫자만),
  "confidence": "medium"
}`
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('image') as File | null
    if (!file) return NextResponse.json({ error: '이미지 없음' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    // ── Step 1: 이미지에서 제품명 파악 ──────────────────────────────────────
    const { text: identifyText, provider } = await analyzeImageWithText(base64, mimeType, IDENTIFY_PROMPT)
    console.log(`[analyze-food-photo] identify provider: ${provider}, raw: ${identifyText.slice(0, 200)}`)

    const identifyMatch = identifyText.match(/\{[\s\S]*\}/)
    if (!identifyMatch) throw new Error('제품 인식에 실패했습니다. 다시 시도해주세요.')

    const identified = JSON.parse(identifyMatch[0]) as {
      product_name: string
      search_keywords: string[]
      category: string
      estimated_amount_g: number
      confidence: string
    }

    const { product_name, search_keywords = [], estimated_amount_g = 100 } = identified

    // ── Step 2: Supabase foods DB에서 검색 ───────────────────────────────────
    let dbFood: {
      name: string
      brand: string | null
      calories_per_100g: number
      protein_per_100g: number
      carbs_per_100g: number
      fat_per_100g: number
      serving_size_g: number | null
    } | null = null

    // 제품명 + 키워드로 순차 검색 (가장 정확한 매치 우선)
    const searchTerms = [product_name, ...search_keywords].slice(0, 4)

    for (const term of searchTerms) {
      if (!term || dbFood) break
      const { data } = await supabase
        .from('foods')
        .select('name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_size_g')
        .ilike('name', `%${term}%`)
        .order('name')
        .limit(1)
        .maybeSingle()

      if (data) { dbFood = data; break }

      // 브랜드 검색도 시도
      const { data: brandData } = await supabase
        .from('foods')
        .select('name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_size_g')
        .ilike('brand', `%${term}%`)
        .order('name')
        .limit(1)
        .maybeSingle()

      if (brandData) { dbFood = brandData; break }
    }

    // ── Step 3: DB에서 찾았으면 DB 데이터 사용, 없으면 AI 추정 ──────────────
    if (dbFood) {
      console.log(`[analyze-food-photo] DB 매칭 성공: ${dbFood.name}`)
      const amountG = dbFood.serving_size_g ?? estimated_amount_g
      return NextResponse.json({
        food_name: dbFood.brand ? `${dbFood.brand} ${dbFood.name}` : dbFood.name,
        amount_g: amountG,
        calories_per_100g: dbFood.calories_per_100g,
        protein_per_100g: dbFood.protein_per_100g,
        carbs_per_100g: dbFood.carbs_per_100g,
        fat_per_100g: dbFood.fat_per_100g,
        confidence: 'high',
        source: 'db',
        provider,
      })
    }

    // DB 미매칭 → AI가 영양정보 직접 추정
    console.log(`[analyze-food-photo] DB 미매칭 → AI 추정: ${product_name}`)
    const { text: nutritionText } = await analyzeImageWithText(
      base64,
      mimeType,
      buildNutritionEstimatePrompt(product_name, estimated_amount_g)
    )

    const nutritionMatch = nutritionText.match(/\{[\s\S]*\}/)
    if (!nutritionMatch) throw new Error('영양 정보 분석에 실패했습니다.')

    const nutrition = JSON.parse(nutritionMatch[0])
    return NextResponse.json({ ...nutrition, source: 'ai', provider })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[analyze-food-photo]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
