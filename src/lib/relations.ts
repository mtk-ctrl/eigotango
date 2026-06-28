import { createAdminClient } from '@/lib/supabase/server'

// 親 parentId がこの子 childId を持つか（端末管理 or ペアリング済み）。サーバー専用。
// 2つの判定を並列実行してラウンドトリップを直列化しない。
export async function parentOwnsChild(parentId: string, childId: string): Promise<boolean> {
  const admin = createAdminClient()
  const [managedRes, relRes] = await Promise.all([
    admin
      .from('profiles').select('id')
      .eq('id', childId).eq('managed_by', parentId).maybeSingle(),
    admin
      .from('student_parent_relations').select('id')
      .eq('parent_id', parentId).eq('student_id', childId)
      .not('paired_at', 'is', null).maybeSingle(),
  ])
  // クエリ失敗を「権限なし(false)」と握りつぶさず、明示的に失敗させる
  const err = managedRes.error ?? relRes.error
  if (err) {
    console.error('[parentOwnsChild] query failed:', err)
    throw new Error('親子関係の確認に失敗しました')
  }
  return !!managedRes.data || !!relRes.data
}
