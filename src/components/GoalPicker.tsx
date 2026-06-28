'use client'

// 1日の問題数ピッカー（共通）。緑＝選択中（アクション色）。
export function GoalPicker({
  value, options, onChange,
}: {
  value: number
  options: number[]
  onChange: (n: number) => void
}) {
  const opts = options.includes(value) ? options : [...options, value].sort((a, b) => a - b)
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`rounded-lg px-3 py-2 text-sm font-bold ${value === n ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          {n}語
        </button>
      ))}
    </div>
  )
}
