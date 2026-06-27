'use client'

interface Props {
  choices: string[]
  onSubmit: (value: string) => void
}

export function ChoiceInput({ choices, onSubmit }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3">
        {choices.map((c, i) => (
          <button
            key={`${c}-${i}`}
            onClick={() => onSubmit(c)}
            className="w-full py-4 px-4 bg-white border-2 border-gray-200 rounded-xl text-lg font-bold text-gray-800 active:scale-95 active:border-green-400 transition-all text-center"
          >
            {c}
          </button>
        ))}
      </div>
      <button
        onClick={() => onSubmit('')}
        className="w-full py-3 text-gray-400 text-sm active:text-gray-600"
      >
        わからない
      </button>
    </div>
  )
}
