import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeImageWithText, generateText } from '@/lib/utils/ai-client'

const IDENTIFY_PROMPT = `이 이미지를 보고 음식 또는 제품명을 파악해주세요.

반드시 아래 JSON 형식으로만 응답하세요:

{
  "product_name": "정확한 제품명 또는 음식명 (한국어, 브랜드명 포함시 포함)",
  "search_keywords": ["검색어1", "검색어2", "검색어3"],
  "category": "음식 종류 (예: 라면, 음료, 과자, 한식, 패스트푸드 등)",
  "estimated_amount_g": 100,
  "confidence": "high"
}

예시:
- 신라면 봉지 → product_name: "신라면", search_keywords: ["신라면", "라면", "농심"]
- 닭가슴살 → product_name: "닭가슴살 (삶은것)", search_keywords: ["닭가슴살", "닭"]
- 빅맥 → product_name: "맥도날드 빅맥", search_keywords: ["빅맥", "맥도날드", "버거"]`

function buildNutritionPrompt(productName: string, amountG: number): string {
  return `"${productName}" ${amountG}g의 영양성분을 추정해주세요.
반드시 아래 JSON 형식으로만 응답하세요 (숫자값만, 설명 없이):
{
  "food_name": "${productName}",
  "amount_g": ${amountG},
  "calories_per_100g": 165,
  "protein_per_100g": 31,
  "carbs_per_100g": 0,
  "fat_per_100g": 3.6
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
    let identified: {
      product_name: string
      search_keywords: string[]
      category: string
      estimated_amount_g: number
      confidence: string
    }

    try {
      const { text: identifyText, provider } = await analyzeImageWithText(base64, mimeType, IDENTIFY_PROMPT)
      console.log(`[analyze-food-photo] identify provider: ${provider}, raw: ${identifyText.slice(0, 200)}`)
      identified = JSON.parse(identifyText)
    } catch {
      throw new Error('제품 인식에 실패했습니다. 다시 시도해주세요.')
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

      const { data: brandData } = await supabase
        .from('foods')
        .select('name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_size_g')
        .ilike('brand', `%${term}%`)
        .order('name')
        .limit(1)
        .maybeSingle()
      if (brandData) { dbFood = brandData; break }
    }

    // ── Step 3: DB 매칭 시 반환 ───────────────────────────────────────────────
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
      })
    }

    // ── Step 4: DB 미매칭 → generateText로 영양정보 추정 (이미지 재전송 없음) ──
    console.log(`[analyze-food-photo] DB 미매칭 → AI 추정: ${product_name}`)
    let nutrition: {
      food_name: string
      amount_g: number
      calories_per_100g: number
      protein_per_100g: number
      carbs_per_100g: number
      fat_per_100g: number
    }

    try {
      const { text: nutritionText } = await generateText(buildNutritionPrompt(product_name, estimated_amount_g))
      nutrition = JSON.parse(nutritionText)
    } catch {
      throw new Error('영양정보 분석에 실패했습니다. 다시 시도해주세요.')
    }

    // ── Step 5: 분석 결과 foods 테이블에 캐싱 (다음 검색 시 활용) ───────────────
    void supabase.from('foods').upsert({
      name: nutrition.food_name,
      brand: null,
      category: identified.category ?? null,
      calories_per_100g: nutrition.calories_per_100g,
      protein_per_100g: nutrition.protein_per_100g,
      carbs_per_100g: nutrition.carbs_per_100g,
      fat_per_100g: nutrition.fat_per_100g,
      serving_size_g: nutrition.amount_g,
      serving_unit: 'g',
    }, { onConflict: 'name,brand', ignoreDuplicates: true })

    return NextResponse.json({ ...nutrition, confidence: 'medium', source: 'ai' })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[analyze-food-photo]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
