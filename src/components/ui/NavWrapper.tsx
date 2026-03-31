'use client'

import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'

const HIDE_NAV_PATHS = ['/login', '/onboarding', '/auth']

export default function NavWrapper() {
  const pathname = usePathname()
  const hidden = HIDE_NAV_PATHS.some(p => pathname.startsWith(p))
  if (hidden) return null
  return <BottomNav />
}
