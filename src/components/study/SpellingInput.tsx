'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  onSubmit: (value: string) => void
}

// 表示直後は送信を受け付けない時間（ミリ秒）。
// 「次へ」のタップ/Enter のゴーストイベントによる誤送信を防ぐ。
const IGNORE_SUBMIT_AFTER_MOUNT_MS = 250

export function SpellingInput({ onSubmit }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  // Android の IME（GBoard 等）は変換確定時に keyCode 229 の合成 Enter イベントを送ってから
  // 本物の Enter を送ることがあり、素直に拾うと1回の Enter 操作で二重送信されて次の問題まで
  // 勝手に進んでしまう。ここでローカルに一度きりのガードをかけて二重発火を防ぐ。
  const submittedRef = useRef(false)
  // 問題ごとに key 付きで再マウントされるため、mountedAt は「この問題が表示された時刻」
  const mountedAtRef = useRef(Date.now())

  useEffect(() => {
    // 次の単語に移ったとき入力をリセットしてフォーカス
    submittedRef.current = false
    setValue('')
    inputRef.current?.focus()
  }, [onSubmit])

  const submit = (v: string) => {
    if (submittedRef.current) return
    if (Date.now() - mountedAtRef.current < IGNORE_SUBMIT_AFTER_MOUNT_MS) return
    submittedRef.current = true
    onSubmit(v)
  }

  const handleSubmit = () => {
    if (!value.trim()) return
    submit(value.trim())
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key !== 'Enter') return
          // IME 変換確定中の合成 Enter（isComposing / keyCode 229）は無視する
          if (e.nativeEvent.isComposing || e.keyCode === 229) return
          // Enter の既定動作（暗黙のフォーム送信・ボタン活性化など）を確実に止める
          e.preventDefault()
          handleSubmit()
        }}
        placeholder="英語でスペルを入力..."
        className="w-full text-xl text-center p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none tracking-widest"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="w-full py-4 bg-green-500 text-white rounded-xl text-lg font-bold disabled:opacity-40 active:scale-95 transition-transform"
      >
        確認する
      </button>
      <button
        type="button"
        onClick={() => submit('')}
        className="w-full py-3 text-gray-400 text-sm active:text-gray-600"
      >
        わからない
      </button>
    </div>
  )
}
