import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getChildrenData } from '@/app/actions/parent'
import { ParentClient } from './ParentClient'

export default async function ParentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, line_display_name, display_name, daily_goal')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'parent') redirect('/study')

  const [children, subscription] = await Promise.all([
    getChildrenData(),
    supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('parent_id', user.id)
      .single()
      .then(r => r.data),
  ])

  return (
    <ParentClient
      parentName={profile.line_display_name ?? profile.display_name ?? ''}
      parentDailyGoal={profile.daily_goal ?? 10}
      children={children}
      subscription={subscription ?? { plan: 'free', status: 'active', current_period_end: null }}
    />
  )
}
