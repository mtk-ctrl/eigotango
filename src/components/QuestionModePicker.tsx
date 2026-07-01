'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setMyQuestionMode } from '@/app/actions/auth'
import { QuestionModeChoices, QUESTION_MODE_OPTIONS } from '@/components/QuestionModeChoices'
import type { QuestionModeSetting } from '@/types/database'

interface Props {
  current: QuestionModeSetting
  locked: boolean
}

export function QuestionModePicker({ current, locked }: Props) {
  const router = useRouter()
  const [value, setValue] = useState<QuestionModeSetting>(current)
  const [saving, setSaving] = useState(false)

  if (locked) {
    const label = QUESTION_MODE_OPTIONS.find(o => o.value === current)?.label ?? current
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
      <QuestionModeChoices value={value} onChange={save} />
    </div>
  )
}
