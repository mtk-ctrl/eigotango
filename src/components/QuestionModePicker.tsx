'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setMyQuestionMode } from '@/app/actions/auth'
import type { QuestionModeSetting } from '@/types/database'

const OPTIONS: { value: QuestionModeSetting; label: string; help: string }[] = [
  { value: 'auto', label: '自動（おすすめ）', help: '覚え具合に応じて自動で難しくなります' },
  { value: 'en_to_ja_choice', label: '英→日 4択', help: '英単語を見て日本語の意味を選ぶ' },
  { value: 'ja_to_en_choice', label: '日→英 4択', help: '日本語の意味を見て英単語を選ぶ' },
  { value: 'ja_to_en_spell', label: '日→英 スペル入力', help: '日本語の意味を見て英単語を書く' },
]

interface Props {
  current: QuestionModeSetting
  locked: boolean
}

export function QuestionModePicker({ current, locked }: Props) {
  const router = useRouter()
  const [value, setValue] = useState<QuestionModeSetting>(current)
  const [saving, setSaving] = useState(false)

  if (locked) {
    const label = OPTIONS.find(o => o.value === current)?.label ?? current
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-gray-700 text-sm mb-1">出題形式</h2>
        <p className="text-sm text-gray-500">
          保護者が <span className="font-bold text-gray-700">{label}</span> に設定しています。
        </p>
      </div>
    )
  }

  const save = async (mode: QuestionModeSetting) => {
    setValue(mode)
    setSaving(true)
    try {
      await setMyQuestionMode(mode)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="font-bold text-gray-700 text-sm mb-1">
        出題形式{saving && <span className="text-xs text-gray-400 font-normal">（保存中...）</span>}
      </h2>
      <p className="text-xs text-gray-400 mb-3">クイズの形式を選べます。熟語は自動的に4択になります。</p>
      <div className="flex flex-col gap-2">
        {OPTIONS.map(o => (
          <button
            key={o.value}
            onClick={() => save(o.value)}
            className={`rounded-xl border-2 p-3 text-left transition-transform active:scale-[0.99] ${
              value === o.value ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-white'
            }`}
          >
            <p className={`text-sm font-bold ${value === o.value ? 'text-green-700' : 'text-gray-700'}`}>{o.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{o.help}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
