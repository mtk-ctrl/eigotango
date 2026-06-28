import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getStudentDailyMax } from '@/app/actions/study'
import { BottomNav } from '@/components/BottomNav'

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
    .select('role')
    .eq('id', user.id)
    .single()
  const isStudent = myProfile?.role !== 'parent'

  // 対象の student を決定
  let studentId = user.id
  let childName: string | undefined
  const viewingChild = !!child && child !== user.id
  if (viewingChild) {
    if (!(await parentOwnsChild(user.id, child!))) redirect('/home')
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

  return (
    <div className={`min-h-dvh bg-gray-50 ${viewingChild ? 'pb-8' : 'pb-24'}`}>
      {/* ヘッダー */}
      <header className="px-5 pt-12 pb-2">
        {viewingChild && (
          <Link href="/home" className="text-xs text-gray-400 underline">← ホームへ</Link>
        )}
        <h1 className="mt-1 text-2xl font-bold text-gray-800">
          {viewingChild ? `${childName}さんのきろく` : 'きろく'}
        </h1>
        <p className="text-sm text-gray-400">これまでの学習の成果</p>
      </header>

      <div className="px-5 mt-4 flex flex-col gap-4">
        {/* 総合統計 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">{totalLearned}</p>
              <p className="mt-1 text-xs text-gray-500">学習済み</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">{mastered}</p>
              <p className="mt-1 text-xs text-gray-500">定着済み（4回以上正解）</p>
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-gray-400">
              <span>総合進捗</span>
              <span>{totalLearned} / {totalWords}語</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-green-500 transition-all"
                style={{ width: `${totalWords > 0 ? Math.min(100, (totalLearned / totalWords) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* 学年別内訳 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-gray-700">学年別</h2>
          <div className="flex flex-col gap-3">
            {gradeStats.map(stat => (
              <div key={stat.grade}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{stat.grade}</span>
                  <span className="text-xs text-gray-400">{stat.learned} / {stat.total}語</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-blue-400"
                    style={{ width: `${stat.total > 0 ? Math.min(100, (stat.learned / stat.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 直近7日間 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-gray-700">直近7日間</h2>
          {sessions.length === 0 ? (
            <p className="py-2 text-center text-sm text-gray-400">まだ学習履歴がありません</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map(s => (
                <div key={s.session_date} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-600">{formatDate(s.session_date)}</span>
                  <div className="flex items-center gap-2">
                    {s.completed_at ? (
                      <>
                        <span className="text-xs font-bold text-green-600">{s.correct_words}/{s.total_words}語</span>
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

        {/* 子どもの記録を見ているとき: 学習導線とホームへ戻る */}
        {viewingChild && (
          <div className="flex gap-3">
            <Link
              href={`/study?child=${studentId}`}
              className="flex-1 rounded-xl bg-green-500 py-4 text-center font-bold text-white active:scale-95 transition-transform"
            >
              この子の学習へ →
            </Link>
            <Link
              href="/home"
              className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-center text-sm text-gray-600 active:scale-95 transition-transform"
            >
              ホーム
            </Link>
          </div>
        )}

        {/* 生徒本人: 保護者と連携する導線 */}
        {!viewingChild && isStudent && (
          <Link
            href="/pairing"
            className="rounded-2xl bg-white p-4 shadow-sm flex items-center justify-between active:scale-[0.99] transition-transform"
          >
            <span className="text-sm font-bold text-gray-700">🔗 保護者と連携する</span>
            <span className="text-gray-300">›</span>
          </Link>
        )}
      </div>

      {!viewingChild && <BottomNav role={isStudent ? 'student' : 'parent'} />}
    </div>
  )
}
