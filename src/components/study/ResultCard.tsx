import type { Word } from '@/types/database'
import type { SpellingResult } from '@/types/api'
import { SpeakButton } from './SpeakButton'

interface Props {
  word: Word
  result: SpellingResult
  onNext: () => void
  isLast: boolean
}

const CONFIG = {
  correct: { bg: 'bg-green-50', border: 'border-green-200', label: '正解！', emoji: '✅' },
  close:   { bg: 'bg-yellow-50', border: 'border-yellow-200', label: '惜しい！', emoji: '⚠️' },
  wrong:   { bg: 'bg-red-50', border: 'border-red-200', label: '不正解', emoji: '❌' },
}

export function ResultCard({ word, result, onNext, isLast }: Props) {
  const c = CONFIG[result.type]

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

        <p className="text-3xl font-bold tracking-wide mb-3">{word.word}</p>
        {word.reading && (
          <p className="text-gray-500 text-sm mb-3">{word.reading}</p>
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
        className="w-full py-4 bg-gray-900 text-white rounded-xl text-lg font-bold active:scale-95 transition-transform"
      >
        {isLast ? '完了！' : '次へ →'}
      </button>
    </div>
  )
}
