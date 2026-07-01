'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// 出題形式・問題数などの自己設定は /study /review /home に反映される。
// Server Action 内の更新自体は即座に効くが、Next.js のクライアント側ルーターキャッシュにより
// <Link> でのソフトナビゲーションだと直後の再訪問で古い表示が出ることがあるため revalidate する。
function revalidateStudyPaths() {
  revalidatePath('/study')
  revalidatePath('/review')
  revalidatePath('/home')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// 初回ログイン時にロールを設定してリダイレクト
export async function setUserRole(role: 'student' | 'parent') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  redirect('/home')
}

// 本人の1日の問題数を設定（親がロックしている場合は変更不可 = 親優先）
export async function setMyDailyGoal(goal: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('daily_goal_locked')
    .eq('id', user.id)
    .single()
  if (profile?.daily_goal_locked) {
    throw new Error('保護者が設定しているため変更できません')
  }

  const clamped = Math.min(Math.max(Math.round(goal), 1), 100)
  const { error } = await admin.from('profiles').update({ daily_goal: clamped }).eq('id', user.id)
  if (error) throw new Error(error.message)
  revalidateStudyPaths()
}

// 本人の1日の新規語数を設定（親がロックしている場合は変更不可 = 親優先）。0=新規なし
export async function setMyNewPerDay(n: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('daily_goal_locked')
    .eq('id', user.id)
    .single()
  if (profile?.daily_goal_locked) {
    throw new Error('保護者が設定しているため変更できません')
  }

  const clamped = Math.min(Math.max(Math.round(n), 0), 100)
  const { error } = await admin.from('profiles').update({ new_per_day: clamped }).eq('id', user.id)
  if (error) throw new Error(error.message)
  revalidateStudyPaths()
}

// 出題形式を設定（親がロックしている場合は変更不可 = 親優先）
export async function setMyQuestionMode(mode: 'auto' | 'en_to_ja_choice' | 'ja_to_en_choice' | 'ja_to_en_spell') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('daily_goal_locked')
    .eq('id', user.id)
    .single()
  if (profile?.daily_goal_locked) {
    throw new Error('保護者が設定しているため変更できません')
  }

  const { error } = await admin.from('profiles').update({ question_mode: mode }).eq('id', user.id)
  if (error) throw new Error(error.message)
  revalidateStudyPaths()
}

// 単語リストのコピー時に先頭へ付ける見出しを設定（空文字＝見出しなし）
export async function setMyCopyHeader(header: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 改行は1行目見出しを崩すので除去。長すぎる見出しも切り詰める。
  const cleaned = header.replace(/[\r\n]+/g, ' ').trim().slice(0, 40)
  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ copy_header: cleaned || null }).eq('id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/home')
}

// 通知方法を変更（オフ / メール / LINE / 両方）
export async function setNotificationChannel(channel: 'none' | 'line' | 'email' | 'both') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ notification_channel: channel }).eq('id', user.id)
  if (error) throw new Error(error.message)
}

// 本人の表示名を変更
export async function setMyDisplayName(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const trimmed = name.trim().slice(0, 20)
  if (!trimmed) throw new Error('名前を入力してください')

  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ display_name: trimmed }).eq('id', user.id)
  if (error) throw new Error(error.message)
}

// LINE user_id からユーザーを検索（LINE Webhook / 通知連携用）
export async function findUserByLineId(lineUserId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, role')
    .eq('line_user_id', lineUserId)
    .single()
  return data
}

// LINE アカウントをウェブアカウントに紐付け（メール一致）
export async function linkLineAccount(email: string, lineUserId: string, lineDisplayName: string) {
  const admin = createAdminClient()
  const { data: users } = await admin.auth.admin.listUsers()
  const user = users.users.find(u => u.email === email)
  if (!user) return { ok: false, reason: 'user_not_found' as const }

  const { error } = await admin
    .from('profiles')
    .update({ line_user_id: lineUserId, line_display_name: lineDisplayName })
    .eq('id', user.id)

  return { ok: !error, reason: error?.message }
}
