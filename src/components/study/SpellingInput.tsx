'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  onSubmit: (value: string) => void
}

export function SpellingInput({ onSubmit }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // 次の単語に移ったとき入力をリセットしてフォーカス
    setValue('')
    inputRef.current?.focus()
  }, [onSubmit])

  const handleSubmit = () => {
    if (!value.trim()) return
    onSubmit(value.trim())
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        placeholder="英語でスペルを入力..."
        className="w-full text-xl text-center p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none tracking-widest"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="w-full py-4 bg-green-500 text-white rounded-xl text-lg font-bold disabled:opacity-40 active:scale-95 transition-transform"
      >
        確認する
      </button>
      <button
        onClick={() => onSubmit('')}
        className="w-full py-3 text-gray-400 text-sm active:text-gray-600"
      >
        わからない
      </button>
    </div>
  )
}
