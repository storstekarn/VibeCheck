import { useState } from 'react';
import { UrlInput } from './components/UrlInput';
import { ProgressTracker } from './components/ProgressTracker';
import { ReportView } from './components/ReportView';
import { startScan, connectProgress, getReport } from './lib/api';
import type { QAReport, ProgressEvent } from './types';

type AppState =
  | { phase: 'input' }
  | { phase: 'scanning'; scanId: string; progress: ProgressEvent[] }
  | { phase: 'report'; report: QAReport }
  | { phase: 'error'; message: string };

function getFriendlyError(message: string): string {
  if (message.includes('timed out') || message.includes('timeout')) {
    return 'The scan took too long and was stopped. Try scanning a smaller site or one with fewer pages.';
  }
  if (message.includes('Connection to server lost')) {
    return 'Lost connection to the server. Please check your internet connection and try again.';
  }
  if (message.includes('Failed to load report') || message.includes('Failed to fetch report')) {
    return 'Could not load the scan results. Please try again.';
  }
  if (message.includes('Failed to start scan')) {
    return 'Could not start the scan. Please check the URL and try again.';
  }
  if (message.includes('already running')) {
    return 'Another scan is already in progress. Please wait a moment and try again.';
  }
  // Validation errors and other already-friendly messages are returned as-is
  return message;
}

function App() {
  const [state, setState] = useState<AppState>({ phase: 'input' });
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(url: string) {
    setIsLoading(true);
    try {
      const { scanId } = await startScan(url);

      setState({ phase: 'scanning', scanId, progress: [] });

      // Connect to SSE progress stream
      connectProgress(
        scanId,
        (event) => {
          setState((prev) => {
            if (prev.phase !== 'scanning') return prev;
            return { ...prev, progress: [...prev.progress, event] };
          });

          // When progress hits 100, fetch the report
          if (event.progress >= 100) {
            setTimeout(async () => {
              try {
                const report = await getReport(scanId);
                setState({ phase: 'report', report });
              } catch {
                setState({ phase: 'error', message: 'Failed to load report' });
              }
            }, 500);
          }
        },
        (error) => {
          // SSE error — try to fetch report anyway (scan may have completed)
          getReport(scanId)
            .then((report) => setState({ phase: 'report', report }))
            .catch(() => setState({ phase: 'error', message: error }));
        },
      );
    } catch (err) {
      setState({ phase: 'error', message: err instanceof Error ? err.message : 'Failed to start scan' });
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setState({ phase: 'input' });
  }

  return (
    <div className="min-h-screen app-bg flex flex-col font-body text-ink">
      <main className="flex-1">
        {state.phase === 'input' && (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] px-4">
            {/* Shared container — title and input are the same width */}
            <div className="w-full max-w-xl">
              <div className="text-center mb-8 animate-fade-up">
                {/* Decorative badge — aria-hidden since it's purely visual */}
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand/20 bg-brand/5 text-brand text-xs font-code mb-6 tracking-wider"
                  aria-hidden="true"
                >
                  ◆ AUTOMATED QA
                </div>
                <h1 className="text-6xl font-display font-extrabold text-ink mb-3 tracking-tight">
                  Vibe<span className="text-brand">Check</span>
                </h1>
                <p className="text-base text-ink-dim leading-relaxed max-w-sm mx-auto">
                  Scan your app for bugs and get AI-generated prompts to fix them
                </p>
              </div>
              <div className="max-w-sm mx-auto animate-fade-up" style={{ animationDelay: '100ms' }}>
                <UrlInput onSubmit={handleSubmit} isLoading={isLoading} />
              </div>
            </div>
          </div>
        )}

        {state.phase === 'scanning' && (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] px-4">
            <ProgressTracker progress={state.progress} />
          </div>
        )}

        {state.phase === 'report' && (
          <ReportView report={state.report} onReset={handleReset} />
        )}

        {/* role="alert" ensures screen readers announce the error immediately (SC 4.1.3) */}
        {state.phase === 'error' && (
          <div
            role="alert"
            className="flex flex-col items-center justify-center min-h-[calc(100vh-60px)] px-4"
          >
            <div className="text-center animate-fade-up">
              <div
                className="w-12 h-12 rounded-full bg-crit/10 border border-crit/20 flex items-center justify-center mx-auto mb-4 text-xl"
                aria-hidden="true"
              >
                ✕
              </div>
              <h2 className="text-lg font-display font-bold text-ink mb-2">Something went wrong</h2>
              <p className="text-base text-ink-dim mb-6 max-w-sm">{getFriendlyError(state.message)}</p>
              <button
                onClick={handleReset}
                className="px-6 py-2.5 bg-surface text-ink rounded-xl border border-line
                  hover:bg-raised hover:border-line-bright transition-all duration-200 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="py-5 text-center text-xs text-ink-faint tracking-widest uppercase font-code">
        Powered by{' '}
        <a
          href="https://synergyminds.se"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Synergy Minds (opens in new tab)"
          className="text-ink-dim hover:text-ink transition-colors"
        >
          Synergy Minds
        </a>
      </footer>
    </div>
  );
}

export default App;
