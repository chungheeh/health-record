/**
 * TDEE 계산 유틸
 * Harris-Benedict BMR + 활동계수
 */

type ActivityLevel = '저활동' | '보통' | '활동적' | '매우활동적'
type Gender = '남성' | '여성'
type Goal = '다이어트' | '벌크업' | '유지' | '체력향상'

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  '저활동': 1.2,
  '보통': 1.375,
  '활동적': 1.55,
  '매우활동적': 1.725,
}

/**
 * Harris-Benedict BMR
 */
export function calculateBMR(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number
): number {
  if (gender === '남성') {
    return 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age
  } else {
    return 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.330 * age
  }
}

/**
 * TDEE = BMR × 활동계수
 */
export function calculateTDEE(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number,
  activityLevel: ActivityLevel
): number {
  const bmr = calculateBMR(gender, weightKg, heightCm, age)
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.375
  return Math.round(bmr * multiplier)
}

/**
 * 목표별 일일 칼로리 조정
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
