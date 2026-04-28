import { useCallback, useEffect, useRef, useState } from 'react'
import MessageList from './MessageList'
import InputBar from './InputBar'
import { Message } from './MessageBubble'
import { GeminiChunkEvent } from '../types'

interface ChatWindowProps {
  cliVersion: string | null
}

let messageIdCounter = 0
function nextId(): string {
  return String(++messageIdCounter)
}

export default function ChatWindow({ cliVersion }: ChatWindowProps): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const currentAssistantId = useRef<string | null>(null)

  // Typewriter buffer: gemini-cli emits a small number of large chunks per
  // turn, which makes the reply pop in lumps. We queue incoming text and
  // drain it on each animation frame so it reveals smoothly. Drain size is
  // adaptive (≈ backlog / 30) so short replies feel typewriter-like and
  // long replies still finish quickly instead of dragging.
  const pendingTextRef = useRef('')
  const rafIdRef = useRef<number | null>(null)

  const drainStep = (): void => {
    const id = currentAssistantId.current
    const pending = pendingTextRef.current
    if (!id || !pending) {
      rafIdRef.current = null
      return
    }
    const sliceLen = Math.max(1, Math.ceil(pending.length / 30))
    const slice = pending.slice(0, sliceLen)
    pendingTextRef.current = pending.slice(sliceLen)
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: m.content + slice, streaming: true } : m))
    )
    rafIdRef.current = pendingTextRef.current.length > 0 ? requestAnimationFrame(drainStep) : null
  }

  const flushAllPending = (): void => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    const id = currentAssistantId.current
    const pending = pendingTextRef.current
    pendingTextRef.current = ''
    if (id && pending) {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, content: m.content + pending } : m))
      )
    }
  }

  // Register IPC listeners once
  useEffect(() => {
    const removeChunk = window.geminiAPI.onChunk((event: GeminiChunkEvent) => {
      if (event.type === 'content' && currentAssistantId.current) {
        pendingTextRef.current += event.value
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(drainStep)
        }
      } else if (event.type === 'tool_call' && currentAssistantId.current) {
        const id = currentAssistantId.current
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  toolCalls: [...(m.toolCalls ?? []), { name: event.name, args: event.args }]
                }
              : m
          )
        )
      }
      // stderr events are silently ignored unless we want to surface them
    })

    const removeDone = window.geminiAPI.onDone(() => {
      flushAllPending()
      if (currentAssistantId.current) {
        const id = currentAssistantId.current
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, streaming: false } : m))
        )
      }
      currentAssistantId.current = null
      setStreaming(false)
    })

    const removeError = window.geminiAPI.onError((data) => {
      flushAllPending()
      if (currentAssistantId.current) {
        const id = currentAssistantId.current
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  content: m.content + `\n\n⚠️ Error: ${data.message}`,
                  streaming: false
                }
              : m
          )
        )
      }
      currentAssistantId.current = null
      setStreaming(false)
    })

    return () => {
      removeChunk()
      removeDone()
      removeError()
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current)
    }
  }, [])

  const handleSend = useCallback(async (text: string) => {
    if (streaming) return

    // Add user message
    const userMsg: Message = { id: nextId(), role: 'user', content: text }
    // Add empty assistant message (will be filled by streaming)
    const assistantId = nextId()
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    currentAssistantId.current = assistantId
    setStreaming(true)

    try {
      await window.geminiAPI.sendMessage(text)
    } catch {
      // Error is handled by the onError listener
    }
  }, [streaming])

  const handleNewChat = useCallback(async () => {
    await window.geminiAPI.newSession()
    setMessages([])
    currentAssistantId.current = null
    setStreaming(false)
  }, [])

  return (
    <div className="flex h-full flex-col bg-surface-2">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/50 bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">✦</span>
          <span className="font-semibold text-white">Gemini Desktop</span>
          {cliVersion && (
            <span className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-400">
              cli {cliVersion}
            </span>
          )}
        </div>
        <button
          onClick={handleNewChat}
          disabled={streaming}
          title="New conversation"
          className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-300 disabled:opacity-50"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          New chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
      </div>

      {/* Input */}
      <InputBar onSend={handleSend} disabled={streaming} />
    </div>
  )
}
