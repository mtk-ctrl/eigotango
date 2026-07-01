'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addManagedChild,
  updateChildSettings,
  removeChild,
  generatePairingCode,
  type ChildData,
} from '@/app/actions/parent'
import { GoalPicker } from '@/components/GoalPicker'
import { QuestionModeChoices } from '@/components/QuestionModeChoices'
import { goalOptionsFor, newGoalOptionsFor, FREE_DAILY_MAX, PREMIUM_DAILY_MAX } from '@/lib/constants'
import type { QuestionModeSetting } from '@/types/database'

// せってい内の「お子さまの学習設定」: 追加・名前/問題数/出題形式の編集・連携・削除。
// ここでの変更は「お子さま本人の設定」であり、保護者自身の学習設定（このページ下部の
// 「自分の学習設定」）とは別物であることを見出し・説明文で明示する。
export function ChildrenManager({ children, premium }: { children: ChildData[]; premium: boolean }) {
  const router = useRouter()
  const goalOptions = goalOptionsFor(premium ? PREMIUM_DAILY_MAX : FREE_DAILY_MAX)
  const newGoalOptions = newGoalOptionsFor(premium ? PREMIUM_DAILY_MAX : FREE_DAILY_MAX)

  const [addMode, setAddMode] = useState<null | 'managed' | 'pairing'>(null)
  const [newName, setNewName] = useState('')
  const [newGoal, setNewGoal] = useState(10)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [codeExpiry, setCodeExpiry] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  const handleAddManaged = async () => {
    if (!newName.trim()) return
    setAdding(true)
    setAddError('')
    try {
      const res = await addManagedChild(newName.trim(), newGoal)
      if (!res.ok) {
        setAddError(res.error)
        return
      }
      setNewName('')
      setNewGoal(10)
      setAddMode(null)
      router.refresh()
    } catch (e) {
      setAddError(e instanceof Error ? e.message : '追加に失敗しました。時間をおいて再試行してください。')
    } finally {
      setAdding(false)
    }
  }

  const handleGenerateCode = async () => {
    setAdding(true)
    setAddError('')
    try {
      const { code, expiresAt } = await generatePairingCode()
      setPairingCode(code)
      setCodeExpiry(new Date(expiresAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }))
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'コードの発行に失敗しました。時間をおいて再試行してください。')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-sm font-bold text-gray-700">👶 お子さまの学習設定</h2>
      <p className="mb-3 text-xs text-gray-400">
        追加・名前・1日の問題数・出題形式など、お子さまごとの設定はここでまとめて行います。
      </p>

      {/* 子ども一覧（編集・削除） */}
      {children.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {children.map(child => (
            <div key={child.id} className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-bold text-gray-800">
                  {child.name}
                  {child.isManaged ? (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-500">端末で管理</span>
                  ) : (
                    <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-500">連携</span>
                  )}
                </p>
                <button
                  onClick={() => setEditing(editing === child.id ? null : child.id)}
                  className="text-xs font-bold text-green-600 underline"
                >
                  {editing === child.id ? '閉じる' : '編集'}
                </button>
              </div>
              <p className="mt-0.5 text-xs text-gray-400">
                1日 新規{child.newPerDay}語・復習上限{child.dailyGoal}語
              </p>

              {editing === child.id && (
                <ChildSettings
                  child={child}
                  goalOptions={goalOptions}
                  newGoalOptions={newGoalOptions}
                  onDone={() => { setEditing(null); router.refresh() }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 追加 */}
      {addMode === null ? (
        <button
          onClick={() => setAddMode('managed')}
          className="w-full rounded-xl border-2 border-dashed border-green-300 py-2.5 text-sm font-bold text-green-600 active:scale-95 transition-transform"
        >
          ＋ お子さまを追加
        </button>
      ) : (
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => { setAddMode('managed'); setPairingCode(null) }}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${addMode === 'managed' ? 'bg-green-500 text-white' : 'bg-white text-gray-500'}`}
            >
              この端末で管理
            </button>
            <button
              onClick={() => setAddMode('pairing')}
              className={`flex-1 rounded-lg py-2 text-sm font-bold ${addMode === 'pairing' ? 'bg-green-500 text-white' : 'bg-white text-gray-500'}`}
            >
              子のアカウントと連携
            </button>
          </div>

          {addError && <p className="mb-2 text-sm text-red-500">{addError}</p>}

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
                className="w-full rounded-xl border-2 border-gray-200 p-3 focus:border-green-400 focus:outline-none"
              />
              <div>
                <p className="mb-1 text-xs text-gray-500">1日の復習の上限（新しい単語の数などは追加後に編集できます）</p>
                <GoalPicker value={newGoal} options={goalOptions} onChange={setNewGoal} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setAddMode(null); setNewName('') }}
                  className="flex-1 rounded-xl bg-white py-3 font-bold text-gray-600"
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
                  <p className="my-2 font-mono text-4xl font-bold tracking-widest text-green-600">
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
  )
}

// 子どもの設定（名前・問題数・出題形式・削除）
function ChildSettings({
  child, goalOptions, newGoalOptions, onDone,
}: {
  child: ChildData
  goalOptions: number[]
  newGoalOptions: number[]
  onDone: () => void
}) {
  const [name, setName] = useState(child.name)
  const [goal, setGoal] = useState(child.dailyGoal)
  const [newPerDay, setNewPerDay] = useState(child.newPerDay)
  const [questionMode, setQuestionMode] = useState<QuestionModeSetting>(child.questionMode)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // 端末管理の子のみ名前を編集可。空名では保存させない。
  const nameInvalid = child.isManaged && !name.trim()

  const save = async () => {
    if (nameInvalid) return
    setSaving(true)
    setError('')
    try {
      // 実際に変更したフィールドだけ渡す。未変更の項目まで送ると、そのたび
      // daily_goal_locked が true になり、触っていない設定まで意図せずロックされるため。
      await updateChildSettings(child.id, {
        name: child.isManaged && name !== child.name ? name : undefined,
        dailyGoal: goal !== child.dailyGoal ? goal : undefined,
        newPerDay: newPerDay !== child.newPerDay ? newPerDay : undefined,
        questionMode: questionMode !== child.questionMode ? questionMode : undefined,
      })
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました。時間をおいて再試行してください。')
      setSaving(false)
    }
  }

  const remove = async () => {
    const msg = child.isManaged
      ? `${child.name}さんを削除します。学習データも消えます。よろしいですか？`
      : `${child.name}さんとの連携を解除します。よろしいですか？`
    if (!confirm(msg)) return
    setSaving(true)
    setError('')
    try {
      await removeChild(child.id)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました。時間をおいて再試行してください。')
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3">
      <p className="text-xs font-bold text-gray-500">{child.name}さんの設定</p>
      {child.isManaged && (
        <div>
          <p className="mb-1 text-xs text-gray-500">名前</p>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-xl border-2 border-gray-200 p-2.5 focus:border-green-400 focus:outline-none"
          />
        </div>
      )}
      <div>
        <p className="mb-1 text-xs text-gray-500">1日に学ぶ新しい単語</p>
        <GoalPicker value={newPerDay} options={newGoalOptions} onChange={setNewPerDay} />
      </div>
      <div>
        <p className="mb-1 text-xs text-gray-500">1日の復習の上限</p>
        <GoalPicker value={goal} options={goalOptions} onChange={setGoal} />
      </div>
      <div>
        <p className="mb-1 text-xs text-gray-500">出題形式</p>
        <QuestionModeChoices value={questionMode} onChange={setQuestionMode} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
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
          disabled={saving || nameInvalid}
          className="flex-1 rounded-lg bg-green-500 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  )
}
