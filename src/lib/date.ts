// アプリ全体の「今日」は日本時間（JST=UTC+9・DSTなし）で統一する。
// toISOString() は UTC を返すため、JST 0:00〜9:00 に前日扱いになるのを防ぐ。
// offsetDays で前後の日付も取得（例: jstDate(-6) は6日前、jstDate(1) は明日）。
export function jstDate(offsetDays = 0): string {
  const ms = Date.now() + 9 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000
  return new Date(ms).toISOString().split('T')[0]
}

// JST のある日の 0:00（=日付の境界）を UTC ISO で返す。
// timestamptz 列（first_learned_at 等）を「JST の何日に属するか」で範囲比較するのに使う。
export function jstDayStartUtc(offsetDays = 0): string {
  return new Date(`${jstDate(offsetDays)}T00:00:00+09:00`).toISOString()
}
