// アプリ共通の定数（1日の問題数・プラン上限など）

export const GOAL_OPTIONS = [3, 4, 5, 10, 15, 20]
export const PREMIUM_GOAL_EXTRA = [30, 50]
export const DEFAULT_DAILY_GOAL = 10

// プラン別の1日の出題上限
export const FREE_DAILY_MAX = 20
export const PREMIUM_DAILY_MAX = 100

// 端末管理の子ども（ログイン不要）の合成メールのドメイン
// （.local など予約 TLD は GoTrue のメール検証で弾かれることがあるため通常の gTLD を使う）
export const MANAGED_EMAIL_DOMAIN = '@managed.eigotango.app'

// プラン上限 max に応じた問題数の選択肢（max 以下のみ）
export function goalOptionsFor(max: number): number[] {
  const base = max > FREE_DAILY_MAX ? [...GOAL_OPTIONS, ...PREMIUM_GOAL_EXTRA] : [...GOAL_OPTIONS]
  return base.filter(n => n <= max)
}
