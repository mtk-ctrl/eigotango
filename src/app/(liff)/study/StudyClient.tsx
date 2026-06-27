'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ProgressBar } from '@/components/study/ProgressBar'
import { QuestionCard } from '@/components/study/QuestionCard'
import { SpellingInput } from '@/components/study/SpellingInput'
import { ChoiceInput } from '@/components/study/ChoiceInput'
import { ResultCard } from '@/components/study/ResultCard'
import { checkAnswer } from '@/lib/questions'
import { recordAnswer, completeSession } from '@/app/actions/study'
import { LogoutButton } from '@/components/LogoutButton'
import type { StudyQuestion, SpellingResult } from '@/types/api'

interface Props {
  questions: StudyQuestion[]
  sessionId: string
  studentId: string
  studentName?: string   // 親が子の代わりに学習しているとき表示
  returnTo: string       // 「やめる」「ホームへ戻る」の戻り先
  recordsHref: string    // 学習記録（進捗）へのリンク
  showLogout: boolean    // 本人ログイン時のみログアウトを出す
}

type Phase = 'input' | 'result' | 'complete'

export function StudyClient({ questions, sessionId, studentId, studentName, returnTo, recordsHref, showLogout }: Props) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('input')
  const [lastResult, setLastResult] = useState<SpellingResult | null>(null)
  const [qualities, setQualities] = useState<number[]>([])

  const current = questions[index]
  const isLast = index + 1 >= questions.length

  const handleSubmit = useCallback(async (input: string) => {
    if (!current) return
    const { type, quality } = checkAnswer(current, input)
    setLastResult({ type, input })
    setQualities(prev => [...prev, quality])
    setPhase('result')
    await recordAnswer({ studentId, sessionId, wordId: current.wordId, quality })
  }, [current, sessionId, studentId])

  const handleNext = useCallback(async () => {
    if (isLast) {
      const correct = qualities.filter(q => q >= 3).length
      await completeSession(studentId, sessionId, correct, questions.length)
      setPhase('complete')
    } else {
      setIndex(i => i + 1)
      setPhase('input')
      setLastResult(null)
    }
  }, [isLast, sessionId, studentId, qualities, questions.length])

  const handleQuit = useCallback(() => {
    if (index === 0 && phase === 'input') {
      router.push(returnTo)
      return
    }
    if (confirm('学習を中断しますか？\nここまでの回答は保存されています。')) {
      router.push(returnTo)
    }
  }, [router, returnTo, index, phase])

  if (questions.length === 0) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center gap-6">
        <div>
          <p className="text-5xl mb-4">🌟</p>
          <p className="text-xl font-bold">今日の学習は完了！</p>
          <p className="text-gray-500 mt-2">また明日チャレンジしよう</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href={recordsHref} className="py-3 bg-green-500 text-white rounded-xl text-center font-bold">
            学習記録を見る
          </Link>
          {returnTo !== recordsHref && (
            <Link href={returnTo} className="py-3 bg-gray-100 text-gray-600 rounded-xl text-center text-sm">
              ホームへ戻る
            </Link>
          )}
          {showLogout && <LogoutButton className="text-xs text-gray-400 underline text-center" />}
        </div>
      </div>
    )
  }

  if (phase === 'complete') {
    const correct = qualities.filter(q => q >= 3).length
    const pct = Math.round((correct / questions.length) * 100)
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center gap-6">
        <div>
          <p className="text-6xl mb-4">🎉</p>
          <h1 className="text-2xl font-bold mb-2">今日の学習完了！</h1>
          <p className="text-gray-600 text-lg">
            {questions.length}問中{' '}
            <span className="font-bold text-green-600">{correct}問</span> 正解
          </p>
          <p className="text-gray-400 text-sm mt-1">正答率 {pct}%</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href={recordsHref} className="py-3 bg-green-500 text-white rounded-xl text-center font-bold">
            学習記録を見る
          </Link>
          {returnTo !== recordsHref && (
            <Link href={returnTo} className="py-3 bg-gray-100 text-gray-600 rounded-xl text-center text-sm">
              ホームへ戻る
            </Link>
          )}
          {showLogout && <LogoutButton className="text-xs text-gray-400 underline text-center" />}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col p-4 gap-4">
      {/* ヘッダー: やめる + 進捗 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleQuit}
          className="shrink-0 text-sm text-gray-500 bg-gray-100 rounded-lg px-3 py-1.5 active:scale-95 transition-transform"
          aria-label="学習をやめる"
        >
          ← やめる
        </button>
        <div className="flex-1">
          <ProgressBar current={index + 1} total={questions.length} />
        </div>
      </div>

      {studentName && (
        <p className="text-xs text-gray-400 -mt-2">{studentName}さんの学習</p>
      )}

      <QuestionCard question={current} />

      {phase === 'input' && (
        current.mode === 'ja_to_en_spell'
          ? <SpellingInput key={index} onSubmit={handleSubmit} />
          : <ChoiceInput key={index} choices={current.choices} onSubmit={handleSubmit} />
      )}

      {phase === 'result' && lastResult && (
        <ResultCard
          question={current}
          result={lastResult}
          onNext={handleNext}
          isLast={isLast}
        />
      )}
    </div>
  )
}
