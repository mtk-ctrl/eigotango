// SuperMemo SM-2 アルゴリズム（純粋関数 - 副作用なし）
// 参考: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
import { jstDate } from '@/lib/date'

export interface SM2Input {
  quality: number        // 回答品質 0-5
  repetitions: number    // 連続正解数
  easinessFactor: number // 難易度係数 EF（初期値 2.5、下限 1.3）
  intervalDays: number   // 現在の復習間隔（日数）
}

export interface SM2Result {
  repetitions: number
  easinessFactor: number
  intervalDays: number
  nextReviewDate: string  // 'YYYY-MM-DD'
}

export function calculateSM2({
  quality,
  repetitions,
  easinessFactor,
  intervalDays,
}: SM2Input): SM2Result {
  if (quality < 0 || quality > 5) throw new RangeError('quality must be 0–5')

  let newReps = repetitions
  let newEF = easinessFactor
  let newInterval = intervalDays

  if (quality >= 3) {
    if (repetitions === 0) newInterval = 1
    else if (repetitions === 1) newInterval = 6
    else newInterval = Math.round(intervalDays * easinessFactor)

    newEF = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    newEF = Math.max(1.3, parseFloat(newEF.toFixed(2)))
    newReps = repetitions + 1
  } else {
    // 不正解: インターバルをリセット（EF は据え置き）
    newInterval = 1
    newReps = 0
  }

  return {
    repetitions: newReps,
    easinessFactor: newEF,
    intervalDays: newInterval,
    nextReviewDate: jstDate(newInterval),  // JST の「今日 + 間隔日数」
  }
}

// UI の3択 → SM-2 quality スコア変換
export const QUALITY_MAP = {
  perfect: 5,  // 知ってた！（即答）
  good: 3,     // なんとなく（正解）
  forgot: 1,   // 知らなかった（不正解）
} as const

export type AnswerChoice = keyof typeof QUALITY_MAP
