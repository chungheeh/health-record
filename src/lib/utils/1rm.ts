/**
 * 1RM 계산 유틸 — Epley 공식
 * 1RM = weight × (1 + reps / 30)
 */

export function calculateOneRM(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg
  if (weightKg <= 0 || reps <= 0) return 0
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

/**
 * 특정 반복수로 들 수 있는 무게 계산
 * weight = 1RM / (1 + reps / 30)
 */
export function weightForReps(oneRM: number, reps: number): number {
  if (reps === 1) return oneRM
  if (oneRM <= 0 || reps <= 0) return 0
  return Math.round((oneRM / (1 + reps / 30)) * 10) / 10
}

/**
 * 1RM 대비 퍼센트로 무게 계산
 */
export function weightByPercent(oneRM: number, percent: number): number {
  return Math.round(oneRM * (percent / 100) * 10) / 10
}
