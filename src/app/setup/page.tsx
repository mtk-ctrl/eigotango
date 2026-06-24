import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SetupClient } from './SetupClient'

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // 既にロールが設定済みなら適切な画面へ
  if (profile?.role) {
    redirect(profile.role === 'parent' ? '/parent' : '/study')
  }

  return <SetupClient />
}
