import type { StudyQuestion } from '@/types/api'

interface Props {
  question: StudyQuestion
}

const INSTRUCTION: Record<StudyQuestion['mode'], string> = {
  en_to_ja_choice: '日本語の意味を選んでください',
  ja_to_en_choice: '英語を選んでください',
  ja_to_en_spell: '英語でスペルを入力してください',
}

export function QuestionCard({ question }: Props) {
  const { word, mode, prompt, isIdiom } = question
  // 英語が問題文のときは少し小さめ（熟語は長いため）
  const promptSize = mode === 'en_to_ja_choice' ? 'text-3xl' : 'text-4xl'

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 text-center flex-1 flex flex-col items-center justify-center">
      <div className="flex gap-2 justify-center mb-6 flex-wrap">
        {word.grade && (
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{word.grade}</span>
        )}
        {word.level && (
          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">{word.level}</span>
        )}
        {isIdiom && (
          <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">熟語</span>
        )}
      </div>
      <p className="text-sm text-gray-400 mb-3">{INSTRUCTION[mode]}</p>
      <p className={`${promptSize} font-bold text-gray-900 leading-tight break-words`}>{prompt}</p>
    </div>
  )
}
