import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginClient } from './LoginClient'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    redirect(profile?.role === 'parent' ? '/parent' : '/study')
  }

  return <LoginClient />
}
