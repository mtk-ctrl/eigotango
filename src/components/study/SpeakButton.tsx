'use client'

import { useState, useEffect } from 'react'

interface Props {
  word: string
}

export function SpeakButton({ word }: Props) {
  const [speaking, setSpeaking] = useState(false)
  // 非対応環境（古い WebView など）では押しても何も起きないボタンになるので出さない。
  // SSR とのハイドレーション不一致を避けるためマウント後に判定する。
  const [supported, setSupported] = useState(true)
  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
  }, [])

  const speak = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = 0.85  // 少しゆっくり（学習向け）
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  if (!supported) return null

  return (
    <button
      onClick={speak}
      className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
        speaking ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600'
      }`}
      aria-label={`${word}の発音を聞く`}
    >
      <span className={speaking ? 'animate-pulse' : ''}>🔊</span>
      {speaking ? '再生中...' : '発音を聞く'}
    </button>
  )
}
