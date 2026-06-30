'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { calculateSM2 } from '@/lib/sm2'
import { sendLinePushMessage } from '@/lib/line'
import { sendEmail, buildParentNotificationHtml } from '@/lib/email'
import { buildQuestion, pickMode } from '@/lib/questions'
import { jstDate } from '@/lib/date'
import { displayNameOf } from '@/lib/profile'
import { parentOwnsChild } from '@/lib/relations'
import {
  FREE_DAILY_MAX as FREE_MAX,
  PREMIUM_DAILY_MAX as PREMIUM_MAX,
  DEFAULT_DAILY_GOAL,
} from '@/lib/constants'
import type { Word, UserWordProgress } from '@/types/database'
import type { TodayStudyResult, StudyQuestion } from '@/types/api'

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
  if (await parentOwnsChild(uid, studentId)) return uid
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
  return Math.min(Math.max(profile?.daily_goal ?? DEFAULT_DAILY_GOAL, 1), max)
}

// 復習リマインド用のステータス（解き忘れ＝期限切れの可視化）。
// due       : 今日までに復習すべき語数（next_review_date <= 今日）
// overdue   : 期限切れ＝過去に解き忘れた語数（next_review_date < 今日）
// newRemaining: まだ一度も学習していない語数（新規で挑戦できる残り）
// dailyGoal : 1日の出題語数（追いつくのに何日かかるか表示用）
export async function getReviewStatus(studentId?: string): Promise<{
  due: number
  overdue: number
  newRemaining: number
  dailyGoal: number
}> {
  const sid = studentId ?? (await currentUserId())
  if (!sid) return { due: 0, overdue: 0, newRemaining: 0, dailyGoal: 10 }
  await authorizeStudent(sid)

  const admin = createAdminClient()
  const today = jstDate()
  const premium = (await getStudentDailyMax(sid)) > FREE_MAX

  // 学習済みの進捗（語の tier を同時取得して無料ユーザーは free のみ集計）
  const { data: progressRows } = await admin
    .from('user_word_progress')
    .select('next_review_date, word:words(tier)')
    .eq('student_id', sid)

  const rows = (progressRows ?? []).filter(r => {
    const w = r.word as unknown as { tier: string } | null
    return premium || w?.tier === 'free'
  })
  const due = rows.filter(r => (r.next_review_date as string) <= today).length
  const overdue = rows.filter(r => (r.next_review_date as string) < today).length
  const learned = rows.length

  // 利用可能な語の総数（tier 範囲）から学習済みを引いて新規残数
  let countQuery = admin.from('words').select('id', { count: 'exact', head: true })
  if (!premium) countQuery = countQuery.eq('tier', 'free')
  const { count } = await countQuery
  const newRemaining = Math.max((count ?? 0) - learned, 0)

  const dailyGoal = await getDailyGoal(sid)
  return { due, overdue, newRemaining, dailyGoal }
}

export interface DailyWord { word: string; meaning: string }
export interface DailyWords {
  yesterday: DailyWord[]
  today: DailyWord[]
  tomorrow: DailyWord[]
}

