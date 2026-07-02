'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setMyCopyHeader } from '@/app/actions/auth'

// 単語リストをコピーするときに1行目へ付ける見出しを設定する。空＝なし。
// noCard: true の場合、呼び出し側が既にカード枠を持つため枠なしで描画する（二重カード防止）。
export function CopyHeaderSetting({ current, noCard = false }: { current: string | null; noCard?: boolean }) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(!!current)
  const [text, setText] = useState(current ?? '今日の単語')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const cardClass = noCard ? '' : 'bg-white rounded-2xl p-5 shadow-sm'

  const save = async (header: string) => {
    setSaving(true)
    setSaved(false)
    try {
      await setMyCopyHeader(header)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const toggle = (on: boolean) => {
    setEnabled(on)
    save(on ? text.trim() || '今日の単語' : '')
  }

  return (
    <div className={cardClass}>
      <h2 className="font-bold text-gray-700 text-sm mb-1">
        コピー時の見出し
        {saving && <span className="text-xs text-gray-400 font-normal">（保存中...）</span>}
        {saved && <span className="text-xs text-green-500 font-normal">（保存しました）</span>}
      </h2>
      <p className="text-xs text-gray-400 mb-3">単語リストをコピーすると、1行目にこの言葉が入ります。</p>

      {/* あり / なし */}
      <div className="flex gap-2">
        <button
          onClick={() => toggle(true)}
          className={`flex-1 rounded-lg py-2 text-sm font-bold ${enabled ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          見出しあり
        </button>
        <button
          onClick={() => toggle(false)}
          className={`flex-1 rounded-lg py-2 text-sm font-bold ${!enabled ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          なし
        </button>
      </div>

      {enabled && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={text}
            maxLength={40}
            placeholder="今日の単語"
            onChange={e => setText(e.target.value)}
            onBlur={() => save(text.trim() || '今日の単語')}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2 text-sm font-bold text-gray-800 focus:border-green-400 focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}
