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
    // key: 対象の生徒 or セッション（日付）が変わったらマウントし直して学習中の state を
    // 確実にリセットする（自分⇔子の切替は同一ルートの searchParams 違いで使い回されるため。
    // 日またぎで開き直したときも sessionId が変わるので古い問題セットが残らない）
    <StudyClient
      key={`${studentId}-${sessionId}`}
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
