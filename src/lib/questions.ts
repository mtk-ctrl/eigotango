// 出題の組み立てと回答判定（モード別・複数正解対応）
import { levenshtein, type SpellingResultType } from '@/lib/levenshtein'
import type { Word } from '@/types/database'
import type { QuestionMode, StudyQuestion } from '@/types/api'

// 誤答候補の素材（同 tier の他の語）
export interface PoolItem {
  word: string
  meaning: string
  grade: string | null
  level: string | null
  isIdiom: boolean
}

// 英語答えの正規化（小文字化・連続空白の圧縮・前後空白除去・末尾句読点除去）
export function normalizeEn(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// 日本語の意味を語義トークンに分解（「、」「,」「/」などで区切る）
function meaningTokens(meaning: string): Set<string> {
  return new Set(
    meaning
      .split(/[、,，/／・;；]/)
      .map(t => t.replace(/[（(].*?[)）]/g, '').trim())
      .filter(Boolean),
  )
}

// 2つの意味が語義を共有するか（= 同義の可能性 → 誤答に使わない）
function sharesMeaning(a: string, b: string): boolean {
  const ta = meaningTokens(a)
  for (const t of meaningTokens(b)) if (ta.has(t)) return true
  return false
}

// SM-2 の習熟段階から出題モードを決定（同じ語が日をまたいで別形式で再出題される）
// 熟語はスペル入力が酷なので 4 択のみにする。
export function pickMode(repetitions: number, isIdiom: boolean): QuestionMode {
  if (repetitions <= 0) return 'en_to_ja_choice'
  if (isIdiom) return 'ja_to_en_choice'
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

// 正解 + 候補から4択を作る（重複・除外語を除く）
function buildChoices(correct: string, candidates: string[], exclude: string[]): string[] {
  const excludeSet = new Set([correct, ...exclude].map(s => s.toLowerCase()))
  const seen = new Set<string>([correct.toLowerCase()])
  const distractors: string[] = []
  for (const cand of shuffle(candidates)) {
    const key = cand.toLowerCase()
    if (excludeSet.has(key) || seen.has(key)) continue
    seen.add(key)
    distractors.push(cand)
    if (distractors.length >= 3) break
  }
  return shuffle([correct, ...distractors])
}

// 誤答候補を出題語の難易度に近いものへ絞り込む（例: 中1基礎の dog に対し
// 中3受験レベルの熟語が紛れ込む、といった難易度のミスマッチを防ぐ）。
// 「同学年+同じ熟語区分」→「同学年」→「プール全体」の順に、正解と語義が
// 重ならない候補が3件以上見つかる段階まで段階的に広げる。
function pickCandidatePool(word: Word, pool: PoolItem[]): PoolItem[] {
  const sameGradeAndKind = pool.filter(p => p.grade === word.grade && p.isIdiom === word.is_idiom)
  const sameGrade = pool.filter(p => p.grade === word.grade)
  for (const candidates of [sameGradeAndKind, sameGrade, pool]) {
    const safeCount = candidates.filter(p => !sharesMeaning(p.meaning, word.meaning)).length
    if (safeCount >= 3) return candidates
  }
  return pool
}

// 1問を組み立てる。pool は同 tier の他の語（誤答の素材）。
export function buildQuestion(
  word: Word,
  mode: QuestionMode,
  pool: PoolItem[],
): StudyQuestion {
  const answers = (word.answers_en && word.answers_en.length > 0) ? word.answers_en : [word.word]
  const candidates = pickCandidatePool(word, pool)
  // 正解と語義が重なる語は誤答に使わない（big/large, glad/happy などの取り違え防止）
  const safe = candidates.filter(p => !sharesMeaning(p.meaning, word.meaning))

  if (mode === 'en_to_ja_choice') {
    return {
      wordId: word.id,
      mode,
      prompt: word.word,
      isIdiom: word.is_idiom,
      choices: buildChoices(word.meaning, safe.map(p => p.meaning), []),
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
      choices: buildChoices(word.word, safe.map(p => p.word), answers),
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

// スペル入力の長さに応じた許容編集距離（短語は厳しく、長い語は少し緩める）
function tolerance(len: number): number {
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
