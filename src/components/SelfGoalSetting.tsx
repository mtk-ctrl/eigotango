'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setMyDailyGoal, setMyNewPerDay } from '@/app/actions/auth'
import { GoalPicker } from '@/components/GoalPicker'
import { goalOptionsFor, newGoalOptionsFor } from '@/lib/constants'

interface Props {
  kind: 'review' | 'new'
  current: number
  locked: boolean
  max: number
}

const COPY = {
  review: { title: '1日の復習の上限', help: 'アクティブリコール（覚え直し）で1日に出す上限', unit: '語' },
  new: { title: '1日に学ぶ新しい単語', help: '毎日あたらしく覚える語数（0で新規なし）', unit: '語' },
} as const

export function SelfGoalSetting({ kind, current, locked, max }: Props) {
  const router = useRouter()
  const [value, setValue] = useState(current)
  const [saving, setSaving] = useState(false)
  const c = COPY[kind]

  if (locked) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-gray-700 text-sm mb-1">{c.title}</h2>
        <p className="text-sm text-gray-500">
          保護者が <span className="font-bold text-gray-700">{current}{c.unit}</span> に設定しています。
        </p>
      </div>
    )
  }

  const options = kind === 'new' ? newGoalOptionsFor(max) : goalOptionsFor(max)

  const save = async (n: number) => {
    setValue(n)
    setSaving(true)
    try {
      if (kind === 'new') await setMyNewPerDay(n)
      else await setMyDailyGoal(n)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="font-bold text-gray-700 text-sm mb-1">
        {c.title}{saving && <span className="text-xs text-gray-400 font-normal">（保存中...）</span>}
      </h2>
      <p className="text-xs text-gray-400 mb-3">{c.help}</p>
      <GoalPicker value={value} options={options} onChange={save} />
    </div>
  )
}
