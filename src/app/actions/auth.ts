'use server'

import crypto from 'crypto'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// LINE ID トークンを LINE API で検証
async function verifyLineToken(idToken: string, lineUserId: string) {
  const channelId = process.env.NEXT_PUBLIC_LIFF_ID?.split('-')[0] ?? ''
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  })
  const data = await res.json()
  if (data.error || data.sub !== lineUserId) {
    throw new Error(`LINE token invalid: ${data.error_description ?? 'sub mismatch'}`)
  }
}

// LINE ユーザーID から Supabase 認証用メール/パスワードを導出
function deriveCredentials(lineUserId: string) {
  const email = `line_${lineUserId}@eigotango.internal`
  const password = crypto
    .createHmac('sha256', process.env.LINE_CHANNEL_SECRET!)
    .update(lineUserId)
    .digest('hex')
  return { email, password }
}

// 既存ユーザーか確認（ロール返却）
export async function checkLineUser(lineUserId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('role')
    .eq('line_user_id', lineUserId)
    .single()
  return { exists: !!data, role: data?.role as 'student' | 'parent' | undefined }
}

// LINE IDトークンを検証し Supabase セッションを確立
export async function signInWithLine({
  idToken,
  lineUserId,
  lineDisplayName,
  role,
}: {
  idToken: string
  lineUserId: string
  lineDisplayName: string
  role: 'student' | 'parent'
}): Promise<{ role: 'student' | 'parent' }> {
  await verifyLineToken(idToken, lineUserId)

  const admin = createAdminClient()
  const { email, password } = deriveCredentials(lineUserId)

  // 既存ユーザーを確認
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('line_user_id', lineUserId)
    .single()

  let actualRole = profile?.role as 'student' | 'parent' | undefined

  if (!profile) {
    // 新規ユーザー作成
    const { data: newUser, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, display_name: lineDisplayName },
    })
    if (error) throw error

    // トリガーで作成された profiles に LINE 情報を追記
    await admin.from('profiles').update({
      line_user_id: lineUserId,
      line_display_name: lineDisplayName,
    }).eq('id', newUser.user.id)

    actualRole = role
  } else {
    // 既存ユーザー: 表示名を最新化
    await admin.from('profiles').update({ line_display_name: lineDisplayName })
      .eq('id', profile.id)
  }

  // SSR クライアントで signInWithPassword → cookie にセッションを書き込む
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError

  return { role: actualRole ?? role }
}
