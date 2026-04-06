import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// data.go.kr 식품영양성분 DB (FoodNtrCpntDbInfo02)
// AMT_NUM1=에너지(kcal), AMT_NUM3=단백질(g), AMT_NUM4=지방(g), AMT_NUM6=탄수화물(g)
interface ApiRow {
  FOOD_CD: string
  FOOD_NM_KR: string
  MAKER_NM: string | null
  FOOD_CAT1_NM: string | null
  AMT_NUM1: string  // 에너지(kcal)
  AMT_NUM3: string  // 단백질(g)
  AMT_NUM4: string  // 지방(g)
  AMT_NUM6: string  // 탄수화물(g)
  SERVING_SIZE: string // e.g. "100g"
}

function mapApiRow(row: ApiRow) {
  const servingG = parseFloat(row.SERVING_SIZE) || 100
  return {
    name: row.FOOD_NM_KR,
    brand: row.MAKER_NM || null,
    category: row.FOOD_CAT1_NM || null,
    calories_per_100g: parseFloat(row.AMT_NUM1) || 0,
    protein_per_100g:  parseFloat(row.AMT_NUM3) || 0,
    fat_per_100g:      parseFloat(row.AMT_NUM4) || 0,
    carbs_per_100g:    parseFloat(row.AMT_NUM6) || 0,
    serving_size_g:    servingG,
    serving_unit:      'g',
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const q = req.nextUrl.searchParams.get('q')?.trim()
    if (!q) return NextResponse.json({ results: [] })

    // 1. Local Supabase foods table
    const { data: localFoods } = await supabase
      .from('foods')
      .select('id,name,brand,category,calories_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,serving_size_g,serving_unit')
      .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
      .order('brand', { ascending: true, nullsFirst: false })
      .limit(30)

    // 2. Government API (only if API key configured)
    const apiKey = process.env.FOOD_SAFETY_API_KEY
    let apiMapped: ReturnType<typeof mapApiRow>[] = []

    if (apiKey) {
      try {
        const encoded = encodeURIComponent(q)
        const url = `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02?serviceKey=${encodeURIComponent(apiKey)}&pageNo=1&numOfRows=30&type=json&FOOD_NM_KR=${encoded}`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        const res = await fetch(url, { signal: controller.signal, next: { revalidate: 3600 } })
        clearTimeout(timeoutId)
        if (res.ok) {
          const json = await res.json()
          const rows: ApiRow[] = json?.body?.items ?? []
          apiMapped = rows.map(mapApiRow)

          // Cache to local DB (fire-and-forget, ignore errors)
          if (apiMapped.length > 0) {
            void Promise.resolve(
              supabase.from('foods').upsert(apiMapped, {
                onConflict: 'name,brand',
                ignoreDuplicates: true,
              })
            ).catch(() => {})
          }
        }
      } catch (err) {
        console.error('[search-foods] API error:', err)
      }
    }

    // 3. Merge: local first, then dedupe API results
    const localNames = new Set((localFoods ?? []).map(f => f.name))
    const merged = [
      ...(localFoods ?? []).map(f => ({ ...f, source: 'local' as const })),
      ...apiMapped
        .filter(r => !localNames.has(r.name))
        .map((r, i) => ({ ...r, id: `api_${i}_${Date.now()}`, source: 'api' as const })),
    ]

    return NextResponse.json({ results: merged })
  } catch (err) {
    console.error('[search-foods]', err)
    return NextResponse.json({ error: '검색 실패' }, { status: 500 })
  }
}
