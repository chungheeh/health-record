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
- 닥터유 단백질바 → product_name: "닥터유 프로틴바", search_keywords: ["닥터유", "프로틴바", "단백질바", "오리온"]
- 신라면 봉지 → product_name: "신라면", search_keywords: ["신라면", "라면", "농심"]
- 닭가슴살 → product_name: "닭가슴살 (삶은것)", search_keywords: ["닭가슴살", "닭"]
- 빅맥 → product_name: "맥도날드 빅맥", search_keywords: ["빅맥", "맥도날드", "버거"]`

interface ApiRow {
  FOOD_CD: string
  FOOD_NM_KR: string
  MAKER_NM: string | null
  FOOD_CAT1_NM: string | null
  AMT_NUM1: string
  AMT_NUM3: string
  AMT_NUM4: string
  AMT_NUM6: string
  SERVING_SIZE: string
}

function buildNutritionPrompt(productName: string, amountG: number): string {
  return `"${productName}" ${amountG}g의 정확한 영양성분을 알려주세요.
실제 제품이라면 실제 영양성분표 기준으로, 일반 음식이라면 표준 영양 데이터 기준으로 응답하세요.
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

async function searchGovApi(keyword: string): Promise<{
  name: string; brand: string | null; calories_per_100g: number;
  protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number; serving_size_g: number;
} | null> {
  const apiKey = process.env.FOOD_SAFETY_API_KEY
  if (!apiKey) return null
  try {
    const encoded = encodeURIComponent(keyword)
    const url = `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02?serviceKey=${encodeURIComponent(apiKey)}&pageNo=1&numOfRows=5&type=json&FOOD_NM_KR=${encoded}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    const rows: ApiRow[] = json?.body?.items ?? []
    if (rows.length === 0) return null
    const row = rows[0]
    return {
      name: row.FOOD_NM_KR,
      brand: row.MAKER_NM || null,
      calories_per_100g: parseFloat(row.AMT_NUM1) || 0,
      protein_per_100g: parseFloat(row.AMT_NUM3) || 0,
      fat_per_100g: parseFloat(row.AMT_NUM4) || 0,
      carbs_per_100g: parseFloat(row.AMT_NUM6) || 0,
      serving_size_g: parseFloat(row.SERVING_SIZE) || 100,
    }
  } catch {
    return null
  }
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
    const searchTerms = [product_name, ...search_keywords].filter(Boolean).slice(0, 5)

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

    for (const term of searchTerms) {
      if (dbFood) break
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

    if (dbFood) {
      console.log(`[analyze-food-photo] DB 매칭: ${dbFood.name}`)
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

    // ── Step 3: 정부 식품영양성분 API 검색 ──────────────────────────────────
    let apiFood: Awaited<ReturnType<typeof searchGovApi>> = null

    for (const term of searchTerms) {
      if (apiFood) break
      apiFood = await searchGovApi(term)
    }

    if (apiFood) {
      console.log(`[analyze-food-photo] 정부API 매칭: ${apiFood.name}`)
      // DB에 캐시
      void supabase.from('foods').upsert({
        name: apiFood.name,
        brand: apiFood.brand,
        category: identified.category ?? null,
        calories_per_100g: apiFood.calories_per_100g,
        protein_per_100g: apiFood.protein_per_100g,
        carbs_per_100g: apiFood.carbs_per_100g,
        fat_per_100g: apiFood.fat_per_100g,
        serving_size_g: apiFood.serving_size_g,
        serving_unit: 'g',
      }, { onConflict: 'name,brand', ignoreDuplicates: true })

      return NextResponse.json({
        food_name: apiFood.brand ? `${apiFood.brand} ${apiFood.name}` : apiFood.name,
        amount_g: apiFood.serving_size_g,
        calories_per_100g: apiFood.calories_per_100g,
        protein_per_100g: apiFood.protein_per_100g,
        carbs_per_100g: apiFood.carbs_per_100g,
        fat_per_100g: apiFood.fat_per_100g,
        confidence: 'high',
        source: 'gov_api',
      })
    }

    // ── Step 4: DB·API 모두 없음 → AI 영양정보 추정 ─────────────────────────
    console.log(`[analyze-food-photo] AI 추정: ${product_name}`)
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

    // AI 결과도 DB에 캐시
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
