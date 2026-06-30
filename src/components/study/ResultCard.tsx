import type { StudyQuestion, SpellingResult } from '@/types/api'
import { SpeakButton } from './SpeakButton'

interface Props {
  question: StudyQuestion
  result: SpellingResult
  onNext: () => void
  isLast: boolean
  onMarkKnown?: () => void   // 正解時のみ。「もう覚えてる」で今後の出題対象から外す
  marking?: boolean
}

const CONFIG = {
  correct: { bg: 'bg-green-50', border: 'border-green-200', label: '正解！', emoji: '✅' },
  close:   { bg: 'bg-yellow-50', border: 'border-yellow-200', label: '惜しい！', emoji: '⚠️' },
  wrong:   { bg: 'bg-red-50', border: 'border-red-200', label: '不正解', emoji: '❌' },
}

export function ResultCard({ question, result, onNext, isLast, onMarkKnown, marking }: Props) {
  const c = CONFIG[result.type]
  const { word, mode } = question

  // 日本語を答えるモードは正解＝日本語、英語を答えるモードは正解＝英語
  const isJaAnswer = mode === 'en_to_ja_choice'
  const mainAnswer = isJaAnswer ? word.meaning : word.word
  // 英語の別解（many に対する a lot of など）
  const otherAnswers = isJaAnswer
    ? []
    : (word.answers_en ?? []).filter(a => a.toLowerCase() !== word.word.toLowerCase())

  return (
    <div className="flex flex-col gap-4">
      <div className={`${c.bg} border ${c.border} rounded-2xl p-6 text-center`}>
        <p className="text-4xl mb-2">{c.emoji}</p>
        <p className="font-bold text-xl mb-3">{c.label}</p>

        {result.type !== 'correct' && result.input && (
          <p className="text-gray-500 text-sm mb-2">
            あなたの回答: <span className="line-through">{result.input}</span>
          </p>
        )}

        <p className="text-3xl font-bold tracking-wide mb-1 break-words">{mainAnswer}</p>
        {/* 答えの反対側（英語問題なら日本語、日本語問題なら英語）も補助表示 */}
        <p className="text-gray-500 text-base mb-2">
          {isJaAnswer ? word.word : word.meaning}
        </p>
        {otherAnswers.length > 0 && (
          <p className="text-gray-500 text-sm mb-2">
            他の正解: {otherAnswers.join(' / ')}
          </p>
        )}
        {word.reading && isJaAnswer === false && (
          <p className="text-gray-400 text-sm mb-3">{word.reading}</p>
        )}
        <SpeakButton word={word.word} />
      </div>

      {word.example_en && (
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">例文</p>
          <p className="text-gray-800 text-sm">{word.example_en}</p>
          {word.example_ja && (
            <p className="text-gray-400 text-xs mt-1">{word.example_ja}</p>
          )}
        </div>
      )}

      <button
        onClick={onNext}
        disabled={marking}
        className="w-full py-4 bg-gray-900 text-white rounded-xl text-lg font-bold active:scale-95 transition-transform disabled:opacity-50"
      >
        {isLast ? '完了！' : '次へ →'}
      </button>

      {/* 正解した語は「もう覚えてる」で今後アクティブリコールの対象から外せる */}
      {result.type === 'correct' && onMarkKnown && (
        <button
          onClick={onMarkKnown}
          disabled={marking}
          className="w-full py-3 bg-white text-gray-600 rounded-xl text-sm font-bold border-2 border-gray-200 active:scale-95 transition-transform disabled:opacity-50"
        >
          {marking ? '設定中…' : '✓ もうこの単語は覚えてる（今後出題しない）'}
        </button>
      )}
    </div>
  )
}
