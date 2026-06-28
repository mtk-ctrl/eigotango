import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentDailyMax, getReviewStatus } from '@/app/actions/study'
import { SelfGoalSetting } from '@/components/SelfGoalSetting'
import { LogoutButton } from '@/components/LogoutButton'
import { SettingsClient } from './SettingsClient'
import type { NotificationChannel } from '@/types/database'

// 解き忘れ（期限切れ復習）の状況カード。サーバーで集計済みの値を表示するだけ。
function ReviewReminderCard({
  due,
  overdue,
  newRemaining,
  dailyGoal,
}: {
  due: number
  overdue: number
  newRemaining: number
  dailyGoal: number
}) {
  // パターン1: 復習待ちゼロ
  if (due === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="text-2xl">✅</span>
          <div className="flex-1">
            <p className="font-bold text-gray-700">復習はすべて完了！</p>
            <p className="text-sm text-gray-500 mt-1">
              {newRemaining > 0
                ? `新しい単語が ${newRemaining}語 待っています。挑戦してみよう。`
                : '今日の出題はありません。また明日チャレンジしよう。'}
            </p>
            {newRemaining > 0 && (
              <Link
                href="/study"
                className="inline-block mt-3 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform"
              >
                新しい単語に挑戦 →
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 追いつくのに必要な日数（1日 dailyGoal 語ペース）
  const daysToClear = Math.ceil(due / Math.max(dailyGoal, 1))

  // パターン2/3: 復習待ちあり（期限切れの有無で見せ方を変える）
  return (
    <div className={`rounded-2xl p-5 shadow-sm ${overdue > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-white'}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{overdue > 0 ? '⏰' : '📚'}</span>
        <div className="flex-1">
          <p className="font-bold text-gray-800">
            {overdue > 0 ? '解き忘れがあります' : '今日の復習があります'}
          </p>

          <div className="flex items-end gap-4 mt-2">
            <div>
              <p className="text-3xl font-bold text-gray-800 leading-none">{due}</p>
              <p className="text-[11px] text-gray-500 mt-1">復習待ち（語）</p>
            </div>
            {overdue > 0 && (
              <div>
                <p className="text-3xl font-bold text-orange-500 leading-none">{overdue}</p>
                <p className="text-[11px] text-gray-500 mt-1">うち期限切れ</p>
              </div>
            )}
          </div>

          {/* 1日の出題上限を超えていれば追いつく目安を案内 */}
          {due > dailyGoal && (
            <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
              1日 {dailyGoal}語ずつ出題するので、追いつくまで約 {daysToClear}日かかります。
              下の「1日の問題数」を増やすと、まとめて消化できます。
            </p>
          )}

          <Link
            href="/study"
            className="inline-block mt-3 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold active:scale-95 transition-transform"
          >
            今すぐ復習する →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, line_display_name, email, daily_goal, daily_goal_locked, notification_channel, line_user_id')
    .eq('id', user.id)
    .single()

  const isParent = profile?.role === 'parent'
  const homeHref = isParent ? '/parent' : '/progress'

  const [max, review] = await Promise.all([
    getStudentDailyMax(user.id),
    getReviewStatus(user.id),
  ])

  const displayName = profile?.line_display_name ?? profile?.display_name ?? ''

  return (
    <div className="min-h-dvh bg-gray-50 pb-10">
      {/* ヘッダー */}
      <div className="bg-green-500 text-white px-4 pt-10 pb-6">
        <Link href={homeHref} className="text-xs text-white/70 underline">← 戻る</Link>
        <h1 className="text-xl font-bold mt-1 flex items-center gap-2">
          <span>⚙️</span> 設定
        </h1>
      </div>

      <div className="px-4 mt-4 flex flex-col gap-4">
        {/* 復習リマインド（解き忘れの可視化） */}
        <ReviewReminderCard
          due={review.due}
          overdue={review.overdue}
          newRemaining={review.newRemaining}
          dailyGoal={review.dailyGoal}
        />

        {/* 1日の問題数（4問含む・親がロック中は読み取り専用） */}
        <SelfGoalSetting
          current={profile?.daily_goal ?? 10}
          locked={profile?.daily_goal_locked ?? false}
          max={max}
        />

        {/* 通知方法・アカウント（クライアント） */}
        <SettingsClient
          displayName={displayName}
          email={profile?.email ?? null}
          channel={(profile?.notification_channel as NotificationChannel) ?? 'email'}
          lineLinked={!!profile?.line_user_id}
        />

        {/* プラン（表示のみ。変更導線は役割に応じて） */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 text-sm mb-2">プラン</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 font-bold">
              {max > 20 ? '★ プレミアム' : '無料プラン'}
            </span>
            {isParent ? (
              <Link href="/parent" className="text-xs text-green-600 underline">
                プランを管理
              </Link>
            ) : (
              <span className="text-[11px] text-gray-400">
                {max > 20 ? `1日最大${max}語` : '保護者連携でプレミアム可'}
              </span>
            )}
          </div>
        </div>

        {/* ログアウト */}
        <div className="flex justify-center pt-2">
          <LogoutButton className="text-sm text-gray-400 underline" />
        </div>
      </div>
    </div>
  )
}
