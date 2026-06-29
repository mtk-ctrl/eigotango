import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getChildrenData } from '@/app/actions/parent'
import { getReviewStatus, getStudentDailyMax, getDailyWords } from '@/app/actions/study'
import { displayNameOf } from '@/lib/profile'
import { BottomNav } from '@/components/BottomNav'
import { ParentHome } from './ParentHome'
import { StudentHome } from './StudentHome'

// 役割別ホーム（着地点）。生徒＝今日の学習、親＝子どもの状況。
export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, line_display_name')
    .eq('id', user.id)
    .single()
  const name = displayNameOf(profile)

  if (profile?.role === 'parent') {
    const [children, subscription, dailyWords] = await Promise.all([
      getChildrenData(),
      supabase
        .from('subscriptions')
        .select('plan')
        .eq('parent_id', user.id)
        .single()
        .then(r => r.data),
      getDailyWords(user.id),
    ])
    return (
      <>
        <ParentHome name={name} premium={subscription?.plan === 'premium'} children={children} dailyWords={dailyWords} />
        <BottomNav role="parent" />
      </>
    )
  }

  const [review, max, dailyWords] = await Promise.all([
    getReviewStatus(user.id),
    getStudentDailyMax(user.id),
    getDailyWords(user.id),
  ])
  return (
    <>
      <StudentHome name={name} premium={max > 20} review={review} dailyWords={dailyWords} />
      <BottomNav role="student" />
    </>
  )
}
