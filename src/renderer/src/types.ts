export type GeminiChunkEvent =
  | { type: 'content'; value: string }
  | { type: 'tool_call'; name: string; args: unknown }
  | { type: 'tool_result'; name: string; result: unknown }
  | { type: 'done'; stats?: unknown }
  | { type: 'error'; message: string }
  | { type: 'stderr'; value: string }

export interface GeminiAPI {
  check: () => Promise<{ installed: boolean; version: string | null }>
  sendMessage: (prompt: string) => Promise<void>
  newSession: () => Promise<{ ok: boolean }>
  onChunk: (callback: (event: GeminiChunkEvent) => void) => () => void
  onDone: (callback: (data: { code: number }) => void) => () => void
  onError: (callback: (data: { message: string }) => void) => () => void
}

declare global {
  interface Window {
    geminiAPI: GeminiAPI
  }
}
