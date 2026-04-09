import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // W.E 디자인 시스템 — CSS 변수 기반 (테마 전환 지원)
        // rgb(var(--xxx-rgb) / <alpha-value>) 형태로 opacity 모디파이어 사용 가능
        'bg-primary':    'rgb(var(--bg-primary-rgb) / <alpha-value>)',
        'bg-secondary':  'rgb(var(--bg-secondary-rgb) / <alpha-value>)',
        'bg-tertiary':   'rgb(var(--bg-tertiary-rgb) / <alpha-value>)',
        'accent':        'rgb(var(--accent-rgb) / <alpha-value>)',
        'accent-dim':    'rgb(var(--accent-rgb) / 0.12)',
        'we-danger':     'rgb(var(--danger-rgb) / <alpha-value>)',
        'we-success':    'rgb(var(--success-rgb) / <alpha-value>)',
        'we-border':     'rgb(var(--border-rgb) / <alpha-value>)',
        'text-primary':  'rgb(var(--text-primary-rgb) / <alpha-value>)',
        'text-secondary':'rgb(var(--text-secondary-rgb) / <alpha-value>)',
        'text-muted':    'rgb(var(--text-muted-rgb) / <alpha-value>)',
      },
      fontFamily: {
        pretendard: ['Pretendard Variable', 'Pretendard', '-apple-system', 'sans-serif'],
      },
      maxWidth: {
        'app': '430px',
      },
      borderRadius: {
        'card': '16px',
        'input': '12px',
      },
    },
  },
  plugins: [],
}

export default config
