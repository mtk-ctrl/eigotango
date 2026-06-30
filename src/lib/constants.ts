// アプリ共通の定数（1日の問題数・プラン上限など）

export const GOAL_OPTIONS = [3, 4, 5, 10, 15, 20]
export const PREMIUM_GOAL_EXTRA = [30, 50]
export const DEFAULT_DAILY_GOAL = 10

// 1日に新しく学ぶ語数（新規）。復習(アクティブリコール)とは別枠。
export const NEW_GOAL_OPTIONS = [0, 1, 2, 3, 5, 10]
export const DEFAULT_NEW_PER_DAY = 3

// 新規語数の選択肢（プラン上限以下のみ。0=新規を出さず復習だけ）
export function newGoalOptionsFor(max: number): number[] {
  return NEW_GOAL_OPTIONS.filter(n => n <= max)
}

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
