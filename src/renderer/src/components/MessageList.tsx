import { useEffect, useRef } from 'react'
import MessageBubble, { Message } from './MessageBubble'

interface MessageListProps {
  messages: Message[]
}

export default function MessageList({ messages }: MessageListProps): JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-500">
        <div className="mb-4 text-6xl opacity-20">✦</div>
        <p className="text-lg font-medium text-slate-400">How can I help you?</p>
        <p className="mt-1 text-sm text-slate-600">Ask me anything...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col p-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
