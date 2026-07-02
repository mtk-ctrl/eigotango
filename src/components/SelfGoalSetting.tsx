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
  noCard?: boolean  // true: 呼び出し側が既にカード枠を持つ場合、二重カードを避けて枠なしで描画
}

const COPY = {
  review: { title: '1日の復習の上限', help: 'アクティブリコール（覚え直し）で1日に出す上限', unit: '語', min: 1 },
  new: { title: '1日に学ぶ新しい単語', help: '毎日あたらしく覚える語数（0で新規なし）', unit: '語', min: 0 },
} as const

export function SelfGoalSetting({ kind, current, locked, max, noCard = false }: Props) {
  const router = useRouter()
  const [value, setValue] = useState(current)
  const [text, setText] = useState(String(current))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const c = COPY[kind]
  const cardClass = noCard ? '' : 'bg-white rounded-2xl p-5 shadow-sm'

  if (locked) {
    return (
      <div className={cardClass}>
        <h2 className="font-bold text-gray-700 text-sm mb-1">{c.title}</h2>
        <p className="text-sm text-gray-500">
          保護者が <span className="font-bold text-gray-700">{current}{c.unit}</span> に設定しています。
        </p>
      </div>
    )
  }

  const options = kind === 'new' ? newGoalOptionsFor(max) : goalOptionsFor(max)

  const save = async (n: number) => {
    const prev = value
    const clamped = Math.min(Math.max(Math.round(n), c.min), max)
    setValue(clamped)   // 楽観的更新
    setText(String(clamped))
    setSaving(true)
    setError('')
    try {
      if (kind === 'new') await setMyNewPerDay(clamped)
      else await setMyDailyGoal(clamped)
      router.refresh()
    } catch (e) {
      // 保存失敗を握りつぶすと「変わったように見えて実は変わっていない」状態になるので、
      // 値を元に戻してエラーを表示する
      setValue(prev)
      setText(String(prev))
      setError(e instanceof Error ? e.message : '保存に失敗しました。時間をおいて再試行してください。')
    } finally {
      setSaving(false)
    }
  }

  // 手入力の確定（Enter / フォーカス外し）。空や不正はもとの値に戻す。
  const commitText = () => {
    const n = parseInt(text, 10)
    if (Number.isNaN(n)) { setText(String(value)); return }
    if (n === value) { setText(String(value)); return }
    save(n)
  }

  return (
    <div className={cardClass}>
      <h2 className="font-bold text-gray-700 text-sm mb-1">
        {c.title}{saving && <span className="text-xs text-gray-400 font-normal">（保存中...）</span>}
      </h2>
      <p className="text-xs text-gray-400 mb-3">{c.help}（{c.min}〜{max}語）</p>
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

      <GoalPicker value={value} options={options} onChange={save} />

      {/* 自由入力（整数） */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-gray-400">自分で入力:</span>
        <input
          type="number"
          inputMode="numeric"
          min={c.min}
          max={max}
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className="w-20 rounded-lg border-2 border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-800 focus:border-green-400 focus:outline-none"
        />
        <span className="text-sm text-gray-500">語</span>
      </div>
    </div>
  )
}
