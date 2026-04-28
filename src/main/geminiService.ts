import { ipcMain, BrowserWindow } from 'electron'
import { spawn, execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Normalise a parsed JSONL event into our internal { type, value } shape.
// gemini-cli's actual stream-json field names are not fully documented,
// so we probe several candidates.
function normaliseEvent(raw: Record<string, unknown>): { type: string; value?: string; name?: string; args?: unknown } | null {
  const type = String(raw.type ?? '')
  const role = typeof raw.role === 'string' ? raw.role : null

  // Skip echoes of the user's own prompt — gemini-cli emits these as
  // {type:"message", role:"user", content:"..."} at the start of every turn.
  if (role === 'user') return null

  // Extract text from whichever field the CLI happens to use
  const text =
    typeof raw.value === 'string' ? raw.value :
    typeof raw.content === 'string' ? raw.content :
    typeof raw.text === 'string' ? raw.text :
    typeof raw.message === 'string' ? raw.message :
    null

  // Content / text events
  const contentTypes = ['content', 'text', 'message', 'assistant', 'response', 'output']
  if (contentTypes.includes(type) && text) {
    return { type: 'content', value: text }
  }

  // If there's text but an unrecognised (or absent) type, still surface it
  if (text && !type) {
    return { type: 'content', value: text }
  }

  // Tool call events
  const toolCallTypes = ['tool_call', 'toolCall', 'toolUse', 'function_call']
  if (toolCallTypes.includes(type)) {
    const name = String(raw.name ?? raw.toolName ?? raw.function_name ?? 'unknown')
    const args = raw.args ?? raw.input ?? raw.arguments ?? {}
    return { type: 'tool_call', name, args }
  }

  // Done / end events — no value needed, handled by close handler
  const doneTypes = ['done', 'end', 'finalResponse', 'complete', 'finish']
  if (doneTypes.includes(type)) return null

  // Unknown event with text → surface as content
  if (text) return { type: 'content', value: text }

  return null
}

export function registerGeminiHandlers(mainWindow: BrowserWindow): void {
  // The first message creates a gemini-cli session; we capture its session_id
  // from the init event and pass it explicitly to --resume on subsequent
  // messages. Cleared by gemini:new-session so the next send starts fresh.
  let activeSessionId: string | null = null

  // Check if gemini-cli is installed and accessible
  ipcMain.handle('gemini:check', async () => {
    try {
      const { stdout } = await execFileAsync('gemini', ['--version'], { timeout: 5000, shell: true })
      return { installed: true, version: stdout.trim() }
    } catch {
      return { installed: false, version: null }
    }
  })

  // Reset session (new chat) — next send-message will start a fresh gemini session
  ipcMain.handle('gemini:new-session', () => {
    activeSessionId = null
    return { ok: true }
  })

  // Send a message and stream the response back
  ipcMain.handle('gemini:send-message', async (_event, prompt: string) => {
    return new Promise<void>((resolve, reject) => {
      const isWin = process.platform === 'win32'
      const cmd = isWin ? 'gemini.cmd' : 'gemini'

      // On Windows we must use shell:true to invoke the .cmd shim,
      // and shell:true does not auto-quote args — so we hand-quote the
      // prompt for cmd.exe (escape internal " by doubling).
      // Without this, prompts containing spaces or special chars cause
      // gemini-cli to receive mangled args and exit with code 1.
      const quotedPrompt = isWin ? `"${prompt.replace(/"/g, '""')}"` : prompt
      const args = ['-p', quotedPrompt, '--output-format', 'stream-json']
      if (activeSessionId) {
        args.push('--resume', activeSessionId)
      }

      const child = spawn(cmd, args, {
        env: process.env,
        shell: isWin
      })

      let buffer = ''
      let stderrBuffer = ''
      let receivedAnyContent = false

      const processLine = (line: string): void => {
        const trimmed = line.trim()
        if (!trimmed) return

        let parsed: Record<string, unknown> | null = null
        try {
          parsed = JSON.parse(trimmed)
        } catch {
          // Not JSON — forward raw text directly as content
          mainWindow.webContents.send('gemini:chunk', { type: 'content', value: trimmed + '\n' })
          receivedAnyContent = true
          return
        }

        // Capture session_id from the init event so we can resume by id later
        if (parsed.type === 'init' && typeof parsed.session_id === 'string') {
          activeSessionId = parsed.session_id
        }

        const norm = normaliseEvent(parsed)
        if (norm) {
          mainWindow.webContents.send('gemini:chunk', norm)
          if (norm.type === 'content') receivedAnyContent = true
        }
      }

      child.stdout.on('data', (data: Buffer) => {
        buffer += data.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) processLine(line)
      })

      child.stderr.on('data', (data: Buffer) => {
        const text = data.toString()
        stderrBuffer += text
        mainWindow.webContents.send('gemini:chunk', { type: 'stderr', value: text })
      })

      child.on('close', (code) => {
        // Flush remainder
        if (buffer.trim()) processLine(buffer.trim())

        if (code === 0) {
          mainWindow.webContents.send('gemini:done', { code })
          resolve()
        } else {
          const detail = stderrBuffer.trim() || (receivedAnyContent ? '(no stderr output)' : '(no output)')
          const message = `gemini-cli exited with code ${code}: ${detail}`
          mainWindow.webContents.send('gemini:error', { message })
          reject(new Error(message))
        }
      })

      child.on('error', (err) => {
        mainWindow.webContents.send('gemini:error', { message: err.message })
        reject(err)
      })
    })
  })
}
