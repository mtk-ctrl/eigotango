'use client'

import { useState } from 'react'

interface Props {
  word: string
}

export function SpeakButton({ word }: Props) {
  const [speaking, setSpeaking] = useState(false)

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
