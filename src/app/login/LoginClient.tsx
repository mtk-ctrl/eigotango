'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Step = 'input' | 'sending' | 'sent' | 'error'

export function LoginClient() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<Step>('input')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStep('sending')

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (error) {
      setErrorMsg(error.message && error.message !== '{}' ? error.message : 'ログインメールの送信に失敗しました。しばらくして再試行してください。')
      setStep('error')
    } else {
      setStep('sent')
    }
  }

  if (step === 'sent') {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-4xl mb-4">📧</p>
          <h2 className="text-xl font-bold mb-3">メールを送りました</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            <span className="font-medium text-gray-700">{email}</span><br />
            にログインリンクを送信しました。<br />
            メールに届いたリンクをタップしてください。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center">
        <p className="text-5xl mb-4">📚</p>
        <h1 className="text-2xl font-bold">英語タンゴ</h1>
        <p className="text-gray-500 mt-2 text-sm">毎日の英単語学習アプリ</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="メールアドレスを入力"
          required
          autoComplete="email"
          inputMode="email"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <button
          type="submit"
          disabled={step === 'sending'}
          className="w-full py-4 bg-green-500 text-white rounded-2xl text-lg font-bold active:scale-95 transition-transform shadow-sm disabled:opacity-60"
        >
          {step === 'sending' ? '送信中...' : 'ログインリンクを送る'}
        </button>
        {step === 'error' && (
          <p className="text-red-500 text-sm text-center">{errorMsg}</p>
        )}
      </form>

      <p className="text-gray-400 text-xs text-center">
        初めての方もこのまま登録できます
      </p>
    </div>
  )
}
