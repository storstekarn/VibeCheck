import { useState } from 'react';
import type { Bug, BugType, Severity } from '../types';
import { CopyButton } from './CopyButton';

interface BugCardProps {
  bug: Bug;
  index?: number;
}

const SEVERITY_CONFIG: Record<Severity, {
  label: string;
  border: string;
  badge: string;
  hoverClass: string;
}> = {
  critical: {
    label: 'Critical',
    border: 'border-l-crit',
    badge: 'bg-crit/10 text-crit border-crit/20',
    hoverClass: 'bug-card-crit',
  },
  warning: {
    label: 'Warning',
    border: 'border-l-warn',
    badge: 'bg-warn/10 text-warn border-warn/20',
    hoverClass: 'bug-card-warn',
  },
  info: {
    label: 'Info',
    border: 'border-l-hint',
    badge: 'bg-hint/10 text-hint border-hint/20',
    hoverClass: 'bug-card-info',
  },
};

const TYPE_LABELS: Record<BugType, { icon: string; label: string }> = {
  'console-error': { icon: '💻', label: 'Console Error' },
  'network-error': { icon: '🌐', label: 'Network Error' },
  'broken-link':   { icon: '🔗', label: 'Broken Link' },
  'broken-image':  { icon: '🖼️', label: 'Broken Image' },
  'accessibility': { icon: '♿', label: 'Accessibility' },
  'responsive':    { icon: '📱', label: 'Responsive' },
};

export function BugCard({ bug, index = 0 }: BugCardProps) {
  const [showPrompt, setShowPrompt] = useState(true);
  const sev = SEVERITY_CONFIG[bug.severity];
  const typeInfo = TYPE_LABELS[bug.type];
  const promptId = `fix-prompt-${bug.id}`;

  return (
    // <article> gives each bug card semantic meaning as a self-contained unit (SC 1.3.1)
    <article
      aria-label={`${sev.label}: ${bug.title}`}
      className={`border border-line border-l-4 ${sev.border} rounded-xl bg-surface
        hover:bg-raised transition-all duration-300 ease-out animate-fade-up ${sev.hoverClass}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="p-5 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-md inline-flex items-center gap-1.5 border ${sev.badge}`}>
              {sev.label}
            </span>
            <span className="text-xs text-ink-dim font-body inline-flex items-center gap-1">
              {/* Emoji icons are decorative — the text label conveys the meaning (SC 1.1.1) */}
              <span aria-hidden="true">{typeInfo.icon}</span>
              {' '}{typeInfo.label}
            </span>
          </div>
          <span className="text-xs text-ink-dim font-code">
            {new URL(bug.page).pathname}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-ink leading-snug">{bug.title}</h3>

        {/* Details */}
        <p className="text-sm text-ink leading-relaxed">{bug.details}</p>
      </div>

      {/* Fix prompt — collapsible */}
      {bug.fixPrompt && (
        <div className="border-t border-line">
          {/* aria-expanded communicates open/closed state to screen readers (SC 4.1.2) */}
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            aria-expanded={showPrompt}
            aria-controls={promptId}
            className="w-full px-5 py-2.5 flex items-center justify-between text-xs
              text-ink-dim hover:text-ink hover:bg-raised/50 transition-colors font-code"
          >
            <span className="inline-flex items-center gap-1.5">
              {/* Decorative sparkle — hidden from AT (SC 1.1.1) */}
              <span aria-hidden="true">✦</span>
              Fix Prompt
            </span>
            {/* Chevron is decorative — state communicated via aria-expanded (SC 1.1.1) */}
            <span aria-hidden="true" className={`transition-transform duration-200 ${showPrompt ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>

          {showPrompt && (
            <div id={promptId} className="px-5 pb-4 fix-prompt-enter">
              <div className="bg-raised border border-brand/10 rounded-lg p-4 space-y-3">
                <p className="text-xs text-ink leading-relaxed font-code">{bug.fixPrompt}</p>
                <CopyButton text={bug.fixPrompt} label="Copy Prompt" />
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
