import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ルートアクセス時にロールに応じてリダイレクト
export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  redirect(profile?.role === 'parent' ? '/parent' : '/study')
}
