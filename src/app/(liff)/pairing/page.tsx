import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PairingClient } from './PairingClient'

export default async function PairingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // 親はペアリングページを使わない（ホームでコード発行）
  if (profile?.role === 'parent') redirect('/home')

  return <PairingClient />
}