// 昨日・今日・明日の単語一覧（コピー用・プッシュ型カリキュラム）。
// 設定の問題数 N を1日分として、易しい順（学年→難易度→アルファベット）に N 語ずつ配る:
//   今日   = 次に学ぶ N 語（未学習の先頭）
//   明日   = そのさらに次の N 語
//   昨日   = 直近に学んだ N 語（first_learned_at 降順）
export async function getDailyWords(studentId?: string): Promise<DailyWords> {
  const empty: DailyWords = { yesterday: [], today: [], tomorrow: [] }
  const sid = studentId ?? (await currentUserId())
  if (!sid) return empty
  await authorizeStudent(sid)

  const admin = createAdminClient()
  const goal = await getDailyGoal(sid)
  const premium = (await getStudentDailyMax(sid)) > FREE_MAX
  const toDW = (w: { word: string; meaning: string }): DailyWord => ({ word: w.word, meaning: w.meaning })

  // 今日・明日 = 未学習の先頭から goal 語ずつ（DB 側でアンチジョイン＋カリキュラム順）
  const { data: upcomingRows, error: upErr } = await admin.rpc('get_unstudied_words', {
    p_student_id: sid, p_premium: premium, p_limit: goal * 2,
  })
  if (upErr) throw new Error(`failed to load daily words: ${upErr.message}`)
  const upcoming = (upcomingRows ?? []) as { word: string; meaning: string }[]
  const today = upcoming.slice(0, goal).map(toDW)
  const tomorrow = upcoming.slice(goal, goal * 2).map(toDW)

  // 昨日 = 直近に学んだ goal 語（理解済みスキップを除く）。対象だけを id 指定で取得。
  const { data: recent } = await admin
    .from('user_word_progress')
    .select('word_id')
    .eq('student_id', sid)
    .eq('known', false)
    .order('first_learned_at', { ascending: false, nullsFirst: false })
    .limit(goal)
  const recentIds = (recent ?? []).map(r => r.word_id as string)
  let yesterday: DailyWord[] = []
  if (recentIds.length > 0) {
    const { data: yWords } = await admin
      .from('words')
      .select('id, word, meaning')
      .in('id', recentIds)
    const byId = new Map((yWords ?? []).map(w => [w.id as string, w as { word: string; meaning: string }]))
    yesterday = recentIds
      .map(id => byId.get(id))
      .filter((w): w is { word: string; meaning: string } => Boolean(w))
      .map(toDW)
  }

  return { yesterday, today, tomorrow }
}

export interface UpcomingWord {
  id: string
  word: string
  meaning: string
  grade: string | null
  known: boolean
}

type WRow = { id: string; word: string; meaning: string; grade: string | null; level: string | null; sort_order: number | null }

// 今後学ぶ予定の語を limit 件、カリキュラム順で返す（理解済みスキップの選択用）。
// まだ進捗の無い「新規」のみを返す（学習中・学習済み・スキップ済みは除外）。
export async function getUpcomingWords(limit = 120, studentId?: string): Promise<UpcomingWord[]> {
  const sid = studentId ?? (await currentUserId())
  if (!sid) return []
  await authorizeStudent(sid)

  const admin = createAdminClient()
  const premium = (await getStudentDailyMax(sid)) > FREE_MAX

  // DB 側でアンチジョイン＋カリキュラム順＋件数制限（全件取得→メモリ処理を避ける）
  const { data, error } = await admin.rpc('get_unstudied_words', {
    p_student_id: sid, p_premium: premium, p_limit: limit,
  })
  if (error) throw new Error(`failed to load upcoming words: ${error.message}`)
  return ((data ?? []) as WRow[]).map(w => ({
    id: w.id, word: w.word, meaning: w.meaning, grade: w.grade, known: false,
  }))
}

// スキップ済み（known=true）の語の一覧（戻す画面用・カリキュラム順）。
export async function getKnownWords(studentId?: string): Promise<UpcomingWord[]> {
  const sid = studentId ?? (await currentUserId())
  if (!sid) return []
  await authorizeStudent(sid)

  const admin = createAdminClient()
  const { data: progressRows } = await admin
    .from('user_word_progress')
    .select('word_id')
    .eq('student_id', sid)
    .eq('known', true)
  const ids = (progressRows ?? []).map(r => r.word_id as string)
  if (ids.length === 0) return []

  const { data: words } = await admin
    .from('words')
    .select('id, word, meaning, grade, level, sort_order')
    .in('id', ids)
  const sorted = ((words ?? []) as WRow[]).slice().sort(curriculumCompare)
  return sorted.map(w => ({ id: w.id, word: w.word, meaning: w.meaning, grade: w.grade, known: true }))
}

