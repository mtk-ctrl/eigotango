import { createAdminClient } from '@/lib/supabase/server'

// 親 parentId がこの子 childId を持つか（端末管理 or ペアリング済み）。サーバー専用。
export async function parentOwnsChild(parentId: string, childId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data: managed } = await admin
    .from('profiles').select('id')
    .eq('id', childId).eq('managed_by', parentId).maybeSingle()
  if (managed) return true
  const { data: rel } = await admin
    .from('student_parent_relations').select('id')
    .eq('parent_id', parentId).eq('student_id', childId)
    .not('paired_at', 'is', null).maybeSingle()
  return !!rel
}
