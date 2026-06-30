'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { markDailyLearned, type DailyWords as DailyWordsData, type DailyWord } from '@/app/actions/study'

const DAYS = [
  { key: 'yesterday', label: '昨日' },
  { key: 'today', label: '今日' },
  { key: 'tomorrow', label: '明日' },
] as const

type DayKey = (typeof DAYS)[number]['key']

// タブごとに「何が表示されているか」を明示（文言と内容を一致させる）
const DESC: Record<DayKey, string> = {
  yesterday: '昨日はじめて学習した単語です（いまは復習に回っています）。',
  today: 'これから学ぶ単語です。覚えたら「学習した」で復習に回せます。',
  tomorrow: '明日学ぶ予定の単語です。先に覚えてもOKです。',
}
const EMPTY: Record<DayKey, string> = {
  yesterday: '昨日はじめて学習した単語はありません。',
  today: 'これから学ぶ新しい単語はありません。',
  tomorrow: '明日学ぶ予定の単語はありません。',
}

// ホームに昨日/今日/明日の単語を表示し、まとめてコピー＋「学習した」で復習に回せる。
export function DailyWords({ data, studentId }: { data: DailyWordsData; studentId?: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<DayKey>('today')
  const [copied, setCopied] = useState(false)
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const words: DailyWord[] = data[tab].filter(w => !removed.has(w.id))
  // 昨日は「学習済みの記録」なのでマーク不要。今日・明日のみ学習済みにできる。
  const canMark = tab !== 'yesterday'

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

  const markLearned = async () => {
    if (words.length === 0 || saving) return
    const ids = words.map(w => w.id)
    setSaving(true)
    setRemoved(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n })  // 即座に消す
    try {
      await markDailyLearned(ids, studentId)
    } catch {
      setRemoved(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n })  // 失敗時は戻す
      alert('学習済みの記録に失敗しました。通信環境を確認してもう一度お試しください。')
      setSaving(false)
      return
    }
    setSaving(false)
    // 補充（消えた分の次の語を取り込む）
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => router.refresh(), 600)
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-gray-700">単語リスト</h2>

      {/* 昨日 / 今日 / 明日 */}
      <div className="mb-2 flex gap-2">
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
              {data[d.key].filter(w => !removed.has(w.id)).length}
            </span>
          </button>
        ))}
      </div>

      {words.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">{EMPTY[tab]}</p>
      ) : (
        <>
          {/* タブの内容説明（文言と表示を一致させる。空のときは出さない） */}
          <p className="mb-3 text-xs text-gray-400">{DESC[tab]}</p>
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
          <div className="mt-3 flex gap-2">
            <button
              onClick={copy}
              className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-bold text-gray-700 active:scale-95 transition-transform"
            >
              {copied ? '✓ コピーしました' : '📋 コピー'}
            </button>
            {canMark && (
              <button
                onClick={markLearned}
                disabled={saving}
                className="flex-1 rounded-xl bg-green-500 py-2.5 text-sm font-bold text-white active:scale-95 transition-transform disabled:opacity-50"
              >
                {saving ? '記録中…' : '✓ 学習した'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
