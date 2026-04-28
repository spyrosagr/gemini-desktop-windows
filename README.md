# Gemini Desktop

An open-source desktop chat client for Google's [Gemini CLI](https://github.com/google-gemini/gemini-cli), built with Electron, Vite, React, TypeScript, and Tailwind CSS. Targets Windows but should run on macOS and Linux as well.

## Features

- Chat UI with markdown + syntax highlighting (`react-markdown`, `react-syntax-highlighter`)
- Streaming responses with a smooth, adaptive typewriter effect
- Session continuity — multi-turn conversations via `gemini --resume <session_id>`
- "New chat" button to start a fresh session
- Auto-detects gemini-cli on PATH; shows install instructions if missing
- Auto-resizing input, Shift+Enter for newlines

## Requirements

- [Node.js](https://nodejs.org/) 20+
- [`@google/gemini-cli`](https://www.npmjs.com/package/@google/gemini-cli) installed and on `PATH`:
  ```sh
  npm install -g @google/gemini-cli
  ```
  Then sign in once: `gemini auth`

## Development

Install dependencies and start the dev server (hot reload for renderer + main):

```sh
npm install
npm run dev
```

## Building

Produce a packaged Windows build (NSIS installer + portable EXE) into `dist/`:

```sh
npm run build
```

For an unpacked build (faster iteration on packaging):

```sh
npm run build:unpack
```

## Project structure

```
src/
  main/              Electron main process
    index.ts         App lifecycle, window creation
    geminiService.ts IPC handlers — spawns gemini-cli, streams stdout
  preload/           Context-isolated bridge exposed to the renderer
  renderer/          React app (Vite)
    src/
      App.tsx           Top-level state — install check / chat
      components/
        ChatWindow.tsx  Message list + IPC plumbing + typewriter buffer
        InputBar.tsx    Auto-resizing textarea
        MessageBubble.tsx  Markdown + code rendering
        MessageList.tsx
        SetupScreen.tsx Shown when gemini-cli isn't found
```

## How it talks to gemini-cli

Each message spawns `gemini -p <prompt> --output-format stream-json`. Output is JSONL with shapes like:

```json
{"type":"init","session_id":"…","model":"…"}
{"type":"message","role":"user","content":"…"}
{"type":"message","role":"assistant","content":"…","delta":true}
{"type":"result","status":"success","stats":{…}}
```

The main process captures `session_id` from the first turn's `init` event and passes it to subsequent turns as `--resume <session_id>` so the chat carries context. User-role echoes are filtered out so only assistant text reaches the UI.

## License

Apache-2.0. Not affiliated with Google.
