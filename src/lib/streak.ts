// 連続学習日数の計算（親ホームの子カード・生徒ホームの自分バッジで共用）

// 完了済みセッション日付の集合から、今日/昨日を起点とした連続日数を計算。
// today は JST の 'YYYY-MM-DD'。今日まだ未完了でも昨日まで続いていれば連続として数える。
export function calcStreak(dateSet: Set<string>, today: string): number {
  const iso = (d: Date) => d.toISOString().split('T')[0]
  const cur = new Date(today + 'T00:00:00Z')
  if (!dateSet.has(iso(cur))) cur.setUTCDate(cur.getUTCDate() - 1)
  let streak = 0
  while (dateSet.has(iso(cur))) {
    streak++
    cur.setUTCDate(cur.getUTCDate() - 1)
  }
  return streak
}
