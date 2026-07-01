'use client'

import { useState } from 'react'
import type { DailyWord } from '@/app/actions/study'

// 今日の復習(アクティブリコール)対象の単語一覧。コピーできる（先頭に見出しを付けられる）。
export function ReviewDailyList({ words, copyHeader }: { words: DailyWord[]; copyHeader?: string | null }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (words.length === 0) return
    const body = words.map(w => `${w.word}\t${w.meaning}`).join('\n')
    const text = copyHeader ? `${copyHeader}\n${body}` : body
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // クリップボード不可の環境は無視
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-sm font-bold text-gray-700">🔁 復習する単語</h2>
      <p className="mb-3 text-xs text-gray-400">今日 覚え直す単語です（期限が来たもの）。</p>

      {words.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">今日 復習する単語はありません。</p>
      ) : (
        <>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100">
            {words.map(w => (
              <div
                key={w.id}
                className="flex items-baseline justify-between gap-3 border-b border-gray-50 px-3 py-2 last:border-0"
              >
                <span className="font-bold text-gray-800">{w.word}</span>
                <span className="truncate text-right text-sm text-gray-500">{w.meaning}</span>
              </div>
            ))}
          </div>
          <button
            onClick={copy}
            className="mt-3 w-full rounded-xl bg-gray-100 py-2.5 text-sm font-bold text-gray-700 active:scale-95 transition-transform"
          >
            {copied ? '✓ コピーしました' : '📋 コピー'}
          </button>
        </>
      )}
    </div>
  )
}
