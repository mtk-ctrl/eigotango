import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getTodayStudyWords } from '@/app/actions/study'
import { displayNameOf } from '@/lib/profile'
import { StudyClient } from './StudyClient'

export default async function StudyPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>
}) {
  const { child } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let studentId = user.id
  let studentName: string | undefined
  let returnTo = '/home'
  let recordsHref = '/progress'
  let showLogout = true

  // 親が子の代わりに学習（?child=...）
  if (child && child !== user.id) {
    studentId = child
    returnTo = '/home'
    recordsHref = `/progress?child=${child}`
    showLogout = false
    const admin = createAdminClient()
    const { data: cp } = await admin
      .from('profiles')
      .select('display_name, line_display_name')
      .eq('id', child)
      .single()
    studentName = displayNameOf(cp) || undefined
  }

  // 認可は getTodayStudyWords 内（authorizeStudent）で行う。失敗時は戻す。
  let sessionId = ''
  let questions: Awaited<ReturnType<typeof getTodayStudyWords>>['questions'] = []
  try {
    const res = await getTodayStudyWords(studentId)
    sessionId = res.sessionId
    questions = res.questions
  } catch {
    redirect(returnTo)
  }

  return (
    <StudyClient
      questions={questions}
      sessionId={sessionId}
      studentId={studentId}
      studentName={studentName}
      returnTo={returnTo}
      recordsHref={recordsHref}
      showLogout={showLogout}
    />
  )
}
