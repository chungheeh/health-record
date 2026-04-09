'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Dumbbell, Apple, BarChart2, User } from 'lucide-react'

const NAV_ITEMS = [
  { label: '홈', href: '/', icon: Home },
  { label: '운동', href: '/workout/new', icon: Dumbbell, matchPrefix: '/workout' },
  { label: '식단', href: '/diet', icon: Apple },
  { label: '대시보드', href: '/dashboard', icon: BarChart2 },
  { label: '마이', href: '/my', icon: User },
] as const

export default function BottomNav() {
  const pathname = usePathname()

  function isActive(item: (typeof NAV_ITEMS)[number]): boolean {
    if ('matchPrefix' in item && item.matchPrefix) {
      return pathname.startsWith(item.matchPrefix)
    }
    return pathname === item.href
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-bg-secondary border-t border-we-border z-50">
      <ul className="flex items-center justify-around h-full px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item)

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={[
                  'flex flex-col items-center justify-center gap-0.5 h-full',
                  active ? 'text-accent' : 'text-text-muted',
                ].join(' ')}
              >
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
