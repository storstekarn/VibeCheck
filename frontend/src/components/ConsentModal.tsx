import { useEffect, useRef } from 'react';

interface ConsentModalProps {
  url: string;
  onAccept: () => void;
  onCancel: () => void;
}

const CONSENT_POINTS = [
  'You have permission to scan this website',
  'Scan data (URL, bugs found) may be logged for analytics',
  'No personal data from the scanned site is stored',
];

export function ConsentModal({ url, onAccept, onCancel }: ConsentModalProps) {
  const acceptRef = useRef<HTMLButtonElement>(null);

  // Focus the Accept button when modal opens
  useEffect(() => {
    acceptRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md bg-surface border border-line-bright rounded-2xl p-6 shadow-2xl animate-fade-up">
        {/* Title */}
        <h2
          id="consent-title"
          className="text-base font-display font-bold text-ink mb-1"
        >
          Before we scan
        </h2>

        {/* URL preview */}
        <p className="text-xs text-ink-faint font-code mb-5 truncate" title={url}>
          {url}
        </p>

        {/* Consent statement */}
        <p className="text-sm text-ink-dim mb-3">By scanning this URL, you confirm:</p>

        <ul className="space-y-2.5 mb-6" aria-label="Consent items">
          {CONSENT_POINTS.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-ink-dim">
              <span className="mt-0.5 text-brand text-xs flex-shrink-0" aria-hidden="true">
                ◆
              </span>
              {point}
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Privacy Policy link — opens in new tab to preserve modal state */}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ink-faint hover:text-brand transition-colors font-code underline underline-offset-2 mr-auto"
          >
            Privacy Policy ↗
          </a>

          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-ink-dim bg-raised border border-line rounded-xl
              hover:bg-hover hover:border-line-bright transition-all duration-200"
          >
            Cancel
          </button>

          <button
            ref={acceptRef}
            type="button"
            onClick={onAccept}
            className="px-5 py-2 text-sm font-bold text-on-brand bg-brand rounded-xl
              hover:bg-brand-dark transition-all duration-200
              hover:shadow-[0_0_16px_rgba(245,166,35,0.25)]
              active:scale-[0.98]"
          >
            Accept & Scan
          </button>
        </div>
      </div>
    </div>
  );
}
