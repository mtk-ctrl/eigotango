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

interface Props {
  name: string
  premium: boolean
  children: ChildData[]
}

const GOAL_OPTIONS = [3, 4, 5, 10, 15, 20]

// 親のホーム。「子どもの状況」を主役にし、自分の学習は1枚のカードに集約。
// 1日の問題数（自分）・プラン・通知などの設定は /settings に分離した。
export function ParentHome({ name, premium, children }: Props) {
  const router = useRouter()
  const goalMax = premium ? 100 : 20
  const goalOptions = GOAL_OPTIONS.filter(n => n <= goalMax).concat(premium ? [30, 50] : [])

  // 子ども追加
  const [addMode, setAddMode] = useState<null | 'managed' | 'pairing'>(null)
  const [newName, setNewName] = useState('')
  const [newGoal, setNewGoal] = useState(10)
  const [adding, setAdding] = useState(false)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [codeExpiry, setCodeExpiry] = useState<string | null>(null)

  // 子どもの設定パネル開閉
  const [editing, setEditing] = useState<string | null>(null)

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

  return (
    <div className="min-h-dvh bg-gray-50 pb-24">
      {/* ヘッダー */}
      <header className="px-5 pt-12 pb-2">
        <p className="text-sm text-gray-400">保護者ホーム</p>
        <h1 className="text-2xl font-bold text-gray-800">
          {name ? `${name}さん` : 'こんにちは'}
          {premium && <span className="ml-2 align-middle text-xs text-yellow-500">★ プレミアム</span>}
        </h1>
      </header>

      <div className="px-5 mt-4 flex flex-col gap-6">
        {/* 子どもの学習状況（主役） */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-gray-500">こどもの学習</h2>
          {children.length === 0 ? (
            <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400">
              まだ子どもが登録されていません。<br />下の「＋ 子どもを追加」から始めましょう。
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {children.map(child => (
                <div key={child.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="flex items-center gap-2 font-bold text-gray-800">
                        {child.name}
                        {child.isManaged ? (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-500">端末で管理</span>
                        ) : (
                          <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-500">連携</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">累計 {child.totalLearned}語 ・ 1日 {child.dailyGoal}語</p>
                    </div>
                    {child.todaySession ? (
                      <div className="text-right">
                        {child.todaySession.completed_at ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">完了</span>
                        ) : (
                          <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700">学習中</span>
                        )}
                        <p className="mt-1 text-sm font-bold text-gray-700">
                          {child.todaySession.correct_words} / {child.todaySession.total_words}語
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">今日は未開始</span>
                    )}
                  </div>

                  {!child.isManaged && (
                    <p className="mt-2 text-[11px] text-gray-400">学習は{child.name}さん自身の端末で行います</p>
                  )}

                  <div className="mt-3 flex gap-2">
                    {child.isManaged && (
                      <Link
                        href={`/study?child=${child.id}`}
                        className="flex-1 rounded-lg bg-green-500 py-2 text-center text-sm font-bold text-white active:scale-95 transition-transform"
                      >
                        学習する
                      </Link>
                    )}
                    <Link
                      href={`/progress?child=${child.id}`}
                      className="flex-1 rounded-lg bg-gray-100 py-2 text-center text-sm font-bold text-gray-700 active:scale-95 transition-transform"
                    >
                      きろく
                    </Link>
                    <button
                      onClick={() => setEditing(editing === child.id ? null : child.id)}
                      className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 active:scale-95 transition-transform"
                    >
                      設定
                    </button>
                  </div>

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

          {/* 子どもを追加 */}
          <div className="mt-3">
            {addMode === null ? (
              <button
                onClick={() => setAddMode('managed')}
                className="w-full rounded-2xl border-2 border-dashed border-blue-200 bg-white py-3 font-bold text-blue-500 active:scale-95 transition-transform"
              >
                ＋ 子どもを追加
              </button>
            ) : (
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-4 flex gap-2">
                  <button
                    onClick={() => { setAddMode('managed'); setPairingCode(null) }}
                    className={`flex-1 rounded-lg py-2 text-sm font-bold ${addMode === 'managed' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                  >
                    この端末で管理
                  </button>
                  <button
                    onClick={() => setAddMode('pairing')}
                    className={`flex-1 rounded-lg py-2 text-sm font-bold ${addMode === 'pairing' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}
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
                      className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-blue-400 focus:outline-none"
                    />
                    <div>
                      <p className="mb-1 text-xs text-gray-500">1日の問題数</p>
                      <GoalPicker value={newGoal} options={goalOptions} onChange={setNewGoal} />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setAddMode(null); setNewName('') }}
                        className="flex-1 rounded-xl bg-gray-100 py-3 font-bold text-gray-600"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={handleAddManaged}
                        disabled={adding || !newName.trim()}
                        className="flex-1 rounded-xl bg-blue-500 py-3 font-bold text-white disabled:opacity-40"
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
                      <div className="py-2 text-center">
                        <p className="my-2 font-mono text-4xl font-bold tracking-widest text-blue-600">
                          {pairingCode.slice(0, 3)}-{pairingCode.slice(3)}
                        </p>
                        <p className="text-xs text-gray-400">{codeExpiry} まで有効</p>
                      </div>
                    ) : (
                      <button
                        onClick={handleGenerateCode}
                        disabled={adding}
                        className="w-full rounded-xl bg-blue-500 py-3 font-bold text-white disabled:opacity-50"
                      >
                        {adding ? '生成中...' : 'ペアリングコードを発行'}
                      </button>
                    )}
                    <button
                      onClick={() => { setAddMode(null); setPairingCode(null) }}
                      className="w-full py-2 text-sm text-gray-500"
                    >
                      閉じる
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 自分で学習する */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-gray-500">自分で学習する</h2>
          <div className="flex gap-3">
            <Link
              href="/study"
              className="flex-1 rounded-2xl bg-green-500 py-4 text-center font-bold text-white active:scale-95 transition-transform"
            >
              今日の問題を解く
            </Link>
            <Link
              href="/progress"
              className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-bold text-gray-700 shadow-sm active:scale-95 transition-transform"
            >
              きろく
            </Link>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            1日の問題数・プラン・通知は「せってい」で変更できます。
          </p>
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
          className={`rounded-lg px-3 py-2 text-sm font-bold ${value === n ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}
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
    <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3">
      {child.isManaged && (
        <div>
          <p className="mb-1 text-xs text-gray-500">名前</p>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-xl border-2 border-gray-200 p-2.5 focus:border-blue-400 focus:outline-none"
          />
        </div>
      )}
      <div>
        <p className="mb-1 text-xs text-gray-500">1日の問題数</p>
        <GoalPicker value={goal} options={goalOptions} onChange={setGoal} />
      </div>
      <div className="flex gap-2">
        <button
          onClick={remove}
          disabled={saving}
          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-500 disabled:opacity-40"
        >
          {child.isManaged ? '削除' : '連携解除'}
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-lg bg-blue-500 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
