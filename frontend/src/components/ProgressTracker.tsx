import type { ProgressEvent } from '../types';

interface ProgressTrackerProps {
  progress: ProgressEvent[];
}

export function ProgressTracker({ progress }: ProgressTrackerProps) {
  const latest = progress[progress.length - 1];
  const percent = latest?.progress ?? 0;
  const pastEvents = progress.slice(0, -1);

  return (
    <div className="w-full max-w-md space-y-6 animate-fade-up">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold text-ink tracking-tight">
          Scanning
        </h2>
        <p className="text-ink-dim text-sm mt-1 font-code">
          {latest?.message ?? 'Initializing...'}
        </p>
      </div>

      {/* Progress bar + inline percentage */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-code text-ink-faint uppercase tracking-widest">Progress</span>
          {/* Percentage as a small accent — aria-live announces changes to screen readers (SC 4.1.3) */}
          <span
            className="text-xl font-display font-bold text-brand tabular-nums"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`${percent} percent complete`}
          >
            {percent}%
          </span>
        </div>
        <div
          className="w-full bg-surface rounded-full h-1 overflow-hidden"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Scanning progress"
        >
          <div
            className="bg-brand h-1 rounded-full transition-all duration-700 ease-out progress-glow"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Step list — the main focus */}
      <ul className="space-y-2 max-h-52 overflow-auto" aria-label="Completed steps">
        {pastEvents.map((event, i) => (
          <li key={i} className="flex items-center gap-2.5" aria-hidden="true">
            <span className="text-brand flex-shrink-0 text-xs" aria-hidden="true">✓</span>
            <span className="text-xs text-ink-faint font-code">{event.message}</span>
          </li>
        ))}

        {latest && percent < 100 && (
          <li className="flex items-center gap-2.5">
            <span
              data-testid="spinner"
              role="status"
              aria-label="Loading"
              className="flex-shrink-0 w-3 h-3 border border-brand border-t-transparent rounded-full animate-spin"
            />
            <span className="text-xs text-ink font-code">{latest.message}</span>
          </li>
        )}

        {!latest && (
          <li className="text-xs text-ink-faint text-center font-code py-2">
            Waiting for updates...
          </li>
        )}
      </ul>
    </div>
  );
}
