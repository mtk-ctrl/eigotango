import type { Word, UserWordProgress } from './database'
import type { SpellingResultType } from '@/lib/levenshtein'

export interface StudyWordItem {
  word: Word
  progress: UserWordProgress | null  // null = 初めて見る単語
}

export interface TodayStudyResult {
  sessionId: string
  words: StudyWordItem[]
}

export interface SpellingResult {
  type: SpellingResultType
  input: string  // ユーザーの入力（空文字 = わからない）
}
