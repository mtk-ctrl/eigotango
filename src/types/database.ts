// DB テーブルの TypeScript 型定義
// `npx supabase gen types typescript` で自動生成に置き換え可能

export type UserRole = 'student' | 'parent'
export type SubscriptionPlan = 'free' | 'premium'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due'
export type Grade = '中1' | '中2' | '中3'
export type WordLevel = '基礎' | '標準' | '難関'
export type NotificationChannel = 'line' | 'email' | 'both'

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

export interface Word {
  id: string
  word: string
  reading: string | null
  meaning: string
  example_en: string | null
  example_ja: string | null
  grade: Grade | null
  level: WordLevel | null
  tags: string[] | null
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
