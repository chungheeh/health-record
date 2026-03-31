import type { Metadata, Viewport } from 'next'
import './globals.css'
import NavWrapper from '@/components/ui/NavWrapper'

export const metadata: Metadata = {
  title: 'W.E — Workout & Eat',
  description: '운동과 식단 — 운동은 먹는 것까지다',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'W.E',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f0f0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <div className="app-container">
          {children}
          <NavWrapper />
        </div>
      </body>
    </html>
  )
}
