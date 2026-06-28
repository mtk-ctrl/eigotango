'use client'

import { useState, useRef } from 'react'
import { submitFeedback } from '@/app/actions/feedback'

type Category = 'bug' | 'request' | 'other'

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'bug', label: '不具合' },
  { value: 'request', label: '要望' },
  { value: 'other', label: 'その他' },
]

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export function FeedbackForm() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>('bug')
  const [message, setMessage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { setError('画像ファイルを選んでください'); return }
    if (f.size > MAX_IMAGE_BYTES) { setError('画像は5MB以内にしてください'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const clearFile = () => {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async () => {
    if (!message.trim()) { setError('内容を入力してください'); return }
    setSubmitting(true)
    setError('')
    try {
      const fd = new FormData()
      fd.set('category', category)
      fd.set('message', message.trim())
      fd.set('userAgent', typeof navigator !== 'undefined' ? navigator.userAgent : '')
      if (file) fd.set('image', file)
      await submitFeedback(fd)
      setDone(true)
      setMessage('')
      clearFile()
    } catch (e) {
      setError(e instanceof Error ? e.message : '送信に失敗しました。時間をおいて再試行してください。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <button
        onClick={() => { setOpen(o => !o); setDone(false) }}
        className="flex w-full items-center justify-between"
      >
        <div className="text-left">
          <h2 className="text-sm font-bold text-gray-700">📣 ご意見・不具合の報告</h2>
          <p className="text-xs text-gray-400">気づいたこと・困ったことを開発者に送れます</p>
        </div>
        <span className="text-gray-300">{open ? '×' : '›'}</span>
      </button>

      {open && (
        done ? (
          <div className="mt-4 rounded-xl bg-green-50 p-4 text-center">
            <p className="text-2xl">🙏</p>
            <p className="mt-1 text-sm font-bold text-green-700">送信しました。ありがとうございます！</p>
            <button onClick={() => setDone(false)} className="mt-2 text-xs text-green-600 underline">
              続けて送る
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {/* 種別 */}
            <div className="flex gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold ${
                    category === c.value ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* 内容 */}
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="例: 〇〇の画面で△△ボタンを押すと反応しません／□□があると嬉しいです"
              className="w-full resize-none rounded-xl border-2 border-gray-200 p-3 text-sm focus:border-green-400 focus:outline-none"
            />

            {/* 画像添付 */}
            {preview ? (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="添付プレビュー" className="max-h-40 rounded-xl border border-gray-200" />
                <button
                  onClick={clearFile}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-xs text-white"
                  aria-label="画像を削除"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="self-start rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-600"
              >
                🖼 画像を添付（任意）
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              onClick={submit}
              disabled={submitting || !message.trim()}
              className="rounded-xl bg-green-500 py-3 font-bold text-white disabled:opacity-40 active:scale-95 transition-transform"
            >
              {submitting ? '送信中...' : '送信する'}
            </button>
          </div>
        )
      )}
    </div>
  )
}
