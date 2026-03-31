// W.E PWA 아이콘 생성 스크립트
// node scripts/gen-icons.mjs
import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '../public/icons')
mkdirSync(iconsDir, { recursive: true })

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // 배경: 거의 검정
  ctx.fillStyle = '#0f0f0f'
  ctx.fillRect(0, 0, size, size)

  // 라운드 배경 (라임 그린)
  const radius = size * 0.22
  const padding = size * 0.12
  ctx.beginPath()
  ctx.moveTo(padding + radius, padding)
  ctx.lineTo(size - padding - radius, padding)
  ctx.arcTo(size - padding, padding, size - padding, padding + radius, radius)
  ctx.lineTo(size - padding, size - padding - radius)
  ctx.arcTo(size - padding, size - padding, size - padding - radius, size - padding, radius)
  ctx.lineTo(padding + radius, size - padding)
  ctx.arcTo(padding, size - padding, padding, size - padding - radius, radius)
  ctx.lineTo(padding, padding + radius)
  ctx.arcTo(padding, padding, padding + radius, padding, radius)
  ctx.closePath()
  ctx.fillStyle = '#C8FF00'
  ctx.fill()

  // W.E 텍스트
  const fontSize = size * 0.32
  ctx.fillStyle = '#0f0f0f'
  ctx.font = `bold ${fontSize}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('W.E', size / 2, size / 2)

  return canvas.toBuffer('image/png')
}

const sizes = [192, 512]
for (const size of sizes) {
  const buffer = generateIcon(size)
  const filePath = join(iconsDir, `icon-${size}.png`)
  writeFileSync(filePath, buffer)
  console.log(`✅ icon-${size}.png 생성 완료`)
}

console.log('🎉 W.E 아이콘 생성 완료!')
