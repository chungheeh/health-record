import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeImageWithText, generateText } from '@/lib/utils/ai-client'

// ─── 프롬프트 ────────────────────────────────────────────────────────────────

const IDENTIFY_PROMPT = `이 이미지를 보고 음식 또는 제품을 분석해주세요.

중요: 패키지/라벨에 보이는 모든 텍스트(브랜드명, 제품명, 부제목 등)를 정확히 읽어서 ocr_text에 담아주세요.

반드시 아래 JSON 형식으로만 응답하세요:

{
  "product_name": "정확한 제품명 또는 음식명 (한국어, 브랜드명 포함)",
  "ocr_text": "라벨/패키지에서 읽은 모든 텍스트 원문 (예: Pocari Sweat 포카리스웨트 이온음료)",
  "search_keywords": ["검색어1", "검색어2", "검색어3"],
  "category": "음식 종류 (예: 라면, 음료, 과자, 한식, 패스트푸드 등)",
  "estimated_amount_g": 100,
  "vision_confidence": 0.85
}

vision_confidence: 0.0~1.0, 제품을 얼마나 확신하는지 (텍스트가 명확하게 보이면 높게)

예시:
- 포카리스웨트 캔 → ocr_text: "Pocari Sweat 포카리스웨트 이온음료 240ml", vision_confidence: 0.95
- 흐린 음식 사진 → ocr_text: "", vision_confidence: 0.45`

// ─── 퍼지 매칭 유틸 ──────────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

function fuzzyRatio(a: string, b: string): number {
  a = a.toLowerCase().trim()
  b = b.toLowerCase().trim()
  if (!a || !b) return 0
  const maxLen = Math.max(a.length, b.length)
  return 1 - levenshtein(a, b) / maxLen
}

// 단어 순서 무관 비교 (예: "스웨트 포카리" vs "포카리 스웨트")
function tokenSortRatio(a: string, b: string): number {
  const sort = (s: string) => s.toLowerCase().split(/\s+/).sort().join(' ')
  return fuzzyRatio(sort(a), sort(b))
}

function bestFuzzyScore(a: string, b: string): number {
  return Math.max(fuzzyRatio(a, b), tokenSortRatio(a, b))
}

// OCR 텍스트에서 키워드와 가장 잘 맞는 단어 점수
function ocrScore(ocrText: string, keyword: string): number {
  if (!ocrText || !keyword) return 0
  const normalized = ocrText.toLowerCase()
  const kw = keyword.toLowerCase()
  if (normalized.includes(kw)) return 1.0
  const words = normalized.split(/[\s,.()\-]+/).filter(Boolean)
  return Math.max(0, ...words.map(w => fuzzyRatio(w, kw)))
}

/**
 * 하이브리드 점수
 * - visionConfidence < 0.6 → OCR 가중치 70%
 * - OCR 점수 > 0.8 → OCR 결과로 오버라이드
 * - 그 외 → vision 60% + OCR 40%
 */
function hybridScore(
  candidate: string,
  visionKeywords: string[],
  ocr: string,
  visionConfidence: number
): number {
  const vScore = Math.max(0, ...visionKeywords.map(kw => bestFuzzyScore(candidate, kw)))
  const oScore = Math.max(0, ...visionKeywords.map(kw => ocrScore(ocr, kw)), ocrScore(ocr, candidate))

  if (oScore > 0.8) return oScore   // OCR 강한 매칭 → 오버라이드

  const ocrWeight = visionConfidence < 0.6 ? 0.7 : 0.4
  return vScore * (1 - ocrWeight) + oScore * ocrWeight
}

// ─── 정부 API ────────────────────────────────────────────────────────────────

interface ApiRow {
  FOOD_CD: string; FOOD_NM_KR: string; MAKER_NM: string | null
  FOOD_CAT1_NM: string | null; AMT_NUM1: string; AMT_NUM3: string
  AMT_NUM4: string; AMT_NUM6: string; SERVING_SIZE: string
}

type FoodResult = {
  name: string; brand: string | null; calories_per_100g: number
  protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number
  serving_size_g: number
}

