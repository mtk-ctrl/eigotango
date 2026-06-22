'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'

// 6桁ペアリングコードを生成（重複チェックあり）
export async function generatePairingCode(): Promise<{ code: string; expiresAt: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()

  // 重複しないコードを生成（最大10回試行）
  let code = ''
  for (let i = 0; i < 10; i++) {
    const candidate = Math.floor(100000 + Math.random() * 900000).toString()
    const { data } = await admin.from('pairing_codes').select('id').eq('code', candidate).single()
    if (!data) { code = candidate; break }
  }
  if (!code) throw new Error('コードの生成に失敗しました')

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  await admin.from('pairing_codes').upsert(
    { parent_id: user.id, code, expires_at: expiresAt },
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
    .single()

  if (!pc) throw new Error('コードが見つかりません')
  if (new Date(pc.expires_at) < new Date()) throw new Error('コードの有効期限が切れています')
  if (pc.parent_id === user.id) throw new Error('自分自身とはペアリングできません')

  // 重複チェック
  const { data: existing } = await admin
    .from('student_parent_relations')
    .select('id')
    .eq('student_id', user.id)
    .eq('parent_id', pc.parent_id)
    .single()

  if (!existing) {
    await admin.from('student_parent_relations').insert({
      student_id: user.id,
      parent_id: pc.parent_id,
      paired_at: new Date().toISOString(),
    })
  }

  // 使用済みコードを削除
  await admin.from('pairing_codes').delete().eq('code', code.trim())
}

// 親の子どもリストと今日のセッション情報を取得
export async function getChildrenData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const today = new Date().toISOString().split('T')[0]

  const { data: relations } = await supabase
    .from('student_parent_relations')
    .select('student_id, profiles!student_id(id, display_name, line_display_name)')
    .eq('parent_id', user.id)
    .not('paired_at', 'is', null)

  if (!relations?.length) return []

  const studentIds = relations.map(r => r.student_id)

  const { data: sessions } = await supabase
    .from('study_sessions')
    .select('student_id, total_words, correct_words, completed_at')
    .in('student_id', studentIds)
    .eq('session_date', today)

  const { data: progressCounts } = await supabase
    .from('user_word_progress')
    .select('student_id')
    .in('student_id', studentIds)
    .gt('repetitions', 0)  // 1回以上正解した単語

  return relations.map(r => {
    const p = r.profiles as any
    const session = sessions?.find(s => s.student_id === r.student_id) ?? null
    const learned = progressCounts?.filter(pc => pc.student_id === r.student_id).length ?? 0
    return {
      id: r.student_id,
      name: p?.line_display_name ?? p?.display_name ?? '名前未設定',
      todaySession: session,
      totalLearned: learned,
    }
  })
}
