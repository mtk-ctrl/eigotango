'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  addManagedChild,
  updateChildSettings,
  removeChild,
  generatePairingCode,
  type ChildData,
} from '@/app/actions/parent'
import { setMyDailyGoal } from '@/app/actions/auth'
import { createCheckoutSession } from '@/app/actions/stripe'

interface Subscription {
  plan: string
  status: string
  current_period_end: string | null
}

interface Props {
  parentName: string
  parentDailyGoal: number
  children: ChildData[]
  subscription: Subscription
}

const GOAL_OPTIONS = [3, 4, 5, 10, 15, 20]

export function ParentClient({ parentName, parentDailyGoal, children, subscription }: Props) {
  const router = useRouter()
  const premium = subscription.plan === 'premium'
  const goalMax = premium ? 100 : 20
  const goalOptions = GOAL_OPTIONS.filter(n => n <= goalMax).concat(premium ? [30, 50] : [])

  // 自分の問題数
  const [myGoal, setMyGoal] = useState(parentDailyGoal)
  const [savingMyGoal, setSavingMyGoal] = useState(false)

  // 子ども追加
  const [addMode, setAddMode] = useState<null | 'managed' | 'pairing'>(null)
  const [newName, setNewName] = useState('')
  const [newGoal, setNewGoal] = useState(10)
  const [adding, setAdding] = useState(false)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [codeExpiry, setCodeExpiry] = useState<string | null>(null)

  // 子どもの設定パネル開閉
  const [editing, setEditing] = useState<string | null>(null)

  const handleSaveMyGoal = async (goal: number) => {
    setMyGoal(goal)
    setSavingMyGoal(true)
    try {
      await setMyDailyGoal(goal)
      router.refresh()
    } finally {
      setSavingMyGoal(false)
    }
  }

  const handleAddManaged = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      await addManagedChild(newName.trim(), newGoal)
      setNewName('')
      setNewGoal(10)
      setAddMode(null)
      router.refresh()
    } finally {
      setAdding(false)
    }
  }

  const handleGenerateCode = async () => {
    setAdding(true)
    try {
      const { code, expiresAt } = await generatePairingCode()
      setPairingCode(code)
      setCodeExpiry(new Date(expiresAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }))
    } finally {
      setAdding(false)
    }
  }

  const handleUpgrade = async () => {
    try {
      const { url } = await createCheckoutSession()
      window.location.href = url
    } catch { /* noop */ }
  }

  return (
    <div className="min-h-dvh bg-gray-50 pb-10">
      {/* ヘッダー */}
      <div className="bg-blue-500 text-white px-4 pt-10 pb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm opacity-80">保護者ダッシュボード</p>
            <h1 className="text-xl font-bold mt-1">{parentName || 'こんにちは'} さん</h1>
          </div>
          <Link href="/settings" aria-label="設定" className="shrink-0 text-2xl mt-0.5 active:scale-90 transition-transform">
            ⚙️
          </Link>
        </div>
      </div>

      <div className="px-4 mt-4 flex flex-col gap-5">
        {/* 子どもの学習状況 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-2">子ども</h2>
          {children.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm">
              まだ子どもがいません。<br />下の「＋ 子どもを追加」から登録できます。
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {children.map(child => (
                <div key={child.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold flex items-center gap-2">
                        {child.name}
                        {child.isManaged ? (
                          <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">端末で管理</span>
                        ) : (
                          <span className="text-[10px] bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded">連携</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        累計 {child.totalLearned}語 ・ 1日 {child.dailyGoal}語
                      </p>
                    </div>
                    {child.todaySession ? (
                      <div className="text-right">
                        {child.todaySession.completed_at ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">完了</span>
                        ) : (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">学習中</span>
                        )}
                        <p className="text-sm font-bold mt-1">
                          {child.todaySession.correct_words} / {child.todaySession.total_words}語正解
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">今日は未開始</span>
                    )}
                  </div>

                  {!child.isManaged && (
                    <p className="text-[11px] text-gray-400 mt-2">学習は{child.name}さん自身の端末で行います</p>
                  )}

                  {/* 操作 */}
                  <div className="flex gap-2 mt-3">
                    {child.isManaged && (
                      <Link
                        href={`/study?child=${child.id}`}
                        className="flex-1 py-2 bg-green-500 text-white text-center rounded-lg text-sm font-bold active:scale-95 transition-transform"
                      >
                        学習する
                      </Link>
                    )}
                    <Link
                      href={`/progress?child=${child.id}`}
                      className="flex-1 py-2 bg-gray-100 text-gray-700 text-center rounded-lg text-sm font-bold active:scale-95 transition-transform"
                    >
                      記録
                    </Link>
                    <button
                      onClick={() => setEditing(editing === child.id ? null : child.id)}
                      className="py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm active:scale-95 transition-transform"
                    >
                      設定
                    </button>
                  </div>

                  {/* 設定パネル */}
                  {editing === child.id && (
                    <ChildSettings
                      child={child}
                      goalOptions={goalOptions}
                      onDone={() => { setEditing(null); router.refresh() }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 子どもを追加 */}
        <section>
          {addMode === null ? (
            <button
              onClick={() => setAddMode('managed')}
              className="w-full py-3 bg-white border-2 border-dashed border-blue-200 text-blue-500 rounded-2xl font-bold active:scale-95 transition-transform"
            >
              ＋ 子どもを追加
            </button>
          ) : (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              {/* 切替タブ */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setAddMode('managed'); setPairingCode(null) }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold ${addMode === 'managed' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                  この端末で管理
                </button>
                <button
                  onClick={() => setAddMode('pairing')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold ${addMode === 'pairing' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                  子のアカウントと連携
                </button>
              </div>

              {addMode === 'managed' ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-gray-500">
                    この端末（あなたのスマホ）で子どもが学習します。子ども専用のログインは不要です。
                  </p>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="子どもの名前（例: たろう）"
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                  />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">1日の問題数</p>
                    <GoalPicker value={newGoal} options={goalOptions} onChange={setNewGoal} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAddMode(null); setNewName('') }}
                      className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleAddManaged}
                      disabled={adding || !newName.trim()}
                      className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold disabled:opacity-40"
                    >
                      {adding ? '追加中...' : '追加する'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-gray-500">
                    子どもが自分のスマホ・アカウントを持っている場合。子どもの画面で下のコードを入力してもらいます。
                  </p>
                  {pairingCode ? (
                    <div className="text-center py-2">
                      <p className="text-4xl font-mono font-bold tracking-widest text-blue-600 my-2">
                        {pairingCode.slice(0, 3)}-{pairingCode.slice(3)}
                      </p>
                      <p className="text-xs text-gray-400">{codeExpiry} まで有効</p>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateCode}
                      disabled={adding}
                      className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold disabled:opacity-50"
                    >
                      {adding ? '生成中...' : 'ペアリングコードを発行'}
                    </button>
                  )}
                  <button
                    onClick={() => { setAddMode(null); setPairingCode(null) }}
                    className="w-full py-2 text-gray-500 text-sm"
                  >
                    閉じる
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 自分で学習する */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-2">自分で学習する</h2>
          <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex gap-3">
              <Link
                href="/study"
                className="flex-1 py-3 bg-green-500 text-white text-center rounded-xl font-bold text-sm active:scale-95 transition-transform"
              >
                今日の問題を解く
              </Link>
              <Link
                href="/progress"
                className="flex-1 py-3 bg-gray-100 text-gray-700 text-center rounded-xl font-bold text-sm active:scale-95 transition-transform"
              >
                学習記録を見る
              </Link>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">あなたの1日の問題数{savingMyGoal && '（保存中...）'}</p>
              <GoalPicker value={myGoal} options={goalOptions} onChange={handleSaveMyGoal} />
            </div>
          </div>
        </section>

        {/* プラン */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-2">プラン</h2>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            {premium ? (
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 text-xl">★</span>
                <div>
                  <p className="font-bold">プレミアムプラン</p>
                  {subscription.current_period_end && (
                    <p className="text-xs text-gray-400">
                      {new Date(subscription.current_period_end).toLocaleDateString('ja-JP')} まで有効
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  無料プランは1日20語まで。<br />プレミアムで最大100語 + 詳細レポート。
                </p>
                <button
                  onClick={handleUpgrade}
                  className="w-full py-3 bg-yellow-400 text-gray-900 rounded-xl font-bold"
                >
                  ★ プレミアムにアップグレード
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

// 1日の問題数ピッカー
function GoalPicker({ value, options, onChange }: { value: number; options: number[]; onChange: (n: number) => void }) {
  const opts = options.includes(value) ? options : [...options, value].sort((a, b) => a - b)
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`px-3 py-2 rounded-lg text-sm font-bold ${value === n ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          {n}語
        </button>
      ))}
    </div>
  )
}

// 子どもの設定パネル（名前・問題数・削除）
function ChildSettings({ child, goalOptions, onDone }: { child: ChildData; goalOptions: number[]; onDone: () => void }) {
  const [name, setName] = useState(child.name)
  const [goal, setGoal] = useState(child.dailyGoal)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await updateChildSettings(child.id, { name, dailyGoal: goal })
      onDone()
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    const msg = child.isManaged
      ? `${child.name}さんを削除します。学習データも消えます。よろしいですか？`
      : `${child.name}さんとの連携を解除します。よろしいですか？`
    if (!confirm(msg)) return
    setSaving(true)
    try {
      await removeChild(child.id)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-3">
      {child.isManaged && (
        <div>
          <p className="text-xs text-gray-500 mb-1">名前</p>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full p-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
          />
        </div>
      )}
      <div>
        <p className="text-xs text-gray-500 mb-1">1日の問題数</p>
        <GoalPicker value={goal} options={goalOptions} onChange={setGoal} />
      </div>
      <div className="flex gap-2">
        <button
          onClick={remove}
          disabled={saving}
          className="py-2 px-3 bg-red-50 text-red-500 rounded-lg text-sm font-bold disabled:opacity-40"
        >
          {child.isManaged ? '削除' : '連携解除'}
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold disabled:opacity-40"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
