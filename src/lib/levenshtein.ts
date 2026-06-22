// Levenshtein 編集距離（タイポ検出用）
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export type SpellingResultType = 'correct' | 'close' | 'wrong'

// 入力と正解を比較して SM-2 品質スコアを返す
// correct: 完全一致(5)  close: 1文字ミス(3)  wrong: それ以外(1)
export function checkSpelling(
  input: string,
  correct: string
): { type: SpellingResultType; quality: number } {
  const a = input.trim().toLowerCase()
  const b = correct.toLowerCase()
  if (a === b) return { type: 'correct', quality: 5 }
  if (a.length > 0 && levenshtein(a, b) <= 1) return { type: 'close', quality: 3 }
  return { type: 'wrong', quality: 1 }
}
