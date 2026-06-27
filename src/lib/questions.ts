// 出題の組み立てと回答判定（モード別・複数正解対応）
import { levenshtein, type SpellingResultType } from '@/lib/levenshtein'
import type { Word } from '@/types/database'
import type { QuestionMode, StudyQuestion } from '@/types/api'

// 英語答えの正規化（小文字化・連続空白の圧縮・前後空白除去・末尾句読点除去）
export function normalizeEn(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// SM-2 の習熟段階から出題モードを決定（同じ語が日をまたいで別形式で再出題される）
export function pickMode(repetitions: number): QuestionMode {
  if (repetitions <= 0) return 'en_to_ja_choice'
  if (repetitions <= 2) return 'ja_to_en_choice'
  return 'ja_to_en_spell'
}

// 配列をシャッフル（非破壊）
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 正解 + 候補プールから4択を作る（重複・正解と同義のものは除外）
function buildChoices(correct: string, pool: string[], exclude: string[]): string[] {
  const excludeSet = new Set([correct, ...exclude].map(s => s.toLowerCase()))
  const seen = new Set<string>([correct.toLowerCase()])
  const distractors: string[] = []
  for (const cand of shuffle(pool)) {
    const key = cand.toLowerCase()
    if (excludeSet.has(key) || seen.has(key)) continue
    seen.add(key)
    distractors.push(cand)
    if (distractors.length >= 3) break
  }
  return shuffle([correct, ...distractors])
}

// 1問を組み立てる。distractors は呼び出し側が用意した候補文字列の配列。
export function buildQuestion(
  word: Word,
  mode: QuestionMode,
  distractors: string[],
): StudyQuestion {
  const answers = (word.answers_en && word.answers_en.length > 0) ? word.answers_en : [word.word]

  if (mode === 'en_to_ja_choice') {
    return {
      wordId: word.id,
      mode,
      prompt: word.word,
      isIdiom: word.is_idiom,
      choices: buildChoices(word.meaning, distractors, []),
      correctChoice: word.meaning,
      acceptableAnswers: [],
      word,
    }
  }

  if (mode === 'ja_to_en_choice') {
    return {
      wordId: word.id,
      mode,
      prompt: word.meaning,
      isIdiom: word.is_idiom,
      // 誤答に同義語が混ざらないよう answers をすべて除外
      choices: buildChoices(word.word, distractors, answers),
      correctChoice: word.word,
      acceptableAnswers: [],
      word,
    }
  }

  // ja_to_en_spell
  return {
    wordId: word.id,
    mode,
    prompt: word.meaning,
    isIdiom: word.is_idiom,
    choices: [],
    correctChoice: '',
    acceptableAnswers: answers,
    word,
  }
}

// スペル入力の長さに応じた許容編集距離（短語は厳しく、長い熟語は少し緩める）
function tolerance(len: number): number {
  if (len <= 5) return 1
  if (len <= 10) return 1
  return 2
}

// 回答判定。choice モードは選択肢一致、spell モードは複数正解にタイポ許容。
export function checkAnswer(
  question: StudyQuestion,
  input: string,
): { type: SpellingResultType; quality: number } {
  const value = input.trim()
  if (!value) return { type: 'wrong', quality: 0 }  // わからない

  if (question.mode === 'ja_to_en_spell') {
    const a = normalizeEn(value)
    let best: { type: SpellingResultType; quality: number } = { type: 'wrong', quality: 1 }
    for (const ans of question.acceptableAnswers) {
      const b = normalizeEn(ans)
      if (a === b) return { type: 'correct', quality: 5 }
      const dist = levenshtein(a, b)
      if (dist <= tolerance(b.length) && best.type !== 'close') {
        best = { type: 'close', quality: 3 }
      }
    }
    return best
  }

  // 4択
  return value === question.correctChoice
    ? { type: 'correct', quality: 5 }
    : { type: 'wrong', quality: 1 }
}
