'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setNotificationChannel, setMyDisplayName } from '@/app/actions/auth'
import type { NotificationChannel } from '@/types/database'

interface Props {
  displayName: string
  email: string | null
  channel: NotificationChannel
  lineLinked: boolean
}

const CHANNELS: { value: NotificationChannel; label: string; note: string }[] = [
  { value: 'email', label: '📧 メール', note: '登録メールにリマインドを送ります' },
  { value: 'line', label: '💬 LINE', note: 'LINE連携が必要です' },
  { value: 'both', label: '📧＋💬 両方', note: 'メールとLINEの両方に送ります' },
]

export function SettingsClient({ displayName, email, channel, lineLinked }: Props) {
  const router = useRouter()

  // 通知方法
  const [ch, setCh] = useState<NotificationChannel>(channel)
  const [savingCh, setSavingCh] = useState(false)

  // 表示名
  const [name, setName] = useState(displayName)
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)

  const saveChannel = async (next: NotificationChannel) => {
    setCh(next)
    setSavingCh(true)
    try {
      await setNotificationChannel(next)
      router.refresh()
    } finally {
      setSavingCh(false)
    }
  }

  const saveName = async () => {
    if (!name.trim()) return
    setSavingName(true)
    try {
      await setMyDisplayName(name.trim())
      setEditingName(false)
      router.refresh()
    } finally {
      setSavingName(false)
    }
  }

  return (
    <>
      {/* 通知方法 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-gray-700 text-sm mb-1">
          通知方法{savingCh && <span className="text-xs text-gray-400 font-normal">（保存中...）</span>}
        </h2>
        <p className="text-xs text-gray-400 mb-3">毎日の学習リマインドの届け先</p>
        <div className="flex flex-col gap-2">
          {CHANNELS.map(opt => {
            const disabled = (opt.value === 'line' || opt.value === 'both') && !lineLinked
            const active = ch === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => !disabled && saveChannel(opt.value)}
                disabled={disabled}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-left transition-colors ${
                  active
                    ? 'bg-green-50 border-2 border-green-400'
                    : 'bg-gray-50 border-2 border-transparent'
                } ${disabled ? 'opacity-40' : 'active:scale-[0.99]'}`}
              >
                <div>
                  <p className="font-bold text-sm text-gray-700">{opt.label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{opt.note}</p>
                </div>
                {active && <span className="text-green-500 font-bold">✓</span>}
              </button>
            )
          })}
        </div>
        {!lineLinked && (
          <p className="text-[11px] text-gray-400 mt-2">
            ※ LINE通知は今後の連携設定で利用できるようになります。
          </p>
        )}
      </div>

      {/* アカウント */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-gray-700 text-sm mb-3">アカウント</h2>

        {/* 表示名 */}
        <div className="flex items-center justify-between py-2 border-b border-gray-50">
          <span className="text-sm text-gray-500">表示名</span>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={20}
                className="w-32 p-1.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-green-400"
              />
              <button
                onClick={saveName}
                disabled={savingName || !name.trim()}
                className="text-sm font-bold text-green-600 disabled:opacity-40"
              >
                {savingName ? '...' : '保存'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-2 text-sm font-bold text-gray-700"
            >
              {displayName || '未設定'}
              <span className="text-xs text-green-600 underline">変更</span>
            </button>
          )}
        </div>

        {/* メール */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-500">メールアドレス</span>
          <span className="text-sm text-gray-700 truncate max-w-[60%]">{email ?? '—'}</span>
        </div>
      </div>
    </>
  )
}
