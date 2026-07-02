'use client'

import { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ProgressBar } from '@/components/study/ProgressBar'
import { QuestionCard } from '@/components/study/QuestionCard'
import { SpellingInput } from '@/components/study/SpellingInput'
import { ChoiceInput } from '@/components/study/ChoiceInput'
import { ResultCard } from '@/components/study/ResultCard'
import { checkAnswer } from '@/lib/questions'
import { recordAnswer, completeSession, setWordsKnown } from '@/app/actions/study'
import { LogoutButton } from '@/components/LogoutButton'
import type { StudyQuestion, SpellingResult } from '@/types/api'

interface Props {
  questions: StudyQuestion[]
  sessionId: string
  studentId: string
  studentName?: string   // 親が子の代わりに学習しているとき表示
  returnTo: string       // 「やめる」「ホームへ戻る」の戻り先
  recordsHref: string    // 学習記録（進捗）へのリンク
  continueHref?: string  // 完了後に「もっとやる」で開く新規学習の URL（/study or /study?child=）
  showLogout: boolean    // 本人ログイン時のみログアウトを出す
  mode?: 'new' | 'review'  // 文言の出し分け（新規 / 復習）
}

type Phase = 'input' | 'result' | 'complete'

export function StudyClient({ questions: questionsProp, sessionId, studentId, studentName, returnTo, recordsHref, continueHref, showLogout, mode = 'new' }: Props) {
  const isReview = mode === 'review'
  const doneTitle = isReview ? '今日の復習完了！' : '今日の学習完了！'
  const emptyTitle = isReview ? '今日の復習はありません' : '新しい単語は今日のぶん完了！'
  const router = useRouter()

  // 問題セットはマウント時のスナップショットに固定する（最重要）。
  // Server Action が revalidatePath を呼ぶと /study がサーバーで再実行され、
  // getStudyWords が「答えたばかりの語を除いた1つずれた questions」を prop として
  // 再配信してくる。prop をそのまま使うと index/phase の state は残ったまま
  // 中身だけ差し替わり、結果表示中の画面が数秒後に勝手に次の単語の答えに変わる。
  // useState の初期値は初回レンダーの値だけを取り込むので、以降の再配信を無視できる。
  const [questions] = useState(questionsProp)

  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('input')
  const [lastResult, setLastResult] = useState<SpellingResult | null>(null)
  const [qualities, setQualities] = useState<number[]>([])
  const [marking, setMarking] = useState(false)

  // まちがい直し: 本編でまちがえた問題を最後にもう一度出す（全部正解するまで繰り返し）。
  // 直しの回答は SM-2 に記録しない（本編の回答だけが成績・復習間隔に反映される）。
  const [retryQueue, setRetryQueue] = useState<StudyQuestion[]>([])
  const [retryIndex, setRetryIndex] = useState(0)
  const [inRetry, setInRetry] = useState(false)

  // 連続正解コンボ（まちがえると0に戻る）。ノッてきた感を可視化するモチベーション演出
  const [combo, setCombo] = useState(0)

  // 連打・二重タップで回答が二重記録されたり問題が飛んだりしないよう、
  // フェーズ遷移をレンダリングを待たず同期的にガードする
  const phaseRef = useRef<Phase>('input')
  const setPhaseSafe = useCallback((p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  // 画面遷移の最短間隔ガード。Android の IME が Enter を遅延して複数配信したり、
  // タップのゴーストクリックが直後に描画された「次へ」ボタンへ命中したりすると、
  // フェーズガードだけでは「回答→次へ→次の回答」と正規ルートを一気に通り抜けて
  // しまう（＝次の問題の答えが勝手に表示される）。連続遷移を時間で遮断する。
  const lastTransitionRef = useRef(0)
  const passTransitionGuard = useCallback(() => {
    const now = Date.now()
    if (now - lastTransitionRef.current < 400) return false
    lastTransitionRef.current = now
    return true
  }, [])

  const current = inRetry ? retryQueue[retryIndex] : questions[index]
  // 本編の最後でもまちがい直しが残っていれば「次へ」（完了はまちがい直しの後）
  const isLast = inRetry
    ? retryIndex + 1 >= retryQueue.length
    : index + 1 >= questions.length && retryQueue.length === 0

  // 完了画面用: 今日まちがえた単語（重複なし）
  const wrongWords = [...new Map(retryQueue.map(q => [q.wordId, q.word])).values()]

  const handleSubmit = useCallback(async (input: string) => {
    if (!current || phaseRef.current !== 'input') return
    if (!passTransitionGuard()) return
    const { type, quality } = checkAnswer(current, input)
    setLastResult({ type, input })
    setPhaseSafe('result')
    setCombo(c => (type === 'wrong' ? 0 : c + 1))
    if (type === 'wrong') {
      // まちがえた問題は後ろに積み直す（まちがい直し中も、正解するまで繰り返す）
      setRetryQueue(prev => [...prev, current])
    }
    if (inRetry) return  // 直しの回答は記録しない

    setQualities(prev => [...prev, quality])
    try {
      await recordAnswer({ studentId, sessionId, wordId: current.wordId, quality })
    } catch {
      // 結果表示は維持しつつ、記録漏れの可能性をユーザーに知らせる
      alert('回答の保存に失敗しました。通信環境を確認してください。この単語は記録されていない可能性があります。')
    }
  }, [current, inRetry, sessionId, studentId, setPhaseSafe, passTransitionGuard])

  const handleNext = useCallback(async () => {
    if (phaseRef.current !== 'result') return
    if (!passTransitionGuard()) return

    if (!inRetry) {
      if (index + 1 < questions.length) {
        setIndex(i => i + 1)
        setPhaseSafe('input')
        setLastResult(null)
        setMarking(false)
        return
      }
      // 本編終了。セッション完了（成績確定・親通知）はここで行い、まちがい直しはおまけ扱い。
      // 完了処理が通信断で失敗しても回答自体は保存済みなので、画面は先へ進める。
      phaseRef.current = 'complete'
      try {
        await completeSession(studentId, sessionId)
      } catch (e) {
        console.error('[StudyClient] completeSession failed:', e)
      }
      if (retryQueue.length > 0) {
        setInRetry(true)
        setRetryIndex(0)
        setLastResult(null)
        setMarking(false)
        setPhaseSafe('input')
      } else {
        setPhaseSafe('complete')
      }
      return
    }

    // まちがい直し中
    if (retryIndex + 1 < retryQueue.length) {
      setRetryIndex(i => i + 1)
      setPhaseSafe('input')
      setLastResult(null)
      setMarking(false)
    } else {
      setPhaseSafe('complete')
    }
  }, [inRetry, index, questions.length, retryIndex, retryQueue.length, sessionId, studentId, setPhaseSafe, passTransitionGuard])

  // 正解した語を「もう覚えてる」にして今後の出題対象から外し、次へ進む
  const handleMarkKnown = useCallback(async () => {
    if (!current || marking) return
    setMarking(true)
    try {
      await setWordsKnown([current.wordId], true, studentId)
    } catch {
      // 失敗時は誤って「設定済み」と思わせないよう通知し、再試行できるよう中断
      alert('設定に失敗しました。通信環境を確認してもう一度お試しください。')
      setMarking(false)
      return
    }
    // ここまで来たら意図的な操作＋保存済みなので、連続遷移ガードに阻まれず必ず次へ進める
    lastTransitionRef.current = 0
    await handleNext()
  }, [current, marking, studentId, handleNext])

  const handleQuit = useCallback(() => {
    if (index === 0 && phase === 'input' && !inRetry) {
      router.push(returnTo)
      return
    }
    if (confirm('学習を中断しますか？\nここまでの回答は保存されています。')) {
      router.push(returnTo)
    }
  }, [router, returnTo, index, phase, inRetry])

  if (questions.length === 0) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center gap-6">
        <div>
          <p className="text-5xl mb-4">🌟</p>
          <p className="text-xl font-bold">{emptyTitle}</p>
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
          <h1 className="text-2xl font-bold mb-2">{doneTitle}</h1>
          <p className="text-gray-600 text-lg">
            {questions.length}問中{' '}
            <span className="font-bold text-green-600">{correct}問</span> 正解
          </p>
          <p className="text-gray-400 text-sm mt-1">正答率 {pct}%</p>
          {wrongWords.length > 0 && (
            <p className="text-gray-500 text-sm mt-1">まちがい直しもクリア！ 💪</p>
          )}
        </div>

        {/* 今日まちがえた単語のふりかえり（復習にくり返し出てくる） */}
        {wrongWords.length > 0 && (
          <div className="w-full max-w-xs rounded-2xl bg-white border border-gray-100 p-4 text-left shadow-sm">
            <p className="text-xs font-bold text-gray-500 mb-2">今日まちがえた単語（また復習に出るよ）</p>
            <div className="max-h-40 overflow-y-auto">
              {wrongWords.map(w => (
                <div key={w.id} className="flex items-baseline justify-between gap-3 border-b border-gray-50 py-1.5 last:border-0">
                  <span className="font-bold text-gray-800">{w.word}</span>
                  <span className="truncate text-right text-sm text-gray-500">{w.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs">
          {/* もっとやる: /study は開くたびに次の未学習バッチを出すので、設定数を超えて
              何周でも先へ進める。同一URLへの SPA 遷移だと固定した問題セットが
              リセットされないため、location でフル再読み込みして確実に次の問題を出す */}
          {continueHref && (
            <button
              onClick={() => window.location.assign(continueHref)}
              className="py-4 bg-orange-500 text-white rounded-xl text-center text-lg font-bold active:scale-95 transition-transform"
            >
              {isReview ? '📚 新しい単語もやる！' : `🚀 もう${questions.length}語 おぼえる！`}
            </button>
          )}
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
          {inRetry ? (
            <ProgressBar current={retryIndex + 1} total={retryQueue.length} />
          ) : (
            <ProgressBar current={index + 1} total={questions.length} />
          )}
        </div>
      </div>

      {inRetry && (
        <p className="text-xs font-bold text-orange-500 -mt-2">
          🔁 まちがい直し — 全部正解でゴール！
        </p>
      )}
      {studentName && (
        <p className="text-xs text-gray-400 -mt-2">{studentName}さんの学習</p>
      )}

      <QuestionCard question={current} />

      {phase === 'input' && (
        current.mode === 'ja_to_en_spell'
          ? <SpellingInput key={`${inRetry ? 'r' : 'm'}-${inRetry ? retryIndex : index}`} onSubmit={handleSubmit} />
          : <ChoiceInput key={`${inRetry ? 'r' : 'm'}-${inRetry ? retryIndex : index}`} choices={current.choices} onSubmit={handleSubmit} />
      )}

      {phase === 'result' && lastResult && (
        <ResultCard
          question={current}
          result={lastResult}
          combo={combo}
          onNext={handleNext}
          isLast={isLast}
          onMarkKnown={lastResult.type === 'correct' && !inRetry ? handleMarkKnown : undefined}
          marking={marking}
        />
      )}
    </div>
  )
}
