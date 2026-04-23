import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'
import { Button } from './ui'
import { askProjectAssistant, type AssistantMessage } from '../lib/projectAssistantApi'
import { cn } from '../lib/cn'

const SUGGESTIONS = [
  'What hardware does this demo use?',
  'How does seizure detection work?',
  'What does the Data Analysis page show?',
]

export default function ProjectAssistant() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<AssistantMessage[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open, loading])

  const send = useCallback(async () => {
    const q = input.trim()
    if (!q || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)

    try {
      const prior = messages.filter((m) => m.role === 'user' || m.role === 'assistant')
      const answer = await askProjectAssistant(prior, q)
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Could not reach the assistant: ${msg}` },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-6 left-6 z-[85] flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.1]',
          'bg-gradient-to-br from-violet-600/90 to-fuchsia-600/80 text-white shadow-[0_20px_50px_-12px_rgba(124,58,237,0.65)]',
          'transition-transform hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60'
        )}
        aria-expanded={open}
        aria-label={open ? 'Close project assistant' : 'Open project assistant'}
      >
        {open ? <X className="h-6 w-6" strokeWidth={2} /> : <MessageCircle className="h-6 w-6" strokeWidth={2} />}
      </button>

      {open && (
        <div
          className={cn(
            'fixed z-[84] flex max-h-[min(560px,85vh)] w-[min(100vw-1.5rem,400px)] flex-col overflow-hidden rounded-2xl border border-white/[0.12]',
            'bg-gradient-to-b from-white/[0.06] to-surface/95 shadow-[0_40px_100px_-28px_rgba(0,0,0,0.88),0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-xl',
            'bottom-[5.5rem] left-3 transform-gpu transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_48px_120px_-32px_rgba(124,58,246,0.22)] sm:left-6'
          )}
          role="dialog"
          aria-label="Project assistant"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="min-w-0 flex-1 font-display text-sm font-semibold tracking-tight text-slate-100">
              Project assistant
            </p>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Try one of these:</p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setInput(s)
                      }}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-left text-xs text-slate-300 transition-colors hover:border-white/[0.1] hover:bg-white/[0.05]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-xl px-3 py-2 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'ml-6 bg-brand-500/15 text-slate-100'
                    : 'mr-4 border border-white/[0.05] bg-black/25 text-slate-300'
                )}
              >
                {m.content}
              </div>
            ))}

            {loading && (
              <p className="text-xs text-slate-500">Thinking…</p>
            )}
          </div>

          <div className="border-t border-white/[0.06] p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
                placeholder="Ask about the project…"
                className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-brand-500/40 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
              />
              <Button type="button" size="icon" className="h-10 w-10 shrink-0" disabled={loading || !input.trim()} onClick={() => void send()} aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
