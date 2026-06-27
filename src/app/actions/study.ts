'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { calculateSM2 } from '@/lib/sm2'
import { sendLinePushMessage } from '@/lib/line'
import { sendEmail, buildParentNotificationHtml } from '@/lib/email'
import type { Word, UserWordProgress } from '@/types/database'
import type { TodayStudyResult } from '@/types/api'

// プラン別の1日の出題上限（daily_goal をこの範囲にクランプ）
const FREE_MAX = 20
const PREMIUM_MAX = 100

// 現在のログインユーザー ID
async function currentUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ログイン中ユーザーがこの student のデータを操作してよいか検証。
// 許可: 本人 / ペアリング済みの親 / 端末管理（managed_by）の親。不正なら throw。
async function authorizeStudent(studentId: string): Promise<string> {
  const uid = await currentUserId()
  if (!uid) throw new Error('Unauthorized')
  if (studentId === uid) return uid

  const admin = createAdminClient()
  const { data: rel } = await admin
    .from('student_parent_relations')
    .select('id')
    .eq('parent_id', uid)
    .eq('student_id', studentId)
    .not('paired_at', 'is', null)
    .maybeSingle()
  if (rel) return uid

  const { data: managed } = await admin
    .from('profiles')
    .select('id')
    .eq('id', studentId)
    .eq('managed_by', uid)
    .maybeSingle()
  if (managed) return uid

  throw new Error('Forbidden')
}

// 課金主体（親）を特定: 端末管理の親 → ペアリングの親 → 本人
async function resolveBillingParent(studentId: string): Promise<string> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('managed_by')
    .eq('id', studentId)
    .single()
  if (profile?.managed_by) return profile.managed_by

  const { data: rel } = await admin
    .from('student_parent_relations')
    .select('parent_id')
    .eq('student_id', studentId)
    .not('paired_at', 'is', null)
    .limit(1)
    .maybeSingle()
  return rel?.parent_id ?? studentId
}

// student の課金プランに応じた1日の出題上限（無料20 / プレミアム100）
export async function getStudentDailyMax(studentId: string): Promise<number> {
  const admin = createAdminClient()
  const billingParent = await resolveBillingParent(studentId)
  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan')
    .eq('parent_id', billingParent)
    .maybeSingle()
  return sub?.plan === 'premium' ? PREMIUM_MAX : FREE_MAX
}

// student の1日の出題語数（daily_goal をプラン上限でクランプ）
async function getDailyGoal(studentId: string): Promise<number> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('daily_goal')
    .eq('id', studentId)
    .single()

  const max = await getStudentDailyMax(studentId)
  return Math.min(Math.max(profile?.daily_goal ?? 10, 1), max)
}

// 今日の学習単語リストを取得（復習 + 新規）
// studentId 省略時はログイン中の本人。指定時は親が子の代わりに取得（要認可）。
export async function getTodayStudyWords(studentId?: string): Promise<TodayStudyResult> {
  const sid = studentId ?? (await currentUserId())
  if (!sid) return { sessionId: '', words: [] }
  await authorizeStudent(sid)

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const limit = await getDailyGoal(sid)

  // 1. 復習単語（next_review_date が今日以前）
  const { data: progressRows } = await admin
    .from('user_word_progress')
    .select('*, word:words(*)')
    .eq('student_id', sid)
    .lte('next_review_date', today)
    .order('next_review_date')
    .limit(limit)

  const reviewItems = progressRows ?? []
  const remaining = limit - reviewItems.length

  // 2. 新規単語（まだ学習していない）
  const newWordItems: { word: Word; progress: null }[] = []
  if (remaining > 0) {
    const { data: allProgress } = await admin
      .from('user_word_progress')
      .select('word_id')
      .eq('student_id', sid)

    const studiedIds = allProgress?.map(r => r.word_id) ?? []
    let query = admin.from('words').select('*').order('grade').limit(remaining)
    if (studiedIds.length > 0) {
      query = query.not('id', 'in', `(${studiedIds.join(',')})`)
    }
    const { data: newWords } = await query
    newWordItems.push(...(newWords ?? []).map(w => ({ word: w as Word, progress: null })))
  }

  // 3. 当日セッションを取得 or 作成
  let sessionId = ''
  const { data: existingSession } = await admin
    .from('study_sessions')
    .select('id')
    .eq('student_id', sid)
    .eq('session_date', today)
    .maybeSingle()

  if (existingSession) {
    sessionId = existingSession.id
  } else {
    const { data: newSession } = await admin
      .from('study_sessions')
      .insert({ student_id: sid, session_date: today })
      .select('id')
      .single()
    sessionId = newSession?.id ?? ''
  }

  return {
    sessionId,
    words: [
      ...reviewItems.map(r => ({ word: r.word as Word, progress: r as UserWordProgress })),
      ...newWordItems,
    ],
  }
}

