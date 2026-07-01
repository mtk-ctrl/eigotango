import type { QuestionModeSetting } from '@/types/database'

export const QUESTION_MODE_OPTIONS: { value: QuestionModeSetting; label: string; help: string }[] = [
  { value: 'auto', label: '自動（おすすめ）', help: '覚え具合に応じて自動で難しくなります' },
  { value: 'en_to_ja_choice', label: '英→日 4択', help: '英単語を見て日本語の意味を選ぶ' },
  { value: 'ja_to_en_choice', label: '日→英 4択', help: '日本語の意味を見て英単語を選ぶ' },
  { value: 'ja_to_en_spell', label: '日→英 スペル入力', help: '日本語の意味を見て英単語を書く' },
]

// 出題形式の選択肢UI（見た目のみ・状態と保存は呼び出し側が持つ）。
// 自分用の QuestionModePicker と、親が子ども用に設定する ChildrenManager の両方から使う。
export function QuestionModeChoices({
  value, onChange,
}: {
  value: QuestionModeSetting
  onChange: (mode: QuestionModeSetting) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {QUESTION_MODE_OPTIONS.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-xl border-2 p-3 text-left transition-transform active:scale-[0.99] ${
            value === o.value ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-white'
          }`}
        >
          <p className={`text-sm font-bold ${value === o.value ? 'text-green-700' : 'text-gray-700'}`}>{o.label}</p>
          <p className="text-xs text-gray-400 mt-0.5">{o.help}</p>
        </button>
      ))}
    </div>
  )
}