async function searchGovApi(keyword: string): Promise<FoodResult | null> {
  const apiKey = process.env.FOOD_SAFETY_API_KEY
  if (!apiKey) return null
  try {
    const url = `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02?serviceKey=${encodeURIComponent(apiKey)}&pageNo=1&numOfRows=5&type=json&FOOD_NM_KR=${encodeURIComponent(keyword)}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    const rows: ApiRow[] = json?.body?.items ?? []
    if (!rows.length) return null
    const row = rows[0]
    return {
      name: row.FOOD_NM_KR, brand: row.MAKER_NM || null,
      calories_per_100g: parseFloat(row.AMT_NUM1) || 0,
      protein_per_100g:  parseFloat(row.AMT_NUM3) || 0,
      fat_per_100g:      parseFloat(row.AMT_NUM4) || 0,
      carbs_per_100g:    parseFloat(row.AMT_NUM6) || 0,
      serving_size_g:    parseFloat(row.SERVING_SIZE) || 100,
    }
  } catch { return null }
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

// ─── POST /api/analyze-food-photo ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('image') as File | null
    if (!file) return NextResponse.json({ error: '이미지 없음' }, { status: 400 })

    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    // ── Step 1: 비전 AI — 제품명 + OCR 텍스트 + 신뢰도 ──────────────────────
    let identified: {
      product_name: string
      ocr_text: string
      search_keywords: string[]
      category: string
      estimated_amount_g: number
      vision_confidence: number
    }

    try {
      const { text, provider } = await analyzeImageWithText(base64, mimeType, IDENTIFY_PROMPT)
      console.log(`[analyze-food-photo] provider: ${provider}, raw: ${text.slice(0, 300)}`)
      identified = JSON.parse(text)
    } catch {
      throw new Error('제품 인식에 실패했습니다. 다시 시도해주세요.')
    }

    const {
      product_name,
      ocr_text = '',
      search_keywords = [],
      estimated_amount_g = 100,
      vision_confidence = 0.5,
    } = identified

    const searchTerms = [product_name, ...search_keywords].filter(Boolean).slice(0, 5)

    console.log(`[analyze-food-photo] product: ${product_name}, ocr: "${ocr_text}", confidence: ${vision_confidence}`)

    // ── Step 2: Supabase DB 퍼지 매칭 ────────────────────────────────────────
    // 각 검색어로 후보 최대 5개씩 가져온 후 하이브리드 점수로 랭킹
    const SCORE_THRESHOLD = 0.55

    type DbRow = {
      name: string; brand: string | null; calories_per_100g: number
      protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number
      serving_size_g: number | null
    }

    const candidateMap = new Map<string, DbRow>()

    for (const term of searchTerms) {
      const { data: rows } = await supabase
        .from('foods')
        .select('name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_size_g')
        .or(`name.ilike.%${term}%,brand.ilike.%${term}%`)
        .limit(5)
      for (const row of rows ?? []) {
        const key = `${row.brand ?? ''}|${row.name}`
        if (!candidateMap.has(key)) candidateMap.set(key, row as DbRow)
      }
    }

    let bestDbFood: DbRow | null = null
    let bestDbScore = 0

    for (const candidate of Array.from(candidateMap.values())) {
      const label = candidate.brand ? `${candidate.brand} ${candidate.name}` : candidate.name
      const score = hybridScore(label, searchTerms, ocr_text, vision_confidence)
      console.log(`[analyze-food-photo] DB후보 "${label}" → score: ${score.toFixed(2)}`)
      if (score > bestDbScore) { bestDbScore = score; bestDbFood = candidate }
    }

    if (bestDbFood && bestDbScore >= SCORE_THRESHOLD) {
      console.log(`[analyze-food-photo] DB 매칭: ${bestDbFood.name} (score: ${bestDbScore.toFixed(2)})`)
      const amountG = bestDbFood.serving_size_g ?? estimated_amount_g
      return NextResponse.json({
        food_name: bestDbFood.brand ? `${bestDbFood.brand} ${bestDbFood.name}` : bestDbFood.name,
        amount_g: amountG,
        calories_per_100g: bestDbFood.calories_per_100g,
        protein_per_100g: bestDbFood.protein_per_100g,
        carbs_per_100g: bestDbFood.carbs_per_100g,
        fat_per_100g: bestDbFood.fat_per_100g,
        confidence: bestDbScore > 0.8 ? 'high' : 'medium',
        source: 'db',
        match_score: bestDbScore,
      })
    }

    // ── Step 3: 정부 식품영양성분 API ────────────────────────────────────────
    // OCR 텍스트 → 검색어 우선순위 결정
    const govSearchTerms = vision_confidence < 0.6 && ocr_text
      ? [ocr_text.split(' ')[0], ...searchTerms]  // OCR 첫 단어 우선
      : searchTerms

    let apiFood: FoodResult | null = null
    for (const term of govSearchTerms) {
      apiFood = await searchGovApi(term)
      if (apiFood) break
    }

    if (apiFood) {
      console.log(`[analyze-food-photo] 정부API 매칭: ${apiFood.name}`)
      void supabase.from('foods').upsert({
        name: apiFood.name, brand: apiFood.brand,
        category: identified.category ?? null,
        calories_per_100g: apiFood.calories_per_100g,
        protein_per_100g: apiFood.protein_per_100g,
        carbs_per_100g: apiFood.carbs_per_100g,
        fat_per_100g: apiFood.fat_per_100g,
        serving_size_g: apiFood.serving_size_g, serving_unit: 'g',
      }, { onConflict: 'name,brand', ignoreDuplicates: true })

      return NextResponse.json({
        food_name: apiFood.brand ? `${apiFood.brand} ${apiFood.name}` : apiFood.name,
        amount_g: apiFood.serving_size_g,
        calories_per_100g: apiFood.calories_per_100g,
        protein_per_100g: apiFood.protein_per_100g,
        carbs_per_100g: apiFood.carbs_per_100g,
        fat_per_100g: apiFood.fat_per_100g,
        confidence: 'high', source: 'gov_api',
      })
    }

    // ── Step 4: AI 영양정보 추정 ─────────────────────────────────────────────
    // OCR 텍스트가 있으면 더 정확한 제품명으로 추정
    const aiProductName = (ocr_text && vision_confidence < 0.7)
      ? `${ocr_text} (${product_name})`
      : product_name

    console.log(`[analyze-food-photo] AI 추정: ${aiProductName}`)
    let nutrition: {
      food_name: string; amount_g: number; calories_per_100g: number
      protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number
    }

    try {
      const { text } = await generateText(buildNutritionPrompt(aiProductName, estimated_amount_g))
      nutrition = JSON.parse(text)
    } catch {
      throw new Error('영양정보 분석에 실패했습니다. 다시 시도해주세요.')
    }

    void supabase.from('foods').upsert({
      name: nutrition.food_name, brand: null,
      category: identified.category ?? null,
      calories_per_100g: nutrition.calories_per_100g,
      protein_per_100g: nutrition.protein_per_100g,
      carbs_per_100g: nutrition.carbs_per_100g,
      fat_per_100g: nutrition.fat_per_100g,
      serving_size_g: nutrition.amount_g, serving_unit: 'g',
    }, { onConflict: 'name,brand', ignoreDuplicates: true })

    return NextResponse.json({ ...nutrition, confidence: 'low', source: 'ai' })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[analyze-food-photo]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
