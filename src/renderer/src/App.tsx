import { useEffect, useState } from 'react'
import ChatWindow from './components/ChatWindow'
import SetupScreen from './components/SetupScreen'
import './types'

type AppState = 'loading' | 'setup' | 'ready'

export default function App(): JSX.Element {
  const [state, setState] = useState<AppState>('loading')
  const [cliVersion, setCliVersion] = useState<string | null>(null)

  useEffect(() => {
    if (state !== 'loading') return
    window.geminiAPI.check().then(({ installed, version }) => {
      if (installed) {
        setCliVersion(version)
        setState('ready')
      } else {
        setState('setup')
      }
    })
  }, [state])

  if (state === 'loading') {
    return (
      <div className="flex h-full items-center justify-center bg-surface-2">
        <div className="text-slate-400 text-sm">Checking gemini-cli...</div>
      </div>
    )
  }

  if (state === 'setup') {
    return <SetupScreen onRetry={() => setState('loading')} />
  }

  return <ChatWindow cliVersion={cliVersion} />
}
