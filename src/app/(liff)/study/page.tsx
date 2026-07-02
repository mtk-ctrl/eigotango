import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getStudyWords } from '@/app/actions/study'
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

  // 認可は getStudyWords 内（authorizeStudent）で行う。失敗時は戻す。
  let sessionId = ''
  let questions: Awaited<ReturnType<typeof getStudyWords>>['questions'] = []
  try {
    const res = await getStudyWords(studentId, 'new')
    sessionId = res.sessionId
    questions = res.questions
  } catch {
    redirect(returnTo)
  }

  return (
    // key: 対象の生徒が変わったら（自分⇔子の切替は同一ルートの searchParams 違いで
    // コンポーネントが使い回されるため）マウントし直して学習中の state を確実にリセットする
    <StudyClient
      key={studentId}
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
