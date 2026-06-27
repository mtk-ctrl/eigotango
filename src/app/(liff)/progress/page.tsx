import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getStudentDailyMax } from '@/app/actions/study'
import { LogoutButton } from '@/components/LogoutButton'
import { SelfGoalSetting } from '@/components/SelfGoalSetting'

function formatDate(dateStr: string): string {
  const DOW = ['日', '月', '火', '水', '木', '金', '土']
  const d = new Date(dateStr + 'T12:00:00Z')
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${DOW[d.getUTCDay()]})`
}

// 親がこの子（managed or paired）を持っているか
async function parentOwnsChild(parentId: string, childId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data: managed } = await admin
    .from('profiles').select('id').eq('id', childId).eq('managed_by', parentId).maybeSingle()
  if (managed) return true
  const { data: rel } = await admin
    .from('student_parent_relations').select('id')
    .eq('parent_id', parentId).eq('student_id', childId).not('paired_at', 'is', null).maybeSingle()
  return !!rel
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>
}) {
  const { child } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role, daily_goal, daily_goal_locked')
    .eq('id', user.id)
    .single()
  const isParent = myProfile?.role === 'parent'

  // 対象の student を決定
  let studentId = user.id
  let childName: string | undefined
  const viewingChild = !!child && child !== user.id
  if (viewingChild) {
    if (!(await parentOwnsChild(user.id, child!))) redirect('/parent')
    studentId = child!
    const admin = createAdminClient()
    const { data: cp } = await admin
      .from('profiles').select('display_name, line_display_name').eq('id', studentId).single()
    childName = cp?.line_display_name ?? cp?.display_name ?? '子ども'
  }

  // 子を見るときは admin、自分のときは RLS クライアントで十分
  const db = viewingChild ? createAdminClient() : supabase

  // 利用可能な語の範囲（無料=基本100語のみ / プレミアム=全語）で分母を出す
  const premium = (await getStudentDailyMax(studentId)) > 20

  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  const wordsQuery = db.from('words').select('grade')
  if (!premium) wordsQuery.eq('tier', 'free')

  const [progressRes, wordsRes, sessionsRes] = await Promise.all([
    db
      .from('user_word_progress')
      .select('repetitions, word:words(grade)')
      .eq('student_id', studentId),
    wordsQuery,
    db
      .from('study_sessions')
      .select('session_date, total_words, correct_words, completed_at')
      .eq('student_id', studentId)
      .gte('session_date', sevenDaysAgo)
      .order('session_date', { ascending: false }),
  ])

  const progress = progressRes.data ?? []
  const allWords = wordsRes.data ?? []
  const sessions = sessionsRes.data ?? []

  const totalLearned = progress.length
  const mastered = progress.filter(p => p.repetitions >= 4).length
  const totalWords = allWords.length

  const GRADES = ['中1', '中2', '中3'] as const
  const gradeStats = GRADES.map(grade => ({
    grade,
    learned: progress.filter(p => (p.word as unknown as { grade: string | null } | null)?.grade === grade).length,
    total: allWords.filter(w => w.grade === grade).length,
  }))

  const studyHref = viewingChild ? `/study?child=${studentId}` : '/study'

  return (
    <div className="min-h-dvh bg-gray-50 pb-8">
      {/* ヘッダー */}
      <div className="bg-green-500 text-white px-4 pt-10 pb-6">
        <div className="flex justify-between items-start">
          <div>
            {viewingChild && (
              <Link href="/parent" className="text-xs text-white/70 underline">← ダッシュボード</Link>
            )}
            <h1 className="text-xl font-bold mt-1">
              {viewingChild ? `${childName}さんの記録` : '学習進捗'}
            </h1>
          </div>
          {!viewingChild && <LogoutButton className="text-xs text-white/70 underline mt-1" />}
        </div>
      </div>

      <div className="px-4 mt-4 flex flex-col gap-4">
        {/* 総合統計 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">{totalLearned}</p>
              <p className="text-xs text-gray-500 mt-1">学習済み</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">{mastered}</p>
              <p className="text-xs text-gray-500 mt-1">定着済み（4回以上正解）</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>総合進捗</span>
              <span>{totalLearned} / {totalWords}語</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-2 bg-green-500 rounded-full transition-all"
                style={{ width: `${totalWords > 0 ? Math.min(100, (totalLearned / totalWords) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* 1日の問題数（自分の進捗を見ている本人のみ） */}
        {!viewingChild && (
          <SelfGoalSetting
            current={myProfile?.daily_goal ?? 10}
            locked={myProfile?.daily_goal_locked ?? false}
            max={await getStudentDailyMax(studentId)}
          />
        )}

        {/* 学年別内訳 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 text-sm mb-3">学年別</h2>
          <div className="flex flex-col gap-3">
            {gradeStats.map(stat => (
              <div key={stat.grade}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{stat.grade}</span>
                  <span className="text-gray-400 text-xs">{stat.learned} / {stat.total}語</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-blue-400 rounded-full"
                    style={{ width: `${stat.total > 0 ? Math.min(100, (stat.learned / stat.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 直近7日間 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 text-sm mb-3">直近7日間</h2>
          {sessions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-2">まだ学習履歴がありません</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map(s => (
                <div key={s.session_date} className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">{formatDate(s.session_date)}</span>
                  <div className="flex items-center gap-2">
                    {s.completed_at ? (
                      <>
                        <span className="text-xs text-green-600 font-bold">
                          {s.correct_words}/{s.total_words}語
                        </span>
                        <span>✓</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">未完了</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ナビゲーション */}
        <div className="flex gap-3">
          <Link
            href={studyHref}
            className="flex-1 py-4 bg-green-500 text-white rounded-xl text-center font-bold active:scale-95 transition-transform"
          >
            今日の学習へ →
          </Link>
          {viewingChild ? (
            <Link
              href="/parent"
              className="py-4 px-4 bg-white text-gray-600 rounded-xl text-center text-sm border border-gray-200 active:scale-95 transition-transform"
            >
              ダッシュボード
            </Link>
          ) : isParent ? (
            <Link
              href="/parent"
              className="py-4 px-4 bg-white text-gray-600 rounded-xl text-center text-sm border border-gray-200 active:scale-95 transition-transform"
            >
              ダッシュボード
            </Link>
          ) : (
            <Link
              href="/pairing"
              className="py-4 px-4 bg-white text-gray-600 rounded-xl text-center text-sm border border-gray-200 active:scale-95 transition-transform"
            >
              🔗 保護者と連携
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
