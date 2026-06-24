'use client'

import { useTransition } from 'react'
import { setUserRole } from '@/app/actions/auth'

export function SetupClient() {
  const [isPending, startTransition] = useTransition()

  function select(role: 'student' | 'parent') {
    startTransition(async () => {
      await setUserRole(role)
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
      </div>
    </div>
  )
}
