import { contextBridge, ipcRenderer } from 'electron'

export type GeminiChunkEvent =
  | { type: 'content'; value: string }
  | { type: 'tool_call'; name: string; args: unknown }
  | { type: 'tool_result'; name: string; result: unknown }
  | { type: 'done'; stats?: unknown }
  | { type: 'error'; message: string }
  | { type: 'stderr'; value: string }

contextBridge.exposeInMainWorld('geminiAPI', {
  check: (): Promise<{ installed: boolean; version: string | null }> =>
    ipcRenderer.invoke('gemini:check'),

  sendMessage: (prompt: string): Promise<void> =>
    ipcRenderer.invoke('gemini:send-message', prompt),

  newSession: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('gemini:new-session'),

  onChunk: (callback: (event: GeminiChunkEvent) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, event: GeminiChunkEvent): void =>
      callback(event)
    ipcRenderer.on('gemini:chunk', handler)
    return () => ipcRenderer.removeListener('gemini:chunk', handler)
  },

  onDone: (callback: (data: { code: number }) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: { code: number }): void => callback(data)
    ipcRenderer.on('gemini:done', handler)
    return () => ipcRenderer.removeListener('gemini:done', handler)
  },

  onError: (callback: (data: { message: string }) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: { message: string }): void =>
      callback(data)
    ipcRenderer.on('gemini:error', handler)
    return () => ipcRenderer.removeListener('gemini:error', handler)
  }
})