// スキップ済み語の件数だけを DB 側で数える（一覧の全データ取得を避けるための軽量版）。
export async function getKnownWordsCount(studentId?: string): Promise<number> {
  const sid = studentId ?? (await currentUserId())
  if (!sid) return 0
  await authorizeStudent(sid)

  const admin = createAdminClient()
  const { count } = await admin
    .from('user_word_progress')
    .select('word_id', { count: 'exact', head: true })
    .eq('student_id', sid)
    .eq('known', true)
  return count ?? 0
}

// 語を「理解済み（スキップ）」にする/戻す。
export async function setWordsKnown(wordIds: string[], known: boolean, studentId?: string): Promise<void> {
  const sid = studentId ?? (await currentUserId())
  if (!sid) throw new Error('Unauthorized')
  await authorizeStudent(sid)
  if (wordIds.length === 0) return

  const admin = createAdminClient()

  if (known) {
    // 既存進捗は known=true＆復習を遠い未来へ（履歴は保持）。未学習語は known マーカーを新規作成。
    const { data: existing } = await admin
      .from('user_word_progress')
      .select('word_id')
      .eq('student_id', sid)
      .in('word_id', wordIds)
    const existingIds = new Set((existing ?? []).map(r => r.word_id as string))
    const far = jstDate(3650)

    const toInsert = wordIds.filter(id => !existingIds.has(id)).map(id => ({
      student_id: sid, word_id: id, known: true,
      easiness_factor: 2.5, interval_days: 1, repetitions: 0,
      next_review_date: far, total_reviews: 0, correct_count: 0,
      first_learned_at: new Date().toISOString(),
    }))
    if (toInsert.length > 0) {
      await admin.from('user_word_progress').insert(toInsert)
    }
    if (existingIds.size > 0) {
      await admin.from('user_word_progress')
        .update({ known: true, next_review_date: far })
        .eq('student_id', sid)
        .in('word_id', [...existingIds])
    }
  } else {
    // 戻す: 学習履歴の無い known マーカーは削除（新規プールに戻す）、履歴ありは known=false で再開
    await admin.from('user_word_progress')
      .delete()
      .eq('student_id', sid).in('word_id', wordIds).eq('known', true).eq('total_reviews', 0)
    await admin.from('user_word_progress')
      .update({ known: false, next_review_date: jstDate() })
      .eq('student_id', sid).in('word_id', wordIds).eq('known', true).gt('total_reviews', 0)
  }

  // 出題・一覧に即時反映させるためキャッシュを再検証
  revalidatePath('/home')
  revalidatePath('/study')
  revalidatePath('/progress')
  revalidatePath('/words')
}

const GRADE_RANK: Record<string, number> = { '中1': 1, '中2': 2, '中3': 3 }
const LEVEL_RANK: Record<string, number> = { '基礎': 1, '標準': 2, '難関': 3 }

// カリキュラム順: 基礎テーマ(sort_order 昇順・null は後) → 学年 → 難易度 → アルファベット。
// 子ども向けに、日常の易しい語をテーマ単位で先に、その後に受験語彙を並べる。
function curriculumCompare(
  a: { sort_order: number | null; grade: string | null; level: string | null; word: string },
  b: { sort_order: number | null; grade: string | null; level: string | null; word: string },
): number {
  const sa = a.sort_order ?? Number.MAX_SAFE_INTEGER
  const sb = b.sort_order ?? Number.MAX_SAFE_INTEGER
  if (sa !== sb) return sa - sb
  const ga = GRADE_RANK[a.grade ?? ''] ?? 4
  const gb = GRADE_RANK[b.grade ?? ''] ?? 4
  if (ga !== gb) return ga - gb
  const la = LEVEL_RANK[a.level ?? ''] ?? 2
  const lb = LEVEL_RANK[b.level ?? ''] ?? 2
  if (la !== lb) return la - lb
  return a.word.localeCompare(b.word)
}

