'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

type Mode = 'login' | 'signup'
type Role = 'student' | 'parent'

export function LoginClient() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('student')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  function supabase() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }

  function go() {
    window.location.href = '/home'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)
    const sb = supabase()

    try {
      if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { role, display_name: email.split('@')[0] } },
        })
        if (error) throw error
        if (!data.session) {
          // メール確認が有効な場合（通常ここには来ない想定）
          setErrorMsg('登録は完了しましたが、確認が必要です。もう一度ログインしてください。')
          setMode('login')
          return
        }
        go()
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw error
        go()
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : JSON.stringify(err)
      const message = raw === '{}' || raw === '[object Object]' ? '' : raw
      setErrorMsg(translateError(message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 gap-7">
      <div className="text-center">
        <p className="text-5xl mb-4">📚</p>
        <h1 className="text-2xl font-bold">英語タンゴ</h1>
        <p className="text-gray-500 mt-2 text-sm">毎日の英単語学習アプリ</p>
      </div>

      {/* ログイン / 新規登録 切替 */}
      <div className="flex bg-gray-100 rounded-full p-1 w-full max-w-xs">
        {(['login', 'signup'] as Mode[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setErrorMsg('') }}
            className={`flex-1 py-2 rounded-full text-sm font-bold transition-colors ${
              mode === m ? 'bg-white shadow text-green-600' : 'text-gray-500'
            }`}
          >
            {m === 'login' ? 'ログイン' : '新規登録'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="メールアドレス"
          required
          autoComplete="email"
          inputMode="email"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="パスワード（6文字以上）"
          required
          minLength={6}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-400"
        />

        {/* 新規登録時のみ：生徒 / 保護者を選択 */}
        {mode === 'signup' && (
          <div className="flex gap-3">
            {([['student', '生徒（子ども）'], ['parent', '保護者（親）']] as [Role, string][]).map(([r, label]) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-colors ${
                  role === r ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-green-500 text-white rounded-2xl text-lg font-bold active:scale-95 transition-transform shadow-sm disabled:opacity-60"
        >
          {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}
        </button>

        {errorMsg && (
          <p className="text-red-500 text-sm text-center">{errorMsg}</p>
        )}
      </form>
    </div>
  )
}

function translateError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'メールアドレスかパスワードが違います。'
  if (m.includes('user already registered')) return 'このメールアドレスは既に登録済みです。「ログイン」を選んでください。'
  if (m.includes('password should be at least')) return 'パスワードは6文字以上にしてください。'
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'メールアドレスの形式が正しくありません。'
  if (m.includes('email not confirmed')) return 'メール確認が必要です。管理者にお問い合わせください。'
  return message || 'エラーが発生しました。しばらくして再試行してください。'
}
