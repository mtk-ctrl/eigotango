'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 認証済みアプリの共通ボトムナビ（ホーム / きろく / せってい）。
// 学習中（/study）やログイン・初期設定では出さない。
const TABS = [
  { href: '/home', label: 'ホーム', icon: '🏠' },
  { href: '/progress', label: 'きろく', icon: '📈' },
  { href: '/settings', label: 'せってい', icon: '⚙️' },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map(t => {
          const active = pathname === t.href
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold transition-colors ${
                active ? 'text-green-600' : 'text-gray-400'
              }`}
            >
              <span className={`text-xl leading-none ${active ? '' : 'opacity-60'}`}>{t.icon}</span>
              {t.label}
            </Link>
          )
        })}
      </div>
      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </nav>
  )
}
