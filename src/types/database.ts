// DB テーブルの TypeScript 型定義
// `npx supabase gen types typescript` で自動生成に置き換え可能

export type UserRole = 'student' | 'parent'
export type SubscriptionPlan = 'free' | 'premium'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due'
export type Grade = '中1' | '中2' | '中3'
export type WordLevel = '基礎' | '標準' | '難関'
export type NotificationChannel = 'none' | 'line' | 'email' | 'both'
export type QuestionModeSetting = 'auto' | 'en_to_ja_choice' | 'ja_to_en_choice' | 'ja_to_en_spell'

export interface Profile {
  id: string
  role: UserRole
  display_name: string | null
  email: string | null
  line_user_id: string | null
  line_display_name: string | null
  notification_channel: NotificationChannel
  notification_time: string  // 'HH:MM:SS'
  timezone: string
  daily_goal: number             // 1日の復習(アクティブリコール)の上限
  new_per_day: number            // 1日に新しく学ぶ語数（新規・既定3）
  copy_header: string | null     // 単語リストのコピー時に先頭へ付ける見出し（空/NULL=なし）
  question_mode: QuestionModeSetting  // 出題形式（既定 auto=SM-2習熟段階で自動切替）
  daily_goal_locked: boolean     // 親が設定したらロック（本人は変更不可）
  managed_by: string | null      // 親が端末上で管理する子ども（ログイン不要）の親 ID
  created_at: string
}

export interface StudentParentRelation {
  id: string
  student_id: string
  parent_id: string
  pairing_code: string | null
  pairing_code_expires_at: string | null
  paired_at: string | null
  created_at: string
}

export interface Subscription {
  id: string
  parent_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: SubscriptionPlan
  status: SubscriptionStatus
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export type WordTier = 'free' | 'premium'

export interface Word {
  id: string
  word: string                   // 代表的な英語答え（表示・選択肢用）
  reading: string | null
  meaning: string                // 日本語の意味
  example_en: string | null
  example_ja: string | null
  grade: Grade | null
  level: WordLevel | null
  tags: string[] | null
  answers_en: string[] | null    // 受理する英語答え（複数可: many / a lot of）
  is_idiom: boolean              // 熟語かどうか
  tier: WordTier                 // free（基本100語）/ premium（高校受験）
  sort_order: number | null      // カリキュラム順（基礎=テーマ別の小さい番号 / 受験語=null）
  created_at: string
}

export interface UserWordProgress {
  id: string
  student_id: string
  word_id: string
  easiness_factor: number      // SM-2 EF値（初期: 2.5）
  interval_days: number        // 現在の復習間隔
  repetitions: number          // 連続正解数
  next_review_date: string     // 'YYYY-MM-DD'
  total_reviews: number
  correct_count: number
  last_quality: number | null  // 最後の回答品質 (0-5)
  known: boolean               // 理解済み（スキップ対象・新規/復習に出さない）
  first_learned_at: string | null
  last_reviewed_at: string | null
  created_at: string
}

export interface StudySession {
  id: string
  student_id: string
  session_date: string   // 'YYYY-MM-DD'
  total_words: number
  correct_words: number
  completed_at: string | null
  parent_notified_at: string | null
  created_at: string
}

export interface SessionAnswer {
  id: string
  session_id: string
  word_id: string
  quality: number   // 0-5
  answered_at: string
}
