/**
 * 영양소 계산 유틸
 */

type Goal = '다이어트' | '벌크업' | '유지' | '체력향상'

export interface MacroTargets {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface NutrientValues {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

/**
 * 목표 + TDEE + 체중 기반 매크로 목표 계산
 * - 단백질: 체중 1kg당 1.8~2.0g
 * - 지방: 총 칼로리의 25%
 * - 탄수화물: 나머지
 */
export function calculateMacros(
  dailyCalories: number,
  goal: Goal,
  weightKg: number
): MacroTargets {
  let proteinPerKg: number
  switch (goal) {
    case '다이어트': proteinPerKg = 2.2; break
    case '벌크업':   proteinPerKg = 1.8; break
    case '체력향상': proteinPerKg = 2.0; break
    default:         proteinPerKg = 1.8
  }

  const protein_g = Math.round(weightKg * proteinPerKg)
  const fat_g = Math.round((dailyCalories * 0.25) / 9)
  const proteinCals = protein_g * 4
  const fatCals = fat_g * 9
  const carbs_g = Math.round((dailyCalories - proteinCals - fatCals) / 4)

  return {
    calories: dailyCalories,
    protein_g,
    carbs_g: Math.max(carbs_g, 0),
    fat_g,
  }
}

/**
 * 섭취량(g) 변경 시 영양소 비례 스케일링
 */
export function scaleNutrients(
  base: NutrientValues,
  baseGrams: number,
  targetGrams: number
): NutrientValues {
  if (baseGrams <= 0) return base
  const ratio = targetGrams / baseGrams
  return {
    calories: Math.round(base.calories * ratio * 10) / 10,
    protein_g: Math.round(base.protein_g * ratio * 10) / 10,
    carbs_g: Math.round(base.carbs_g * ratio * 10) / 10,
    fat_g: Math.round(base.fat_g * ratio * 10) / 10,
  }
}

/**
 * 영양소 합산
 */
export function sumNutrients(items: NutrientValues[]): NutrientValues {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )
}
