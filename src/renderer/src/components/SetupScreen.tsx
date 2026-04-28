interface SetupScreenProps {
  onRetry: () => void
}

export default function SetupScreen({ onRetry }: SetupScreenProps): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-surface-2 p-8 text-center">
      <div className="mb-6 text-5xl">✦</div>
      <h1 className="mb-2 text-2xl font-semibold text-white">Gemini Desktop</h1>
      <p className="mb-8 text-slate-400 max-w-md">
        This app requires{' '}
        <code className="rounded bg-slate-700 px-1.5 py-0.5 text-sm text-accent">
          @google/gemini-cli
        </code>{' '}
        to be installed and available in your PATH.
      </p>

      <div className="mb-8 w-full max-w-lg rounded-xl bg-surface p-6 text-left">
        <p className="mb-3 text-sm font-medium text-slate-300">Install with npm:</p>
        <code className="block rounded-lg bg-slate-800 p-3 text-sm text-green-400">
          npm install -g @google/gemini-cli
        </code>

        <p className="mb-3 mt-5 text-sm font-medium text-slate-300">Or run without installing:</p>
        <code className="block rounded-lg bg-slate-800 p-3 text-sm text-green-400">
          npx @google/gemini-cli
        </code>

        <p className="mt-5 text-sm text-slate-400">
          After installing, run{' '}
          <code className="rounded bg-slate-700 px-1 py-0.5 text-xs text-accent">gemini auth</code>{' '}
          in a terminal to sign in with your Google account.
        </p>
      </div>

      <button
        onClick={onRetry}
        className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-2"
      >
        I&apos;ve installed it — Retry
      </button>
    </div>
  )
}
