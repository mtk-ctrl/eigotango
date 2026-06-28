// プロフィール関連の小さなヘルパー

interface NameParts {
  display_name?: string | null
  line_display_name?: string | null
}

// 表示名の優先順位（LINE 表示名 → 表示名 → フォールバック）を一元化
export function displayNameOf(p: NameParts | null | undefined, fallback = ''): string {
  return p?.line_display_name ?? p?.display_name ?? fallback
}
