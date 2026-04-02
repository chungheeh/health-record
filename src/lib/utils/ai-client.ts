/**
 * AI 클라이언트 유틸
 * Anthropic 우선 → 크레딧 부족/인증 실패 시 Gemini 자동 폴백
 *
 * Gemini 모델 선택 기준 (2025-04 실제 확인된 사용 가능 모델):
 * - generateText  : gemini-2.5-flash → 복잡한 JSON 추론·루틴 생성 최적
 * - analyzeImage  : gemini-2.5-flash → 멀티모달 비전 + 빠른 응답 지원
 *
 * ※ gemini-1.5-flash / gemini-1.5-pro → 이 API 키에서 404 Not Found
 * ※ gemini-2.0-flash / gemini-2.0-flash-001 → 이 API 키에서 404 Not Found
 * ※ gemini-2.5-flash, gemini-2.5-flash-lite → 정상 작동 확인
 */

import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export type AIProvider = 'anthropic' | 'gemini'

// 용도별 Gemini 모델 (2025-04 실제 작동 확인)
const GEMINI_TEXT_MODEL   = 'gemini-2.5-flash' // 루틴 생성: 복잡한 추론·구조화 JSON
const GEMINI_VISION_MODEL = 'gemini-2.5-flash' // 사진 분석: 멀티모달 비전 지원

function isAnthropicCreditError(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    const msg = err.message ?? ''
    return (
      (err.status === 400 && msg.includes('credit balance')) ||
      err.status === 402 ||
      err.status === 401
    )
  }
  return false
}

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      'AI 서비스를 사용할 수 없습니다. Anthropic 크레딧을 충전하거나 Gemini API 키를 설정해 주세요.'
    )
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
}

/**
 * Gemini가 가끔 ```json ... ``` 마크다운으로 감싸는 경우 추출
 */
function extractJSON(raw: string): string {
  // ```json ... ``` 또는 ``` ... ``` 블록 제거
  const stripped = raw.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim()
  return stripped
}

/**
 * 텍스트 생성
 * Anthropic claude-sonnet-4 → (폴백) Gemini 1.5 Pro
 * 용도: 루틴 생성처럼 복잡한 구조화 JSON이 필요한 작업
 */
export async function generateText(
  prompt: string
): Promise<{ text: string; provider: AIProvider }> {
  // 1) Anthropic 시도
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      return { text, provider: 'anthropic' }
    } catch (err) {
      if (isAnthropicCreditError(err)) {
        console.warn(`[ai-client] Anthropic 크레딧 부족 → Gemini ${GEMINI_TEXT_MODEL}로 폴백`)
      } else {
        throw err
      }
    }
  }

  // 2) Gemini 1.5 Pro 폴백
  const genAI = getGeminiClient()
  const model = genAI.getGenerativeModel({
    model: GEMINI_TEXT_MODEL,
    generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
  })
  const result = await model.generateContent(prompt)
  const raw = result.response.text()
  return { text: extractJSON(raw), provider: 'gemini' }
}

/**
 * 이미지 + 텍스트 분석
 * Anthropic claude-sonnet-4 (vision) → (폴백) Gemini 1.5 Flash
 * 용도: 음식 사진 분석처럼 빠른 멀티모달 인식이 필요한 작업
 */
export async function analyzeImageWithText(
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<{ text: string; provider: AIProvider }> {
  // 1) Anthropic 시도
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const validMime = (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)
        ? mimeType
        : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: validMime, data: imageBase64 } },
              { type: 'text', text: prompt },
            ],
          },
        ],
      })
      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      return { text, provider: 'anthropic' }
    } catch (err) {
      if (isAnthropicCreditError(err)) {
        console.warn(`[ai-client] Anthropic 크레딧 부족 → Gemini ${GEMINI_VISION_MODEL}로 폴백`)
      } else {
        throw err
      }
    }
  }

  // 2) Gemini 1.5 Flash 폴백 — 멀티모달 비전 최적화
  const genAI = getGeminiClient()
  const model = genAI.getGenerativeModel({
    model: GEMINI_VISION_MODEL,
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  })

  const imagePart = { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } }
  const result = await model.generateContent([prompt, imagePart])
  const raw = result.response.text()
  return { text: extractJSON(raw), provider: 'gemini' }
}
