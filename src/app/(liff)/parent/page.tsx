import { redirect } from 'next/navigation'

// 旧ダッシュボードは /home（役割別ホーム）に統合。互換のためリダイレクト。
export default function ParentPage() {
  redirect('/home')
}
