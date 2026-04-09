'use client'

import React from 'react'
import BottomNav from './BottomNav'

interface PageLayoutProps {
  title: string
  rightAction?: React.ReactNode
  children: React.ReactNode
  showBottomNav?: boolean
}

export default function PageLayout({
  title,
  rightAction,
  children,
  showBottomNav = true,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* 상단 고정 헤더 */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-bg-primary border-b border-we-border z-50 flex items-center justify-between px-4">
        <h1 className="font-semibold text-text-primary text-base">{title}</h1>
        {rightAction && (
          <div className="flex items-center">{rightAction}</div>
        )}
      </header>

      {/* 본문 콘텐츠 */}
      <main
        className={[
          'pt-14',
          showBottomNav ? 'pb-20' : 'pb-4',
        ].join(' ')}
      >
        {children}
      </main>

      {/* 하단 네비게이션 */}
      {showBottomNav && <BottomNav />}
    </div>
  )
}
