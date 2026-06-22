'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { generatePairingCode } from '@/app/actions/parent'
import { createCheckoutSession } from '@/app/actions/stripe'

interface Child {
  id: string
  name: string
  todaySession: { total_words: number; correct_words: number; completed_at: string | null } | null
  totalLearned: number
}

interface Subscription {
  plan: string
  status: string
  current_period_end: string | null
}

interface Props {
  parentName: string
  students: Child[]
  subscription: Subscription
}

export function ParentClient({ parentName, students, subscription }: Props) {
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [codeExpiry, setCodeExpiry] = useState<string | null>(null)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const router = useRouter()

  const handleGenerateCode = async () => {
    setGeneratingCode(true)
    try {
      const { code, expiresAt } = await generatePairingCode()
      setPairingCode(code)
      setCodeExpiry(new Date(expiresAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }))
    } finally {
      setGeneratingCode(false)
    }
  }

  const handleUpgrade = async () => {
    setUpgrading(true)
    try {
      const { url } = await createCheckoutSession()
      window.location.href = url
    } catch {
      setUpgrading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-gray-50 pb-8">
      {/* ヘッダー */}
      <div className="bg-blue-500 text-white px-4 pt-10 pb-6">
        <p className="text-sm opacity-80">保護者ダッシュボード</p>
        <h1 className="text-xl font-bold mt-1">{parentName || 'こんにちは'} さん</h1>
      </div>

      <div className="px-4 mt-4 flex flex-col gap-4">
        {/* 子どもの今日の学習状況 */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-2">今日の学習状況</h2>
          {students.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm">
              まだ子どもと紐付けていません
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {students.map(child => (
                <div key={child.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{child.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">累計 {child.totalLearned}語 学習済み</p>
                    </div>
                    {child.todaySession ? (
                      <div className="text-right">
                        {child.todaySession.completed_at ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">完了</span>
                        ) : (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">学習中</span>
                        )}
                        <p className="text-sm font-bold mt-1">
                          {child.todaySession.correct_words} / {child.todaySession.total_words}語 正解
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">未開始</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ペアリングコード */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-2">子どもの追加</h2>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            {pairingCode ? (
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">子どもに以下のコードを教えてください</p>
                <p className="text-4xl font-mono font-bold tracking-widest text-blue-600 my-3">
                  {pairingCode.slice(0, 3)}-{pairingCode.slice(3)}
                </p>
                <p className="text-xs text-gray-400">{codeExpiry} まで有効</p>
              </div>
            ) : (
              <button
                onClick={handleGenerateCode}
                disabled={generatingCode}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {generatingCode ? '生成中...' : '＋ ペアリングコードを発行'}
              </button>
            )}
          </div>
        </section>

        {/* プラン */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 mb-2">プラン</h2>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            {subscription.plan === 'premium' ? (
              <div className="flex items-center gap-2">
                <span className="text-yellow-500 text-xl">⭐</span>
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
                  無料プランは1日20語まで。<br />プレミアムで無制限 + 詳細レポート。
                </p>
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="w-full py-3 bg-yellow-400 text-gray-900 rounded-xl font-bold disabled:opacity-50"
                >
                  {upgrading ? '処理中...' : '⭐ プレミアムにアップグレード'}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
