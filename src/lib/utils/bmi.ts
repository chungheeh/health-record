// src/lib/utils/bmi.ts

export interface BMIClassification {
  label: string
  color: string
  bg: string
}

/**
 * BMI = weight(kg) / height(m)²  — rounded to 1 decimal
 */
export function calcBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100
  return Math.round((weightKg / (h * h)) * 10) / 10
}

/**
 * Asian WHO BMI classification thresholds
 * 저체중 <18.5 | 정상 18.5–22.9 | 과체중 23–24.9 | 비만 ≥25
 */
export function classifyBMI(bmi: number): BMIClassification {
  if (bmi < 18.5) return { label: '저체중', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' }
  if (bmi < 23.0) return { label: '정상',   color: '#4ADE80', bg: 'rgba(74,222,128,0.1)' }
  if (bmi < 25.0) return { label: '과체중', color: '#FBBF24', bg: 'rgba(251,191,36,0.1)' }
  return           { label: '비만',   color: '#F87171', bg: 'rgba(248,113,113,0.1)' }
}
