'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initLiff } from '@/lib/liff'
import { checkLineUser, signInWithLine } from '@/app/actions/auth'

type Step = 'loading' | 'checking' | 'role-select' | 'signing-in' | 'error'

interface LiffProfile { userId: string; displayName: string }

export function LoginClient() {
  const [step, setStep] = useState<Step>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [profile, setProfile] = useState<LiffProfile | null>(null)
  const [idToken, setIdToken] = useState('')
  const router = useRouter()

  async function performSignIn(
    token: string,
    liffProfile: LiffProfile,
    role: 'student' | 'parent',
  ) {
    setStep('signing-in')
    try {
      const result = await signInWithLine({
        idToken: token,
        lineUserId: liffProfile.userId,
        lineDisplayName: liffProfile.displayName,
        role,
      })
      router.replace(result.role === 'parent' ? '/parent' : '/study')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'ログインに失敗しました')
      setStep('error')
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const liff = await initLiff()
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href })
          return
        }

        const token = liff.getIDToken()
        const p = await liff.getProfile()
        if (!token || cancelled) return

        const liffProfile = { userId: p.userId, displayName: p.displayName }
        setProfile(liffProfile)
        setIdToken(token)
        setStep('checking')

        const { exists, role } = await checkLineUser(p.userId)
        if (cancelled) return

        if (exists && role) {
          await performSignIn(token, liffProfile, role)
        } else {
          setStep('role-select')
        }
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e instanceof Error ? e.message : 'エラーが発生しました')
          setStep('error')
        }
      }
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (step === 'error') {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-4xl mb-3">😢</p>
          <p className="text-red-500 mb-4 text-sm">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-blue-500 underline"
          >
            再試行する
          </button>
        </div>
      </div>
    )
  }

  if (step === 'role-select') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 gap-8">
        <div className="text-center">
          <p className="text-5xl mb-4">📚</p>
          <h1 className="text-2xl font-bold">英語タンゴへようこそ！</h1>
          <p className="text-gray-500 mt-2">あなたはどちらですか？</p>
        </div>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => profile && performSignIn(idToken, profile, 'student')}
            className="w-full py-5 bg-green-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform shadow-sm"
          >
            📖 生徒（子ども）
          </button>
          <button
            onClick={() => profile && performSignIn(idToken, profile, 'parent')}
            className="w-full py-5 bg-blue-500 text-white rounded-2xl text-xl font-bold active:scale-95 transition-transform shadow-sm"
          >
            👨‍👩‍👧 保護者（親）
          </button>
        </div>
      </div>
    )
  }

  const labels: Partial<Record<Step, string>> = {
    loading: '読み込み中...', checking: '確認中...', 'signing-in': 'ログイン中...',
  }
  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">{labels[step]}</p>
      </div>
    </div>
  )
}
