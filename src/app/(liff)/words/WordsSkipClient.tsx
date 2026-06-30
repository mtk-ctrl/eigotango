'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { setWordsKnown, type UpcomingWord } from '@/app/actions/study'

export function WordsSkipClient({ words }: { words: UpcomingWord[] }) {
  const router = useRouter()
  const initial = useMemo(() => new Set(words.filter(w => w.known).map(w => w.id)), [words])
  const [checked, setChecked] = useState<Set<string>>(() => new Set(initial))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const toggle = (id: string) => {
    setSaved(false)
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toKnown = [...checked].filter(id => !initial.has(id))
  const toUnknown = [...initial].filter(id => !checked.has(id))
  const changes = toKnown.length + toUnknown.length

  const save = async () => {
    if (changes === 0) return
    setSaving(true)
    try {
      if (toKnown.length) await setWordsKnown(toKnown, true)
      if (toUnknown.length) await setWordsKnown(toUnknown, false)
      setSaved(true)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="px-5 flex flex-col gap-2 pb-28">
        {words.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">対象の単語がありません</p>
        ) : (
          words.map(w => {
            const on = checked.has(w.id)
            return (
              <button
                key={w.id}
                onClick={() => toggle(w.id)}
                className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                  on ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-white'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold ${
                    on ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 text-transparent'
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-bold text-gray-800">{w.word}</span>
                  <span className="ml-2 text-sm text-gray-500">{w.meaning}</span>
                </span>
                {w.grade && <span className="shrink-0 text-[10px] text-gray-400">{w.grade}</span>}
              </button>
            )
          })
        )}
      </div>

      {/* 保存バー（固定） */}
      <div className="fixed bottom-0 inset-x-0 border-t border-gray-100 bg-white/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <button
            onClick={save}
            disabled={saving || changes === 0}
            className="w-full rounded-xl bg-green-500 py-3 font-bold text-white disabled:opacity-40 active:scale-95 transition-transform"
          >
            {saving ? '保存中...' : saved && changes === 0 ? '✓ 保存しました' : changes > 0 ? `${changes}件の変更を保存` : 'チェックした単語をスキップ'}
          </button>
          <p className="mt-1 text-center text-[11px] text-gray-400">
            理解済み {checked.size} 語をスキップ中
          </p>
        </div>
      </div>
    </>
  )
}
