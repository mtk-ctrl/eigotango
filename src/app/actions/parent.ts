'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { jstDate } from '@/lib/date'
import { displayNameOf } from '@/lib/profile'
import { parentOwnsChild } from '@/lib/relations'
import { MANAGED_EMAIL_DOMAIN, PREMIUM_DAILY_MAX, DEFAULT_DAILY_GOAL } from '@/lib/constants'

const randomUUID = () => crypto.randomUUID()

function clampGoal(goal: number): number {
  return Math.min(Math.max(Math.round(goal), 1), PREMIUM_DAILY_MAX)
}

// エラーの詳細をできるだけ拾って文字列化（本番で原因を読めるようにする）
function describeError(e: unknown): string {
  if (!e) return 'ユーザーが返りませんでした'
  if (typeof e === 'string') return e
  const o = e as { name?: string; status?: number; code?: string; message?: string }
  const parts = [o.name, o.status, o.code, o.message].filter(v => v !== undefined && v !== null && v !== '')
  if (parts.length) return parts.join(' / ')
  try {
    const j = JSON.stringify(e)
    if (j && j !== '{}') return j
  } catch { /* noop */ }
  return String(e)
}

// ログイン中の親 ID を取得（parent ロール検証付き）
async function requireParent(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return user.id
}

// この子（managed or paired）がログイン中の親のものか検証
async function assertOwnsChild(parentId: string, childId: string): Promise<void> {
  if (!(await parentOwnsChild(parentId, childId))) {
    throw new Error('この子どもを操作する権限がありません')
  }
}

// 端末管理の子ども（ログイン不要）を追加。名前 + 1日の問題数。
export type AddChildResult = { ok: true } | { ok: false; error: string }

// throw すると本番ビルドでは Server Action のエラー詳細が伏せられるため、
// 失敗理由は戻り値で返してUIに表示する。
export async function addManagedChild(name: string, dailyGoal: number): Promise<AddChildResult> {
  try {
    const parentId = await requireParent()
    const trimmed = name.trim()
    if (!trimmed) return { ok: false, error: '名前を入力してください' }

    const admin = createAdminClient()

    // ログインに使われない合成アカウントを作成（trigger が profiles を自動作成）
    const email = `child-${randomUUID()}${MANAGED_EMAIL_DOMAIN}`
    const password = randomUUID()  // 36文字・十分ランダム（72文字上限に余裕）

    let created: Awaited<ReturnType<typeof admin.auth.admin.createUser>>['data'] | null = null
    let createErr: unknown = null
    try {
      const r = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'student', display_name: trimmed },
      })
      created = r.data
      createErr = r.error
    } catch (ex) {
      createErr = ex
    }
    if (createErr || !created?.user) {
      return { ok: false, error: `アカウント作成に失敗: ${describeError(createErr)}` }
    }

    const childId = created.user.id

    // トリガがプロフィールを作るが、失敗時に備えて upsert で確実に作成/更新する
    const { error: upErr } = await admin.from('profiles').upsert({
      id: childId,
      role: 'student',
      display_name: trimmed,
      email,
      daily_goal: clampGoal(dailyGoal),
      daily_goal_locked: true,
      managed_by: parentId,
    }, { onConflict: 'id' })
    if (upErr) {
      await admin.auth.admin.deleteUser(childId).catch(() => {})
      return { ok: false, error: `プロフィール更新に失敗: ${upErr.message}` }
    }

    const { error: relErr } = await admin.from('student_parent_relations').insert({
      student_id: childId,
      parent_id: parentId,
      paired_at: new Date().toISOString(),
    })
    if (relErr) {
      await admin.auth.admin.deleteUser(childId).catch(() => {})
      return { ok: false, error: `連携の作成に失敗: ${relErr.message}` }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '追加に失敗しました' }
  }
}

// 子どもの名前・1日の問題数を更新（親が設定 → ロック）
export async function updateChildSettings(
  childId: string,
  { name, dailyGoal }: { name?: string; dailyGoal?: number },
): Promise<void> {
  const parentId = await requireParent()
  await assertOwnsChild(parentId, childId)

  const admin = createAdminClient()
  const patch: Record<string, unknown> = {}
  if (typeof name === 'string' && name.trim()) patch.display_name = name.trim()
  if (typeof dailyGoal === 'number') {
    patch.daily_goal = clampGoal(dailyGoal)
    patch.daily_goal_locked = true  // 親優先
  }
  if (Object.keys(patch).length === 0) return

  await admin.from('profiles').update(patch).eq('id', childId)
}

// 子どもを外す。端末管理の子はアカウントごと削除、連携の子は紐付けのみ解除。
export async function removeChild(childId: string): Promise<void> {
  const parentId = await requireParent()
  await assertOwnsChild(parentId, childId)

  const admin = createAdminClient()
  const { data: child } = await admin
    .from('profiles')
    .select('managed_by')
    .eq('id', childId)
    .single()

  // 紐付け解除
  await admin
    .from('student_parent_relations')
    .delete()
    .eq('parent_id', parentId)
    .eq('student_id', childId)

  // 端末管理の子はデータごと削除（profiles は student_id FK に CASCADE が無いので先に消す）
  if (child?.managed_by === parentId) {
    const { data: sessions } = await admin
      .from('study_sessions')
      .select('id')
      .eq('student_id', childId)
    const sessionIds = sessions?.map(s => s.id) ?? []
    if (sessionIds.length > 0) {
      await admin.from('session_answers').delete().in('session_id', sessionIds)
    }
    await admin.from('study_sessions').delete().eq('student_id', childId)
    await admin.from('user_word_progress').delete().eq('student_id', childId)
    await admin.auth.admin.deleteUser(childId)  // auth.users 削除で profiles も CASCADE
  }
}

