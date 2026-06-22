import type Liff from '@line/liff'

let liffInstance: typeof Liff | null = null
let initialized = false

// LIFF SDK 初期化（冪等: 複数回呼ばれても1回だけ実行）
export async function initLiff(): Promise<typeof Liff> {
  if (initialized && liffInstance) return liffInstance

  const liff = (await import('@line/liff')).default
  await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })

  liffInstance = liff
  initialized = true
  return liff
}

// LINE ユーザー情報を取得（未ログインなら null）
export async function getLiffProfile() {
  const liff = await initLiff()
  if (!liff.isLoggedIn()) return null
  return liff.getProfile()
}

// LINE ID トークンを取得（Supabase Auth のカスタムトークンに使用）
export async function getLiffIdToken(): Promise<string | null> {
  const liff = await initLiff()
  if (!liff.isLoggedIn()) return null
  return liff.getIDToken()
}

// LIFF アプリを閉じる
export async function closeLiff() {
  const liff = await initLiff()
  liff.closeWindow()
}
