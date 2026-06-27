import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getTodayStudyWords } from '@/app/actions/study'
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (profile?.role as 'student' | 'parent') ?? 'student'

  let studentId = user.id
  let studentName: string | undefined
  let returnTo = role === 'parent' ? '/parent' : '/progress'
  let recordsHref = '/progress'
  let showLogout = true

  // 親が子の代わりに学習（?child=...）
  if (child && child !== user.id) {
    studentId = child
    returnTo = '/parent'
    recordsHref = `/progress?child=${child}`
    showLogout = false
    const admin = createAdminClient()
    const { data: cp } = await admin
      .from('profiles')
      .select('display_name, line_display_name')
      .eq('id', child)
      .single()
    studentName = cp?.line_display_name ?? cp?.display_name ?? undefined
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
