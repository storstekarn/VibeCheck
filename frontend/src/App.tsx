import { useState, useEffect } from 'react';
import { UrlInput } from './components/UrlInput';
import { ProgressTracker } from './components/ProgressTracker';
import { ReportView } from './components/ReportView';
import { ConsentModal } from './components/ConsentModal';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { startScan, connectProgress, getReport } from './lib/api';
import type { QAReport, ProgressEvent } from './types';

// --- Minimal client-side router ---
// The Express server has a catch-all that serves index.html for every path,
// so all routes land here and we decide what to render based on pathname.

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  function navigate(to: string) {
    history.pushState(null, '', to);
    setPath(to);
  }

  return { path, navigate };
}

// --- App state machine ---

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
  return message;
}

// --- Main app ---

function App() {
  const { path, navigate } = useRoute();
  const [state, setState] = useState<AppState>({ phase: 'input' });
  const [isLoading, setIsLoading] = useState(false);

  // URL waiting for user consent before the scan starts
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  // Render the privacy policy page at /privacy
  if (path === '/privacy') {
    return <PrivacyPolicy onBack={() => navigate('/')} />;
  }

  // Show the consent modal before the scan starts
  function handleSubmit(url: string) {
    setPendingUrl(url);
  }

  function handleConsentCancel() {
    setPendingUrl(null);
  }

  async function handleConsentAccept() {
    if (!pendingUrl) return;
    const url = pendingUrl;
    setPendingUrl(null);
    await executeScan(url);
  }

  async function executeScan(url: string) {
    setIsLoading(true);
    try {
      const { scanId } = await startScan(url);

      setState({ phase: 'scanning', scanId, progress: [] });

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
        (connectionError) => {
          // SSE connection dropped mid-scan.
          // Poll getReport every 5 s until the scan finishes — the backend
          // returns 202 while still running and a full report when done.
          // Only give up after ~2 minutes (24 attempts).
          function tryGetReport(attemptsLeft: number) {
            getReport(scanId)
              .then((report) => setState({ phase: 'report', report }))
              .catch((err) => {
                const stillRunning =
                  err instanceof Error && err.message.includes('still in progress');
                if (stillRunning && attemptsLeft > 0) {
                  setTimeout(() => tryGetReport(attemptsLeft - 1), 5000);
                } else {
                  setState({ phase: 'error', message: connectionError });
                }
              });
          }
          tryGetReport(24);
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
      {/* Consent modal — rendered as overlay, doesn't change phase */}
      {pendingUrl && (
        <ConsentModal
          url={pendingUrl}
          onAccept={handleConsentAccept}
          onCancel={handleConsentCancel}
        />
      )}

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

      <footer className="py-5 px-6 text-center text-xs text-ink-faint tracking-widest uppercase font-code">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <span>
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
          </span>
          <span className="text-line" aria-hidden="true">|</span>
          <button
            onClick={() => navigate('/privacy')}
            className="text-ink-faint hover:text-ink transition-colors"
          >
            Privacy Policy
          </button>
          <span className="text-line" aria-hidden="true">|</span>
          <a
            href="mailto:info@synergyminds.se"
            className="text-ink-faint hover:text-ink transition-colors normal-case tracking-normal"
          >
            info@synergyminds.se
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
