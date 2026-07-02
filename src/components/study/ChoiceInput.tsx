'use client'

import { useRef } from 'react'

interface Props {
  choices: string[]
  onSubmit: (value: string) => void
}

// 表示直後はタップを受け付けない時間（ミリ秒）。
// 「次へ」のタップ/Enter のゴーストイベントが、直後に描画された選択肢に
// 命中して勝手に回答してしまうのを防ぐ。
const IGNORE_TAPS_AFTER_MOUNT_MS = 250

export function ChoiceInput({ choices, onSubmit }: Props) {
  // 問題ごとに key 付きで再マウントされるため、mountedAt は「この問題が表示された時刻」
  const mountedAtRef = useRef(Date.now())
  const submit = (value: string) => {
    if (Date.now() - mountedAtRef.current < IGNORE_TAPS_AFTER_MOUNT_MS) return
    onSubmit(value)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3">
        {choices.map((c, i) => (
          <button
            type="button"
            key={`${c}-${i}`}
            onClick={() => submit(c)}
            className="w-full py-4 px-4 bg-white border-2 border-gray-200 rounded-xl text-lg font-bold text-gray-800 active:scale-95 active:border-green-400 transition-all text-center"
          >
            {c}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => submit('')}
        className="w-full py-3 text-gray-400 text-sm active:text-gray-600"
      >
        わからない
      </button>
    </div>
  )
}
