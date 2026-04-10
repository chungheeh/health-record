/**
 * W.E — D-Day 기간화(Periodization) 유틸리티
 * 대회/목표일까지 남은 일수를 기반으로 5단계 페이즈를 산출합니다.
 */

export type PhaseKey =
  | 'off_season'
  | 'cutting'
  | 'late_cutting'
  | 'peak_banding'
  | 'peak_loading'

export interface PeriodizationResult {
  phaseName: string
  phaseKey: PhaseKey
  targetCalories: number
  currentCarbMultiplier: number
  /** Tailwind/CSS 색상 (뱃지용) */
  phaseColor: string
  phaseEmoji: string
  /** 단계별 조언 한 줄 */
  phaseHint: string
}

/**
 * 남은 일수 + TDEE → 오늘의 칼로리/탄수 목표 산출
 * @param tdee         활동대사량 (kcal)
 * @param daysLeft     D-Day까지 남은 일 (0 이상)
 * @param isWorkoutDay 오늘 운동일 여부 (탄수 멀티플라이어 미세 조정)
 */
export function getDailyMacroTarget(
  tdee: number,
  daysLeft: number,
  isWorkoutDay = true,
): PeriodizationResult {
  // ── 1) 오프시즌 (D-91 이상) ──────────────────────────────────────────────
  if (daysLeft > 90) {
    return {
      phaseName: '오프시즌',
      phaseKey: 'off_season',
      targetCalories: tdee - 200,
      currentCarbMultiplier: isWorkoutDay ? 1.1 : 0.9,
      phaseColor: '#00D67C',
      phaseEmoji: '🟢',
      phaseHint: '기초 체력을 다지는 시기입니다. 꾸준한 운동과 균형 잡힌 식단을 유지하세요.',
    }
  }

  // ── 2) 커팅 (D-30 ~ D-90) ────────────────────────────────────────────────
  if (daysLeft > 30) {
    return {
      phaseName: '커팅',
      phaseKey: 'cutting',
      targetCalories: tdee - 500,
      currentCarbMultiplier: isWorkoutDay ? 1.0 : 0.7,
      phaseColor: '#C8FF00',
      phaseEmoji: '🟡',
      phaseHint: '매크로 추적이 핵심입니다. 단백질을 체중 1kg당 2.2g 이상 섭취하세요.',
    }
  }

  // ── 3) 후기 커팅 (D-7 ~ D-30) ────────────────────────────────────────────
  if (daysLeft > 7) {
    return {
      phaseName: '후기 커팅',
      phaseKey: 'late_cutting',
      targetCalories: tdee - 800,
      currentCarbMultiplier: isWorkoutDay ? 0.8 : 0.5,
      phaseColor: '#FFB74D',
      phaseEmoji: '🟠',
      phaseHint: '나트륨 섭취를 줄이고 수분 조절을 시작하세요. 근육 손실 최소화가 목표입니다.',
    }
  }

  // ── 4) 피크 위크 — 밴딩 (D-4 ~ D-7) ────────────────────────────────────
  if (daysLeft > 3) {
    return {
      phaseName: '피크 위크 (밴딩)',
      phaseKey: 'peak_banding',
      targetCalories: tdee - 1000,
      currentCarbMultiplier: 0.3,
      phaseColor: '#FF4B4B',
      phaseEmoji: '🔴',
      phaseHint: '⚠️ 탄수화물을 극도로 제한합니다. 수분 섭취도 모니터링하세요.',
    }
  }

  // ── 5) 피크 위크 — 로딩 (D-0 ~ D-3) ────────────────────────────────────
  return {
    phaseName: '피크 위크 (로딩)',
    phaseKey: 'peak_loading',
    targetCalories: tdee + 500,
    currentCarbMultiplier: 2.0,
    phaseColor: '#A855F7',
    phaseEmoji: '🟣',
    phaseHint: '⚡ 탄수화물을 최대한 섭취해 글리코겐을 채우세요. D-Day 직전 최고의 몸을 만드는 단계!',
  }
}

/** target_date 문자열(YYYY-MM-DD) → 오늘 기준 남은 일수 */
export function calcDaysLeft(targetDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(targetDate + 'T00:00:00')
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86_400_000))
}

/** start_date → target_date 사이 오늘의 진행률 (0–100) */
export function calcProgressPct(startDate: string, targetDate: string): number {
  const start = new Date(startDate + 'T00:00:00').getTime()
  const target = new Date(targetDate + 'T00:00:00').getTime()
  const now = Date.now()
  if (now <= start) return 0
  if (now >= target) return 100
  return Math.round(((now - start) / (target - start)) * 100)
}

/**
 * 기본 매크로 목표값 계산 (periodization 결과 + TDEE 기반)
 * protein: 체중 1kg당 2.0g (기본)
 * fat: 총 칼로리의 25%
 * carbs: 나머지 × carbMultiplier
 */
export function calcMacrosFromTarget(
  targetCalories: number,
  weightKg: number,
  carbMultiplier: number,
): { protein_g: number; carbs_g: number; fat_g: number } {
  const protein_g = Math.round(weightKg * 2.0)
  const fat_g = Math.round((targetCalories * 0.25) / 9)
  const remainingCal = targetCalories - protein_g * 4 - fat_g * 9
  const baseCarbG = Math.max(0, Math.round(remainingCal / 4))
  const carbs_g = Math.round(baseCarbG * carbMultiplier)
  return { protein_g, carbs_g, fat_g }
}