// 今日の学習問題を取得（復習 + 新規）。モード別に出題を組み立てる。
// studentId 省略時はログイン中の本人。指定時は親が子の代わりに取得（要認可）。
export async function getTodayStudyWords(studentId?: string): Promise<TodayStudyResult> {
  const sid = studentId ?? (await currentUserId())
  if (!sid) return { sessionId: '', questions: [] }
  await authorizeStudent(sid)

  const admin = createAdminClient()
  const today = jstDate()
  const limit = await getDailyGoal(sid)
  // 無料は基本100語（tier=free）のみ、プレミアムは全語
  const premium = (await getStudentDailyMax(sid)) > FREE_MAX

  // 1. 復習単語（next_review_date が今日以前）
  const { data: progressRows } = await admin
    .from('user_word_progress')
    .select('*, word:words(*)')
    .eq('student_id', sid)
    .eq('known', false)
    .lte('next_review_date', today)
    .order('next_review_date')
    .limit(limit)

  // 無料ユーザーは念のため premium 語を除外（過去にプレミアムだった場合の保険）
  const reviewItems = (progressRows ?? []).filter(r => {
    const w = r.word as Word | null
    return w && (premium || w.tier === 'free')
  })
  const remaining = limit - reviewItems.length

  // 2. 新規単語（まだ学習していない）。DB 側でアンチジョイン＋カリキュラム順＋件数制限。
  const newWordItems: { word: Word; progress: null }[] = []
  if (remaining > 0) {
    const { data: newWords, error: newErr } = await admin.rpc('get_unstudied_words', {
      p_student_id: sid, p_premium: premium, p_limit: remaining,
    })
    if (newErr) throw new Error(`failed to load new words: ${newErr.message}`)
    newWordItems.push(...((newWords ?? []) as Word[]).map(w => ({ word: w, progress: null as null })))
  }

  const items: { word: Word; progress: UserWordProgress | null }[] = [
    ...reviewItems.map(r => ({ word: r.word as Word, progress: r as UserWordProgress })),
    ...newWordItems,
  ]

  // 3. 誤答候補プール（同 tier 範囲の語・word と meaning のペア）
  let poolQuery = admin.from('words').select('word, meaning').limit(200)
  if (!premium) poolQuery = poolQuery.eq('tier', 'free')
  const { data: poolRows } = await poolQuery
  const pool = (poolRows ?? []).map(p => ({ word: p.word as string, meaning: p.meaning as string }))

  // 4. 各語をモード別の問題に変換（熟語はスペルを避け 4 択のみ）
  const questions: StudyQuestion[] = items.map(({ word, progress }) => {
    const mode = pickMode(progress?.repetitions ?? 0, word.is_idiom)
    return buildQuestion(word, mode, pool)
  })

  // 5. 当日セッションを取得 or 作成
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
    const { data: newSession, error: sessionError } = await admin
      .from('study_sessions')
      .insert({ student_id: sid, session_date: today })
      .select('id')
      .single()
    if (newSession) {
      sessionId = newSession.id
    } else {
      // 同時アクセスで既に作成済み（unique 制約）の可能性 → 取り直す
      const { data: retry } = await admin
        .from('study_sessions')
        .select('id')
        .eq('student_id', sid)
        .eq('session_date', today)
        .maybeSingle()
      if (!retry) {
        throw new Error(`failed to create study session: ${sessionError?.message ?? 'unknown error'}`)
      }
      sessionId = retry.id
    }
  }

  return { sessionId, questions }
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

  const [progressResult, answerResult] = await Promise.all([
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

  // 進捗（SM-2）の保存失敗は再出題に直結するので必ず surface する。
  // session_answers は集計用の付随記録なのでログのみ（学習継続を優先）。
  if (progressResult.error) {
    throw new Error(`failed to save progress: ${progressResult.error.message}`)
  }
  if (answerResult.error) {
    console.error('[recordAnswer] failed to save session answer:', answerResult.error)
  }

  // 出題された語は進捗が付くので「スキップ候補」一覧から自動的に外れる
  revalidatePath('/words')
  revalidatePath('/home')
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

    const name = displayNameOf(me, '子ども')

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