// 1問分の回答を記録して SM-2 を更新
export async function recordAnswer({
  studentId,
  sessionId,
  wordId,
  quality,
}: {
  studentId: string
  sessionId: string
  wordId: string
  quality: number
}) {
  await authorizeStudent(studentId)
  const admin = createAdminClient()

  const { data: progress } = await admin
    .from('user_word_progress')
    .select('*')
    .eq('student_id', studentId)
    .eq('word_id', wordId)
    .maybeSingle()

  const sm2 = calculateSM2({
    quality,
    repetitions: progress?.repetitions ?? 0,
    easinessFactor: progress?.easiness_factor ?? 2.5,
    intervalDays: progress?.interval_days ?? 1,
  })

  const now = new Date().toISOString()

  await Promise.all([
    admin.from('user_word_progress').upsert({
      student_id: studentId,
      word_id: wordId,
      easiness_factor: sm2.easinessFactor,
      interval_days: sm2.intervalDays,
      repetitions: sm2.repetitions,
      next_review_date: sm2.nextReviewDate,
      total_reviews: (progress?.total_reviews ?? 0) + 1,
      correct_count: (progress?.correct_count ?? 0) + (quality >= 3 ? 1 : 0),
      last_quality: quality,
      first_learned_at: progress?.first_learned_at ?? now,
      last_reviewed_at: now,
    }, { onConflict: 'student_id,word_id' }),

    admin.from('session_answers').insert({ session_id: sessionId, word_id: wordId, quality }),
  ])
}

// セッション完了を記録 + 親へ通知（LINE / メール / 両方）
export async function completeSession(
  studentId: string,
  sessionId: string,
  correctCount: number,
  totalCount: number,
) {
  const actingUserId = await authorizeStudent(studentId)
  const admin = createAdminClient()
  const now = new Date().toISOString()

  await admin.from('study_sessions').update({
    total_words: totalCount,
    correct_words: correctCount,
    completed_at: now,
  }).eq('id', sessionId)

  // 親への通知（失敗してもセッション完了は確定させる）
  try {
    const { data: me } = await admin
      .from('profiles')
      .select('display_name, line_display_name, managed_by')
      .eq('id', studentId)
      .single()

    const name = me?.line_display_name ?? me?.display_name ?? '子ども'

    // 通知先の親を特定（端末管理 → ペアリング）
    let parentId = me?.managed_by ?? null
    if (!parentId) {
      const { data: rel } = await admin
        .from('student_parent_relations')
        .select('parent_id')
        .eq('student_id', studentId)
        .not('paired_at', 'is', null)
        .limit(1)
        .maybeSingle()
      parentId = rel?.parent_id ?? null
    }

    // 親なし（子だけ / 親だけ自習）、または親本人が目の前で操作中 → 通知不要
    if (!parentId || parentId === actingUserId) return

    const { data: parent } = await admin
      .from('profiles')
      .select('line_user_id, email, notification_channel')
      .eq('id', parentId)
      .single()
    if (!parent) return

    const pct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
    const channel = parent.notification_channel ?? 'email'

    // LINE 通知
    if ((channel === 'line' || channel === 'both') && parent.line_user_id) {
      await sendLinePushMessage(parent.line_user_id, [{
        type: 'text',
        text: [
          `📊 ${name}さんの今日の学習が完了しました！`,
          '',
          `✅ 正解: ${correctCount} / ${totalCount}語`,
          `📈 正答率: ${pct}%`,
          '',
          'よく頑張りました 👏',
        ].join('\n'),
      }])
    }

    // メール通知
    if ((channel === 'email' || channel === 'both') && parent.email) {
      await sendEmail({
        to: parent.email,
        subject: `📊 ${name}さんが今日の英語学習を完了しました！`,
        html: buildParentNotificationHtml({ name, correctCount, totalCount, pct }),
      })
    }

    await admin.from('study_sessions')
      .update({ parent_notified_at: now })
      .eq('id', sessionId)
  } catch (e) {
    console.error('[completeSession] parent notification failed:', e)
  }
}
