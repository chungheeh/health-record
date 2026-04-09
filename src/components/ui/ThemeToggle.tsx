'use client'

import { useTheme, type Theme } from '@/components/providers/ThemeProvider'

const THEMES: { value: Theme; label: string; icon: string }[] = [
  { value: 'dark',  label: '다크',  icon: '🌙' },
  { value: 'light', label: '라이트', icon: '☀️' },
  { value: 'pink',  label: '핑크',  icon: '🌸' },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex gap-2 p-1 bg-bg-tertiary rounded-[14px]">
      {THEMES.map(({ value, label, icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={[
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px]',
              'text-sm font-medium transition-all duration-200',
              active
                ? 'bg-accent text-bg-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary',
            ].join(' ')}
          >
            <span className="text-base leading-none">{icon}</span>
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
