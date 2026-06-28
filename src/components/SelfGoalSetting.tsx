'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setMyDailyGoal } from '@/app/actions/auth'
import { GoalPicker } from '@/components/GoalPicker'
import { goalOptionsFor } from '@/lib/constants'

interface Props {
  current: number
  locked: boolean
  max: number
}

export function SelfGoalSetting({ current, locked, max }: Props) {
  const router = useRouter()
  const [value, setValue] = useState(current)
  const [saving, setSaving] = useState(false)

  if (locked) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-gray-700 text-sm mb-1">1日の問題数</h2>
        <p className="text-sm text-gray-500">
          保護者が <span className="font-bold text-gray-700">{current}語</span> に設定しています。
        </p>
      </div>
    )
  }

  const options = goalOptionsFor(max)

  const save = async (n: number) => {
    setValue(n)
    setSaving(true)
    try {
      await setMyDailyGoal(n)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="font-bold text-gray-700 text-sm mb-3">
        1日の問題数{saving && <span className="text-xs text-gray-400 font-normal">（保存中...）</span>}
      </h2>
      <GoalPicker value={value} options={options} onChange={save} />
    </div>
  )
}
