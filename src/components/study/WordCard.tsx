import type { Word } from '@/types/database'

interface Props {
  word: Word
}

export function WordCard({ word }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 text-center flex-1 flex flex-col items-center justify-center">
      <div className="flex gap-2 justify-center mb-6">
        {word.grade && (
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
            {word.grade}
          </span>
        )}
        {word.level && (
          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
            {word.level}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-400 mb-3">英語でスペルを入力してください</p>
      <p className="text-4xl font-bold text-gray-900 leading-tight">{word.meaning}</p>
    </div>
  )
}
