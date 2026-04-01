/**
 * 기초대사량(BMR) + 활동대사량(TDEE) 계산 유틸
 *
 * 알고리즘:
 * - BMR: Mifflin-St Jeor (1990) — Harris-Benedict보다 현대인에게 더 정확
 *   남성: 10W + 6.25H - 5A + 5
 *   여성: 10W + 6.25H - 5A - 161
 *
 * - TDEE: BMR × PAL (Physical Activity Level)
 *   sedentary    1.2   (거의 운동 안 함, 사무직)
 *   moderate     1.375 (가벼운 운동 1-3일/주)
 *   active       1.55  (중강도 운동 3-5일/주)
 *   very_active  1.725 (고강도 운동 6-7일/주)
 */

export type ActivityLevel = 'sedentary' | 'moderate' | 'active' | 'very_active'
export type Gender = '남성' | '여성'
export type Goal = '다이어트' | '벌크업' | '유지' | '체력향상'

export interface BMRResult {
  bmr: number
  tdee: number
  activityLabel: string
  activityMultiplier: number
  formula: string
  breakdown: {
    weightComponent: number
    heightComponent: number
    ageComponent: number
    genderConstant: number
  }
}

export const ACTIVITY_INFO: Record<ActivityLevel, { label: string; desc: string; multiplier: number }> = {
  sedentary:   { label: '저활동',       desc: '거의 앉아서 생활 (사무직 등)',    multiplier: 1.200 },
  moderate:    { label: '보통',         desc: '가벼운 운동 1-3회/주',           multiplier: 1.375 },
  active:      { label: '활동적',       desc: '중강도 운동 3-5회/주',           multiplier: 1.550 },
  very_active: { label: '매우 활동적',  desc: '고강도 운동 6-7회/주',           multiplier: 1.725 },
}

/**
 * Mifflin-St Jeor BMR 계산
 */
export function calcBMR(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number
): BMRResult {
  const weightComponent = 10 * weightKg
  const heightComponent = 6.25 * heightCm
  const ageComponent    = 5 * age
  const genderConstant  = gender === '남성' ? 5 : -161

  const bmr = Math.round(weightComponent + heightComponent - ageComponent + genderConstant)

  // Default to moderate if not specified
  const activityLevel: ActivityLevel = 'moderate'
  const { multiplier, label } = ACTIVITY_INFO[activityLevel]
  const tdee = Math.round(bmr * multiplier)

  return {
    bmr,
    tdee,
    activityLabel: label,
    activityMultiplier: multiplier,
    formula: gender === '남성'
      ? `10×${weightKg} + 6.25×${heightCm} - 5×${age} + 5`
      : `10×${weightKg} + 6.25×${heightCm} - 5×${age} - 161`,
    breakdown: { weightComponent, heightComponent, ageComponent, genderConstant },
  }
}

/**
 * 활동량 포함 TDEE 계산
 */
export function calcTDEE(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number,
  activityLevel: ActivityLevel
): BMRResult {
  const { multiplier, label } = ACTIVITY_INFO[activityLevel]
  const weightComponent = 10 * weightKg
  const heightComponent = 6.25 * heightCm
  const ageComponent    = 5 * age
  const genderConstant  = gender === '남성' ? 5 : -161

  const bmr  = Math.round(weightComponent + heightComponent - ageComponent + genderConstant)
  const tdee = Math.round(bmr * multiplier)

  return {
    bmr,
    tdee,
    activityLabel: label,
    activityMultiplier: multiplier,
    formula: gender === '남성'
      ? `10×${weightKg} + 6.25×${heightCm} - 5×${age} + 5`
      : `10×${weightKg} + 6.25×${heightCm} - 5×${age} - 161`,
    breakdown: { weightComponent, heightComponent, ageComponent, genderConstant },
  }
}

/**
 * 목표별 권장 칼로리
 */
export function adjustCaloriesForGoal(tdee: number, goal: Goal): number {
  switch (goal) {
    case '다이어트': return Math.round(tdee - 400)
    case '벌크업':   return Math.round(tdee + 250)
    case '유지':     return tdee
    case '체력향상': return Math.round(tdee + 100)
    default:         return tdee
  }
}

// ── 하위 호환 (기존 코드 유지) ────────────────────────────────────────────────

export function calculateBMR(gender: Gender, weightKg: number, heightCm: number, age: number): number {
  return calcBMR(gender, weightKg, heightCm, age).bmr
}

export function calculateTDEE(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number,
  activityLevel: ActivityLevel
): number {
  return calcTDEE(gender, weightKg, heightCm, age, activityLevel).tdee
}
