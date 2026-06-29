'use client'

import { useState } from 'react'
import type { DailyWords as DailyWordsData, DailyWord } from '@/app/actions/study'

const DAYS = [
  { key: 'yesterday', label: '昨日' },
  { key: 'today', label: '今日' },
  { key: 'tomorrow', label: '明日' },
] as const

type DayKey = (typeof DAYS)[number]['key']

// ホームに昨日/今日/明日の単語を表示し、まとめてコピーできる。
export function DailyWords({ data }: { data: DailyWordsData }) {
  const [tab, setTab] = useState<DayKey>('today')
  const [copied, setCopied] = useState(false)
  const words: DailyWord[] = data[tab]

  const copy = async () => {
    if (words.length === 0) return
    const text = words.map(w => `${w.word}\t${w.meaning}`).join('\n')
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
      <h2 className="mb-3 text-sm font-bold text-gray-700">単語リスト</h2>

      {/* 昨日 / 今日 / 明日 */}
      <div className="mb-3 flex gap-2">
        {DAYS.map(d => (
          <button
            key={d.key}
            onClick={() => { setTab(d.key); setCopied(false) }}
            className={`flex-1 rounded-lg py-2 text-sm font-bold ${
              tab === d.key ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {d.label}
            <span className={`ml-1 text-xs font-normal ${tab === d.key ? 'text-white/80' : 'text-gray-400'}`}>
              {data[d.key].length}
            </span>
          </button>
        ))}
      </div>

      {words.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">単語はありません</p>
      ) : (
        <>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100">
            {words.map((w, i) => (
              <div
                key={`${w.word}-${i}`}
                className="flex items-baseline justify-between gap-3 border-b border-gray-50 px-3 py-2 last:border-0"
              >
                <span className="font-bold text-gray-800">{w.word}</span>
                <span className="truncate text-right text-sm text-gray-500">{w.meaning}</span>
              </div>
            ))}
          </div>
          <button
            onClick={copy}
            className="mt-3 w-full rounded-xl bg-green-500 py-2.5 text-sm font-bold text-white active:scale-95 transition-transform"
          >
            {copied ? '✓ コピーしました' : '📋 この日の単語をコピー'}
          </button>
        </>
      )}
    </div>
  )
}
