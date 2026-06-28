'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitPairingCode } from '@/app/actions/parent'

export function PairingClient() {
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 数字のみ、6桁まで
    setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
    setError('')
  }

  const handleSubmit = async () => {
    if (code.length !== 6) { setError('6桁のコードを入力してください'); return }
    setSubmitting(true)
    try {
      await submitPairingCode(code)
      setDone(true)
      setTimeout(() => router.replace('/home'), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-5xl mb-4">🎉</p>
          <p className="text-xl font-bold">紐付け完了！</p>
          <p className="text-gray-500 text-sm mt-2">学習画面に移動します...</p>
        </div>
      </div>
    )
  }

  // 表示用: XXX-XXX フォーマット
  const displayCode = code.length > 3 ? `${code.slice(0, 3)}-${code.slice(3)}` : code

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-center">
        <p className="text-4xl mb-3">🔗</p>
        <h1 className="text-xl font-bold">保護者と紐付ける</h1>
        <p className="text-gray-500 text-sm mt-2">
          保護者のスマホに表示された<br />6桁のコードを入力してください
        </p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-4">
        <input
          type="text"
          inputMode="numeric"
          value={displayCode}
          onChange={handleChange}
          placeholder="000-000"
          className={`w-full text-3xl font-mono text-center tracking-widest p-4 border-2 rounded-xl focus:outline-none ${
            error ? 'border-red-400' : 'border-gray-200 focus:border-blue-400'
          }`}
          autoFocus
        />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={code.length !== 6 || submitting}
          className="w-full py-4 bg-blue-500 text-white rounded-xl text-lg font-bold disabled:opacity-40 active:scale-95 transition-transform"
        >
          {submitting ? '確認中...' : '紐付ける'}
        </button>
      </div>
    </div>
  )
}
