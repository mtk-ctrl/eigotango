import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentDailyMax } from '@/app/actions/study'
import { getChildrenData } from '@/app/actions/parent'
import { FREE_DAILY_MAX } from '@/lib/constants'
import { displayNameOf } from '@/lib/profile'
import { SelfGoalSetting } from '@/components/SelfGoalSetting'
import { CopyHeaderSetting } from '@/components/CopyHeaderSetting'
import { QuestionModePicker } from '@/components/QuestionModePicker'
import { QUESTION_MODE_OPTIONS } from '@/components/QuestionModeChoices'
import { CollapsibleSettingsCard } from '@/components/CollapsibleSettingsCard'
import { BottomNav } from '@/components/BottomNav'
import { LogoutButton } from '@/components/LogoutButton'
import { SettingsClient } from './SettingsClient'
import { ChildrenManager } from './ChildrenManager'
import { FeedbackForm } from './FeedbackForm'
import { UpgradeButton } from './UpgradeButton'
import type { NotificationChannel, QuestionModeSetting } from '@/types/database'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, line_display_name, email, daily_goal, new_per_day, copy_header, question_mode, daily_goal_locked, notification_channel, line_user_id')
    .eq('id', user.id)
    .single()

  const isParent = profile?.role === 'parent'
  const max = await getStudentDailyMax(user.id)
  const premium = max > FREE_DAILY_MAX
  const displayName = displayNameOf(profile)
  const children = isParent ? await getChildrenData() : []

  const newPerDay = profile?.new_per_day ?? 3
  const dailyGoal = profile?.daily_goal ?? 10
  const locked = profile?.daily_goal_locked ?? false
  const questionModeLabel = QUESTION_MODE_OPTIONS
    .find(o => o.value === ((profile?.question_mode as QuestionModeSetting) ?? 'auto'))?.label ?? '自動'
  const selfSummary = `1日 新規${newPerDay}語・復習上限${dailyGoal}語・出題形式: ${questionModeLabel}`
    + (locked ? '（保護者が設定）' : '')

  return (
    <div className="min-h-dvh bg-gray-50 pb-24">
      {/* ヘッダー */}
      <header className="px-5 pt-12 pb-2">
        <h1 className="text-2xl font-bold text-gray-800">せってい</h1>
        <p className="text-sm text-gray-400">{isParent ? 'お子さまの管理・各種設定' : '各種設定'}</p>
      </header>

      <div className="px-5 mt-4 flex flex-col gap-6">
        {/* こども管理（親のみ）: 追加・編集・連携・削除 */}
        {isParent && <ChildrenManager children={children} premium={premium} />}

        {/* 学習: 出題量・出題形式・スキップ・コピー見出しをひとまとめに。
            親アカウントでは「お子さまの学習設定」（上のこども管理）と混同しないよう、
            ここはあくまで「自分（ログイン中の本人）」の設定であることを明示する。
            お子さまの設定カードと同じく、値は要約だけ常に見せ「編集」を押したときだけ開く。 */}
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-xs font-bold tracking-wide text-gray-400">
            {isParent ? '🧑 自分の学習設定' : '学習'}
          </h2>
          {isParent && (
            <p className="px-1 -mt-2 text-[11px] text-gray-400">
              保護者ご自身が学習する場合の設定です。お子さまの設定は上の「お子さまの学習設定」で行います。
            </p>
          )}

          <Link
            href="/words"
            className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm active:scale-[0.99] transition-transform"
          >
            <div>
              <h3 className="text-sm font-bold text-gray-700">✅ 知っている単語をスキップ</h3>
              <p className="mt-0.5 text-xs text-gray-400">理解済みの語を毎日の出題から外す</p>
            </div>
            <span className="text-gray-300">›</span>
          </Link>

          <CollapsibleSettingsCard icon="📚" title="単語数・出題形式" summary={selfSummary}>
            <SelfGoalSetting kind="new" current={newPerDay} locked={locked} max={max} noCard />
            <SelfGoalSetting kind="review" current={dailyGoal} locked={locked} max={max} noCard />
            <QuestionModePicker
              current={(profile?.question_mode as QuestionModeSetting) ?? 'auto'}
              locked={locked}
              noCard
            />
            <CopyHeaderSetting current={profile?.copy_header ?? null} noCard />
          </CollapsibleSettingsCard>
        </section>

        {/* 通知・アカウント */}
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-xs font-bold tracking-wide text-gray-400">通知・アカウント</h2>
          <SettingsClient
            displayName={displayName}
            email={profile?.email ?? null}
            channel={(profile?.notification_channel as NotificationChannel) ?? 'email'}
            lineLinked={!!profile?.line_user_id}
          />
        </section>

        {/* プラン */}
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-xs font-bold tracking-wide text-gray-400">プラン</h2>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            {premium ? (
              <div className="flex items-center gap-2">
                <span className="text-xl text-yellow-500">★</span>
                <p className="font-bold text-gray-800">プレミアムプラン</p>
              </div>
            ) : isParent ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-600">
                  無料プランは1日20語まで。<br />プレミアムで最大100語＋高校受験の全語彙が使えます。
                </p>
                <UpgradeButton />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">無料プラン</span>
                <span className="text-[11px] text-gray-400">プランは保護者が管理します</span>
              </div>
            )}
          </div>
        </section>

        {/* サポート */}
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-xs font-bold tracking-wide text-gray-400">サポート</h2>
          <FeedbackForm />
        </section>

        {/* ログアウト */}
        <div className="flex justify-center">
          <LogoutButton className="text-sm text-gray-400 underline" />
        </div>
      </div>

      <BottomNav role={isParent ? 'parent' : 'student'} />
    </div>
  )
}
