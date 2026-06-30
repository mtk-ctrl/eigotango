'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { setWordsKnown, type UpcomingWord } from '@/app/actions/study'

// スキップ済みの語を一覧表示し、「戻す」で出題対象に復帰させる。
export function KnownWordsClient({ words }: { words: UpcomingWord[] }) {
  const router = useRouter()
  const [restored, setRestored] = useState<Set<string>>(new Set())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const display = words.filter(w => !restored.has(w.id))

  const restore = (id: string) => {
    setRestored(prev => new Set(prev).add(id))
    setWordsKnown([id], false).catch(() => {
      setRestored(prev => { const n = new Set(prev); n.delete(id); return n })
    })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => router.refresh(), 700)
  }

  if (display.length === 0) {
    return <p className="px-5 py-16 text-center text-sm text-gray-400">スキップした単語はありません</p>
  }

  return (
    <div className="px-5 flex flex-col gap-2 pb-10">
      {display.map(w => (
        <div
          key={w.id}
          className="flex items-center gap-3 rounded-xl border-2 border-gray-100 bg-white p-3"
        >
          <span className="min-w-0 flex-1">
            <span className="font-bold text-gray-800">{w.word}</span>
            <span className="ml-2 text-sm text-gray-500">{w.meaning}</span>
          </span>
          <button
            onClick={() => restore(w.id)}
            className="shrink-0 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-bold text-gray-700 active:scale-95 transition-transform"
          >
            戻す
          </button>
        </div>
      ))}
    </div>
  )
}
