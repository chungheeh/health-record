/**
 * AI 클라이언트 유틸
 * Anthropic 우선 → 크레딧 부족/인증 실패 시 Gemini 자동 폴백
 */

import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export type AIProvider = 'anthropic' | 'gemini'

function isAnthropicCreditError(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    const msg = err.message ?? ''
    return (
      err.status === 400 && msg.includes('credit balance') ||
      err.status === 402 ||
      err.status === 401
    )
  }
  return false
}

/**
 * 텍스트 생성 (Anthropic → Gemini 폴백)
 */
export async function generateText(prompt: string): Promise<{ text: string; provider: AIProvider }> {
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
        console.warn('[ai-client] Anthropic 크레딧 부족 → Gemini로 폴백')
        // 폴백 진행
      } else {
        // 다른 Anthropic 에러는 그대로 throw
        throw err
      }
    }
  }

  // 2) Gemini 폴백
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      'AI 서비스를 사용할 수 없습니다. Anthropic 크레딧을 충전하거나 Gemini API 키를 설정해 주세요.'
    )
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent(prompt)
  const text = result.response.text()
  return { text, provider: 'gemini' }
}

/**
 * 이미지 + 텍스트 분석 (Anthropic → Gemini 폴백)
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
        console.warn('[ai-client] Anthropic 크레딧 부족 → Gemini로 폴백')
      } else {
        throw err
      }
    }
  }

  // 2) Gemini 폴백
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      'AI 서비스를 사용할 수 없습니다. Anthropic 크레딧을 충전하거나 Gemini API 키를 설정해 주세요.'
    )
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const imagePart = {
    inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' },
  }
  const result = await model.generateContent([prompt, imagePart])
  const text = result.response.text()
  return { text, provider: 'gemini' }
}
