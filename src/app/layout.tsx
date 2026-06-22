import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '英語タンゴ - 毎日の英単語学習',
  description: 'LINEで届く英単語クイズで高校受験を攻略。忘却曲線に基づいた最適タイミングで学習。',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,  // スマホでのダブルタップズームを防ぐ
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
