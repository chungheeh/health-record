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
        // W.E 디자인 시스템
        'bg-primary': '#0f0f0f',
        'bg-secondary': '#1a1a1a',
        'bg-tertiary': '#242424',
        'accent': '#C8FF00',
        'accent-dim': 'rgba(200,255,0,0.12)',
        'we-danger': '#FF4B4B',
        'we-success': '#00D67C',
        'we-border': '#2a2a2a',
        'text-primary': '#f0f0f0',
        'text-secondary': '#888888',
        'text-muted': '#555555',
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
