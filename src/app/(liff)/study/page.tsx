import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTodayStudyWords } from '@/app/actions/study'
import { StudyClient } from './StudyClient'

export default async function StudyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { sessionId, words } = await getTodayStudyWords()

  return <StudyClient words={words} sessionId={sessionId} />
}
