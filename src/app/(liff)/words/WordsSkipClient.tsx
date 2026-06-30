'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { setWordsKnown, type UpcomingWord } from '@/app/actions/study'

// チェック＝即スキップ。一覧から消し、バックフィルして常に次の100語を表示する。
export function WordsSkipClient({ words }: { words: UpcomingWord[] }) {
  const router = useRouter()
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const display = words.filter(w => !removed.has(w.id)).slice(0, 100)

  const scheduleRefresh = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => router.refresh(), 700)
  }

  const skip = (id: string) => {
    setRemoved(prev => new Set(prev).add(id))   // 即座に消す
    setWordsKnown([id], true).catch(() => {
      setRemoved(prev => { const n = new Set(prev); n.delete(id); return n })  // 失敗時は戻す
    })
    scheduleRefresh()  // 補充
  }

  if (display.length === 0) {
    return <p className="px-5 py-16 text-center text-sm text-gray-400">対象の単語がありません</p>
  }

  return (
    <div className="px-5 flex flex-col gap-2 pb-10">
      {display.map(w => (
        <button
          key={w.id}
          onClick={() => skip(w.id)}
          className="flex items-center gap-3 rounded-xl border-2 border-gray-100 bg-white p-3 text-left active:scale-[0.99] transition-transform"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-gray-300 text-sm font-bold text-transparent">
            ✓
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-bold text-gray-800">{w.word}</span>
            <span className="ml-2 text-sm text-gray-500">{w.meaning}</span>
          </span>
          {w.grade && <span className="shrink-0 text-[10px] text-gray-400">{w.grade}</span>}
        </button>
      ))}
    </div>
  )
}
