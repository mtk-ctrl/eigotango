import type { Word, UserWordProgress } from './database'
import type { SpellingResultType } from '@/lib/levenshtein'

export interface StudyWordItem {
  word: Word
  progress: UserWordProgress | null  // null = 初めて見る単語
}

// 出題モード
// en_to_ja_choice : 英語を見て日本語を4択（意味の理解・最易）
// ja_to_en_choice : 日本語を見て英語を4択（産出・中）
// ja_to_en_spell  : 日本語を見て英語をスペル入力（産出・最難）
export type QuestionMode = 'en_to_ja_choice' | 'ja_to_en_choice' | 'ja_to_en_spell'

export interface StudyQuestion {
  wordId: string
  mode: QuestionMode
  prompt: string             // 表示する問題文（英語 or 日本語）
  isIdiom: boolean
  choices: string[]          // 4択モードの選択肢（spell では空）
  correctChoice: string      // 4択の正解（spell では空文字）
  acceptableAnswers: string[]// spell モードで受理する英語（複数正解）
  word: Word                 // 結果表示用
}

export interface TodayStudyResult {
  sessionId: string
  questions: StudyQuestion[]
}

export interface SpellingResult {
  type: SpellingResultType
  input: string  // ユーザーの入力 / 選んだ選択肢（空文字 = わからない）
}
