'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

interface Props {
  icon: string
  title: string
  summary: string
  children: ReactNode
}

// 折りたたみ式の設定カード。要約行は常に見せ、大きな「編集」ボタンを押したときだけ
// 実際の入力UIを開く。お子さまの設定カードと同じ見た目・操作感に揃えるためのもの。
export function CollapsibleSettingsCard({ icon, title, summary, children }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-700">{icon} {title}</h2>
          <p className="mt-0.5 text-xs text-gray-400">{summary}</p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="shrink-0 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-bold text-white active:scale-95 transition-transform"
        >
          {open ? '閉じる' : '編集'}
        </button>
      </div>

      {open && (
        // noCard で枠なし描画される設定項目が直接並ぶため、項目間に区切り線を入れて
        // どこからどこまでが1つの設定かを分かりやすくする
        <div className="mt-4 flex flex-col divide-y divide-gray-100 border-t border-gray-100 [&>*]:py-4 [&>*:last-child]:pb-0">
          {children}
        </div>
      )}
    </div>
  )
}
