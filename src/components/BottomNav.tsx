'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 役割ごとに「必要なタブだけ」を出す。各画面の目的を明確にするため。
// - 生徒: ホーム（今日やる）/ きろく（自分の成果）/ せってい
// - 親  : ホーム（こどもの様子）/ せってい（管理・設定）
//          ※ 子の記録は子カードから文脈で開く
const STUDENT_TABS = [
  { href: '/home', label: 'ホーム', icon: '🏠' },
  { href: '/progress', label: 'きろく', icon: '📈' },
  { href: '/settings', label: 'せってい', icon: '⚙️' },
]
const PARENT_TABS = [
  { href: '/home', label: 'ホーム', icon: '🏠' },
  { href: '/settings', label: 'せってい', icon: '⚙️' },
]

export function BottomNav({ role }: { role: 'student' | 'parent' }) {
  const pathname = usePathname()
  const tabs = role === 'parent' ? PARENT_TABS : STUDENT_TABS
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur">
      <div className={`mx-auto grid max-w-md ${tabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {tabs.map(t => {
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
