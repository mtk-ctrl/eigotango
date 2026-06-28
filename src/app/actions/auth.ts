'use server'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

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

  redirect(role === 'parent' ? '/parent' : '/study')
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
  await admin.from('profiles').update({ daily_goal: clamped }).eq('id', user.id)
}

// 通知方法を変更（メール / LINE / 両方）
export async function setNotificationChannel(channel: 'line' | 'email' | 'both') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()
  await admin.from('profiles').update({ notification_channel: channel }).eq('id', user.id)
}

// 本人の表示名を変更
export async function setMyDisplayName(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const trimmed = name.trim().slice(0, 20)
  if (!trimmed) throw new Error('名前を入力してください')

  const admin = createAdminClient()
  await admin.from('profiles').update({ display_name: trimmed }).eq('id', user.id)
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
