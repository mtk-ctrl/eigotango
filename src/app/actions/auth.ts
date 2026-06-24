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