// 6桁ペアリングコードを生成（自分のアカウントを持つ子と連携する用）
export async function generatePairingCode(): Promise<{ code: string; expiresAt: string }> {
  const parentId = await requireParent()
  const admin = createAdminClient()

  let code = ''
  for (let i = 0; i < 10; i++) {
    const candidate = Math.floor(100000 + Math.random() * 900000).toString()
    const { data } = await admin.from('pairing_codes').select('id').eq('code', candidate).maybeSingle()
    if (!data) { code = candidate; break }
  }
  if (!code) throw new Error('コードの生成に失敗しました')

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  await admin.from('pairing_codes').upsert(
    { parent_id: parentId, code, expires_at: expiresAt },
    { onConflict: 'parent_id' }
  )

  return { code, expiresAt }
}

// 子どもがペアリングコードを入力して親子紐付け
export async function submitPairingCode(code: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()

  const { data: pc } = await admin
    .from('pairing_codes')
    .select('parent_id, expires_at')
    .eq('code', code.trim())
    .maybeSingle()

  if (!pc) throw new Error('コードが見つかりません')
  if (new Date(pc.expires_at) < new Date()) throw new Error('コードの有効期限が切れています')
  if (pc.parent_id === user.id) throw new Error('自分自身とはペアリングできません')

  const { data: existing } = await admin
    .from('student_parent_relations')
    .select('id')
    .eq('student_id', user.id)
    .eq('parent_id', pc.parent_id)
    .maybeSingle()

  if (!existing) {
    await admin.from('student_parent_relations').insert({
      student_id: user.id,
      parent_id: pc.parent_id,
      paired_at: new Date().toISOString(),
    })
  }

  await admin.from('pairing_codes').delete().eq('code', code.trim())
}

export interface ChildData {
  id: string
  name: string
  dailyGoal: number
  isManaged: boolean
  todaySession: { total_words: number; correct_words: number; completed_at: string | null } | null
  totalLearned: number
  streak: number   // 連続学習日数（今日 or 昨日を起点に完了日が続いている数）
}

// 完了済みセッション日付の集合から、今日/昨日を起点とした連続日数を計算
function calcStreak(dateSet: Set<string>, today: string): number {
  const iso = (d: Date) => d.toISOString().split('T')[0]
  const cur = new Date(today + 'T00:00:00Z')
  // 今日まだ未完了でも、昨日まで続いていれば連続として数える
  if (!dateSet.has(iso(cur))) cur.setUTCDate(cur.getUTCDate() - 1)
  let streak = 0
  while (dateSet.has(iso(cur))) {
    streak++
    cur.setUTCDate(cur.getUTCDate() - 1)
  }
  return streak
}

// 親の子どもリストと今日のセッション情報を取得
export async function getChildrenData(): Promise<ChildData[]> {
  const parentId = await requireParent()
  const admin = createAdminClient()

  const today = jstDate()

  const { data: relations } = await admin
    .from('student_parent_relations')
    .select('student_id, profiles!student_id(id, display_name, line_display_name, daily_goal, managed_by)')
    .eq('parent_id', parentId)
    .not('paired_at', 'is', null)

  if (!relations?.length) return []

  const studentIds = relations.map(r => r.student_id)

  const { data: sessions } = await admin
    .from('study_sessions')
    .select('student_id, total_words, correct_words, completed_at')
    .in('student_id', studentIds)
    .eq('session_date', today)

  const { data: progressCounts } = await admin
    .from('user_word_progress')
    .select('student_id')
    .in('student_id', studentIds)
    .gt('repetitions', 0)

  // 連続学習日数の計算用に、直近1年の完了済みセッション日付を取得（streak 上限を緩和）
  const oneYearAgo = jstDate(-364)
  const { data: completedSessions } = await admin
    .from('study_sessions')
    .select('student_id, session_date')
    .in('student_id', studentIds)
    .not('completed_at', 'is', null)
    .gte('session_date', oneYearAgo)

  return relations.map(r => {
    const p = r.profiles as unknown as {
      display_name: string | null
      line_display_name: string | null
      daily_goal: number | null
      managed_by: string | null
    } | null
    const session = sessions?.find(s => s.student_id === r.student_id) ?? null
    const learned = progressCounts?.filter(pc => pc.student_id === r.student_id).length ?? 0
    const dateSet = new Set(
      (completedSessions ?? [])
        .filter(s => s.student_id === r.student_id)
        .map(s => s.session_date as string),
    )
    return {
      id: r.student_id,
      name: displayNameOf(p, '名前未設定'),
      dailyGoal: p?.daily_goal ?? DEFAULT_DAILY_GOAL,
      isManaged: p?.managed_by === parentId,
      todaySession: session,
      totalLearned: learned,
      streak: calcStreak(dateSet, today),
    }
  })
}
