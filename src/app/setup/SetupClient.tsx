'use client'

import { useState, useTransition } from 'react'
import { unstable_rethrow } from 'next/navigation'
import { setUserRole } from '@/app/actions/auth'

export function SetupClient() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function select(role: 'student' | 'parent') {
    setError('')
    startTransition(async () => {
      try {
        await setUserRole(role)
      } catch (e) {
        // setUserRole は成功時に redirect() する＝NEXT_REDIRECT が throw される。
        // これを catch で握るとリダイレクトが壊れるため、フレームワーク内部エラーは再スローする
        unstable_rethrow(e)
        // 初回設定はここで詰まると先へ進めないので、失敗を必ず表示して再試行できるようにする
        setError(e instanceof Error ? e.message : '設定に失敗しました。もう一度お試しください。')
      }
    })
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center">
        <p className="text-5xl mb-4">👋</p>
        <h1 className="text-2xl font-bold">ようこそ！</h1>
        <p className="text-gray-500 mt-2">あなたはどちらですか？</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => select('student')}
          disabled={isPending}
          className="w-full py-5 bg-green-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform shadow-sm disabled:opacity-60"
        >
          📖 生徒（子ども）
        </button>
        <button
          onClick={() => select('parent')}
          disabled={isPending}
          className="w-full py-5 bg-blue-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform shadow-sm disabled:opacity-60"
        >
          👨‍👩‍👧 保護者（親）
        </button>
        {error && <p className="text-center text-sm text-red-500">{error}</p>}
      </div>
    </div>
  )
}
