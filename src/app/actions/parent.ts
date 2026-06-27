'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

const randomUUID = () => crypto.randomUUID()

const DAILY_GOAL_MIN = 1
const DAILY_GOAL_MAX = 100

function clampGoal(goal: number): number {
  return Math.min(Math.max(Math.round(goal), DAILY_GOAL_MIN), DAILY_GOAL_MAX)
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
  const admin = createAdminClient()
  const { data: managed } = await admin
    .from('profiles')
    .select('id')
    .eq('id', childId)
    .eq('managed_by', parentId)
    .maybeSingle()
  if (managed) return

  const { data: rel } = await admin
    .from('student_parent_relations')
    .select('id')
    .eq('parent_id', parentId)
    .eq('student_id', childId)
    .not('paired_at', 'is', null)
    .maybeSingle()
  if (rel) return

  throw new Error('この子どもを操作する権限がありません')
}

// 端末管理の子ども（ログイン不要）を追加。名前 + 1日の問題数。
export async function addManagedChild(name: string, dailyGoal: number): Promise<void> {
  const parentId = await requireParent()
  const trimmed = name.trim()
  if (!trimmed) throw new Error('名前を入力してください')

  const admin = createAdminClient()

  // ログインに使われない合成アカウントを作成（trigger が profiles を自動作成）
  const email = `child-${randomUUID()}@managed.eigotango.local`
  const password = randomUUID() + randomUUID()
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'student', display_name: trimmed },
  })
  if (error || !created?.user) throw new Error(error?.message ?? '子どもの作成に失敗しました')

  const childId = created.user.id

  await admin.from('profiles').update({
    role: 'student',
    display_name: trimmed,
    daily_goal: clampGoal(dailyGoal),
    daily_goal_locked: true,
    managed_by: parentId,
  }).eq('id', childId)

  await admin.from('student_parent_relations').insert({
    student_id: childId,
    parent_id: parentId,
    paired_at: new Date().toISOString(),
  })
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
}

// 親の子どもリストと今日のセッション情報を取得
export async function getChildrenData(): Promise<ChildData[]> {
  const parentId = await requireParent()
  const admin = createAdminClient()

  const today = new Date().toISOString().split('T')[0]

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

  return relations.map(r => {
    const p = r.profiles as unknown as {
      display_name: string | null
      line_display_name: string | null
      daily_goal: number | null
      managed_by: string | null
    } | null
    const session = sessions?.find(s => s.student_id === r.student_id) ?? null
    const learned = progressCounts?.filter(pc => pc.student_id === r.student_id).length ?? 0
    return {
      id: r.student_id,
      name: p?.line_display_name ?? p?.display_name ?? '名前未設定',
      dailyGoal: p?.daily_goal ?? 10,
      isManaged: p?.managed_by === parentId,
      todaySession: session,
      totalLearned: learned,
    }
  })
}
