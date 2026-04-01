import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface ApiRow {
  FOOD_CD: string
  DESC_KOR: string
  MAKER_NM: string
  GROUP_NAME: string
  NUTR_CONT1: string  // calories
  NUTR_CONT2: string  // carbs
  NUTR_CONT3: string  // protein
  NUTR_CONT4: string  // fat
  SERVING_WT: string  // serving size g
  SERVING_SIZE: string
}

function mapApiRow(row: ApiRow) {
  return {
    name: row.DESC_KOR,
    brand: row.MAKER_NM || null,
    category: row.GROUP_NAME || null,
    calories_per_100g: parseFloat(row.NUTR_CONT1) || 0,
    carbs_per_100g:    parseFloat(row.NUTR_CONT2) || 0,
    protein_per_100g:  parseFloat(row.NUTR_CONT3) || 0,
    fat_per_100g:      parseFloat(row.NUTR_CONT4) || 0,
    serving_size_g:    parseFloat(row.SERVING_WT) || 100,
    serving_unit:      row.SERVING_SIZE || 'g',
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
        const url = `https://openapi.foodsafetykorea.go.kr/api/${apiKey}/I2790/json/1/30?DESC_KOR=${encoded}`
        const res = await fetch(url, { next: { revalidate: 3600 } })
        if (res.ok) {
          const json = await res.json()
          const rows: ApiRow[] = json?.I2790?.row ?? []
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
