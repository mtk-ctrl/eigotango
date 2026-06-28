import { redirect } from 'next/navigation'

// ルートアクセスは役割別ホームへ集約
export default function RootPage() {
  redirect('/home')
}
